import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../common/services/redis.service';
import { RealtimeService } from '../../../common/services/realtime.service';

export interface WorkflowNode {
  id: string;
  name: string;
  type: 'approval' | 'branch' | 'cc' | 'end' | 'start';
  approvers?: Array<{ id: string; name: string; role?: string }>;
  condition?: string;
  conditions?: WorkflowCondition[];
  mode?: 'and' | 'or'; // 会签(and) 或 或签(or)
  timeout?: number; // 超时时间(小时)
  autoApprove?: boolean; // 自动审批
  skipCondition?: any; // 跳过条件对象
  nextNodes?: string[]; // 下一个节点ID列表
  description?: string; // 节点描述
  position?: { x: number; y: number }; // 节点位置(用于可视化)
}

export interface WorkflowCondition {
  field: string;
  operator: string;
  value: any;
  logicalOperator?: 'and' | 'or'; // 与其他条件的逻辑关系
}

export interface ApprovalInstance {
  id: string;
  templateId: string;
  applicantId: string;
  title: string;
  formData: any;
  currentNodeId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  priority: number;
  platformId?: string;
  departmentId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ApprovalAction {
  action: 'approve' | 'reject' | 'transfer' | 'delegate' | 'recall';
  comment?: string;
  transferTo?: string;
  delegateTo?: string;
  attachments?: string[];
}

export interface WorkflowState {
  instanceId: string;
  currentNodeId: string;
  nodeStates: Map<string, NodeState>;
  variables: Map<string, any>;
  history: WorkflowHistoryItem[];
}

export interface NodeState {
  nodeId: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped' | 'timeout';
  approvers: Array<{
    id: string;
    name: string;
    status: 'pending' | 'approved' | 'rejected';
    processedAt?: Date;
    comment?: string | null;
  }>;
  startedAt?: Date;
  completedAt?: Date;
  timeoutAt?: Date;
}

export interface WorkflowHistoryItem {
  nodeId: string;
  action: string;
  operatorId: string;
  operatorName: string;
  comment?: string;
  timestamp: Date;
  fromNodeId?: string;
  toNodeId?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  version: number;
  nodes: WorkflowNode[];
  variables?: Array<{ name: string; type: string; defaultValue?: any }>;
  settings?: {
    allowRecall?: boolean;
    allowDelegate?: boolean;
    maxTimeout?: number;
    notificationSettings?: any;
  };
}

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);
  private readonly workflowStates = new Map<string, WorkflowState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly realtimeService: RealtimeService,
  ) {}

  /**
   * 创建审批实例
   */
  async createInstance(templateId: string, data: any): Promise<ApprovalInstance> {
    const template = await this.getWorkflowTemplate(templateId);
    this.validateWorkflowTemplate(template);

    const startNode = this.getStartNode(template.nodes);
    if (!startNode) {
      throw new BadRequestException('审批模板未配置开始节点');
    }

    const firstApprovalNode = await this.getNextApprovalNode(template.nodes, startNode.id, data.formData);
    if (!firstApprovalNode) {
      throw new BadRequestException('审批模板未配置有效的审批节点');
    }

    const instance = await this.prisma.approval_instances.create({
      data: {
        template_id: templateId,
        applicant_id: data.applicantId,
        title: data.title,
        form_data: data.formData || {},
        current_node_id: firstApprovalNode.id,
        status: 'pending',
        priority: data.priority || 1,
        platform_id: data.platformId,
        department_id: data.departmentId,
      },
    });

    await this.initializeWorkflowState(instance.id, template, firstApprovalNode);
    await this.notifyNodeApprovers(instance.id, firstApprovalNode, 'new_task');

    if (firstApprovalNode.timeout) {
      await this.scheduleTimeout(instance.id, firstApprovalNode.id, firstApprovalNode.timeout);
    }

    this.logger.log(`Created approval instance: ${instance.id} with first node: ${firstApprovalNode.id}`);
    return this.mapToApprovalInstance(instance);
  }

  /**
   * 处理审批节点
   */
  async processNode(instanceId: string, nodeId: string, action: ApprovalAction, operatorId: string): Promise<void> {
    const instance = await this.getApprovalInstance(instanceId);
    const template = await this.getWorkflowTemplate(instance.template_id);
    const workflowState = await this.getWorkflowState(instanceId);

    await this.validateNodeOperation(instance, nodeId, action, operatorId);

    const currentNode = template.nodes.find(n => n.id === nodeId);
    if (!currentNode) {
      throw new BadRequestException('审批节点不存在');
    }

    await this.recordApprovalAction(instanceId, nodeId, action, operatorId);
    await this.updateNodeState(workflowState, nodeId, action, operatorId);

    switch (action.action) {
      case 'approve':
        await this.handleApproveAction(instanceId, nodeId, template, workflowState, operatorId);
        break;
      case 'reject':
        await this.handleRejectAction(instanceId, nodeId, workflowState, operatorId);
        break;
      case 'transfer':
        await this.handleTransferAction(instanceId, nodeId, action.transferTo!, workflowState, operatorId);
        break;
      case 'delegate':
        await this.handleDelegateAction(instanceId, nodeId, action.delegateTo!, workflowState, operatorId);
        break;
      case 'recall':
        await this.handleRecallAction(instanceId, nodeId, workflowState, operatorId);
        break;
    }

    await this.saveWorkflowState(workflowState);
  }

  /**
   * 获取工作流状态
   */
  async getWorkflowState(instanceId: string): Promise<WorkflowState> {
    if (this.workflowStates.has(instanceId)) {
      return this.workflowStates.get(instanceId)!;
    }

    const cacheKey = `workflow:state:${instanceId}`;
    const cachedState = await this.redis.get(cacheKey);

    if (cachedState) {
      const state = JSON.parse(cachedState);
      state.nodeStates = new Map(Object.entries(state.nodeStates));
      state.variables = new Map(Object.entries(state.variables));
      this.workflowStates.set(instanceId, state);
      return state;
    }

    return this.rebuildWorkflowState(instanceId);
  }

  /**
   * 保存工作流状态
   */
  async saveWorkflowState(state: WorkflowState): Promise<void> {
    this.workflowStates.set(state.instanceId, state);

    const cacheKey = `workflow:state:${state.instanceId}`;
    const serializedState = {
      ...state,
      nodeStates: Object.fromEntries(state.nodeStates),
      variables: Object.fromEntries(state.variables),
    };

    await this.redis.set(cacheKey, JSON.stringify(serializedState), 3600 * 24);
  }

  /**
   * 验证工作流模板
   */
  validateWorkflowTemplate(template: WorkflowTemplate): void {
    if (!template.nodes || template.nodes.length === 0) {
      throw new BadRequestException('工作流模板必须包含至少一个节点');
    }

    const startNodes = template.nodes.filter(n => n.type === 'start');
    if (startNodes.length !== 1) {
      throw new BadRequestException('工作流模板必须包含且只能包含一个开始节点');
    }

    const endNodes = template.nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) {
      throw new BadRequestException('工作流模板必须包含结束节点');
    }
  }

  /**
   * 条件评估
   */
  private evaluateCondition(fieldValue: any, operator: string, targetValue: any): boolean {
    if (fieldValue === null || fieldValue === undefined) {
      return operator === '!=' ? targetValue !== null && targetValue !== undefined : false;
    }

    const numFieldValue = Number(fieldValue);
    const numTargetValue = Number(targetValue);

    if (!isNaN(numFieldValue) && !isNaN(numTargetValue)) {
      switch (operator) {
        case '>': return numFieldValue > numTargetValue;
        case '<': return numFieldValue < numTargetValue;
        case '>=': return numFieldValue >= numTargetValue;
        case '<=': return numFieldValue <= numTargetValue;
        case '==': return numFieldValue === numTargetValue;
        case '!=': return numFieldValue !== numTargetValue;
      }
    }

    const strFieldValue = String(fieldValue);
    const strTargetValue = String(targetValue);

    switch (operator) {
      case '==': return strFieldValue === strTargetValue;
      case '!=': return strFieldValue !== strTargetValue;
      case 'contains': return strFieldValue.includes(strTargetValue);
      case 'startsWith': return strFieldValue.startsWith(strTargetValue);
      case 'endsWith': return strFieldValue.endsWith(strTargetValue);
      case 'in':
        return Array.isArray(targetValue) ? targetValue.includes(fieldValue) : false;
      case 'notIn':
        return Array.isArray(targetValue) ? !targetValue.includes(fieldValue) : true;
      default:
        return true;
    }
  }

  private async checkSkipCondition(condition: any, formData: Record<string, any>): Promise<boolean> {
    if (!condition || !condition.field || !condition.operator) {
      return false;
    }

    const fieldValue = formData[condition.field];
    return this.evaluateCondition(fieldValue, condition.operator, condition.value);
  }

  private async getWorkflowTemplate(templateId: string): Promise<WorkflowTemplate> {
    const template = await this.prisma.approval_template.findUnique({
      where: { id: templateId, is_deleted: 0 },
    });

    if (!template) throw new BadRequestException('审批模板不存在');

    return {
      id: template.id,
      name: template.name,
      version: 1,
      nodes: (template.nodes as any as WorkflowNode[]) || [],
      variables: (template.workflow_config as any)?.variables || [],
      settings: (template.workflow_config as any)?.settings || {},
    };
  }

  private async getApprovalInstance(instanceId: string) {
    const instance = await this.prisma.approval_instances.findUnique({
      where: { id: instanceId },
    });
    if (!instance) throw new BadRequestException('审批实例不存在');
    return instance;
  }

  private getStartNode(nodes: WorkflowNode[]): WorkflowNode | null {
    return nodes.find(n => n.type === 'start') || null;
  }

  private async getNextApprovalNode(nodes: WorkflowNode[], fromNodeId: string, formData: any): Promise<WorkflowNode | null> {
    const fromNode = nodes.find(n => n.id === fromNodeId);
    if (!fromNode) return null;

    if (fromNode.nextNodes && fromNode.nextNodes.length > 0) {
      for (const nextNodeId of fromNode.nextNodes) {
        const nextNode = nodes.find(n => n.id === nextNodeId);
        if (nextNode && nextNode.type === 'approval') {
          if (nextNode.skipCondition && await this.checkSkipCondition(nextNode.skipCondition, formData)) {
            return this.getNextApprovalNode(nodes, nextNode.id, formData);
          }
          return nextNode;
        }
      }
    }

    const currentIndex = nodes.findIndex(n => n.id === fromNodeId);
    for (let i = currentIndex + 1; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.type === 'approval') {
        if (node.skipCondition && await this.checkSkipCondition(node.skipCondition, formData)) {
          continue;
        }
        return node;
      } else if (node.type === 'end') break;
    }
    return null;
  }

  private async calculateNextNodes(nodes: WorkflowNode[], currentNodeId: string, formData: any): Promise<WorkflowNode[]> {
    const node = await this.getNextApprovalNode(nodes, currentNodeId, formData);
    return node ? [node] : [nodes.find(n => n.type === 'end')!];
  }

  private async initializeWorkflowState(instanceId: string, template: WorkflowTemplate, firstNode: WorkflowNode): Promise<void> {
    const workflowState: WorkflowState = {
      instanceId,
      currentNodeId: firstNode.id,
      nodeStates: new Map(),
      variables: new Map(),
      history: [],
    };

    if (template.variables) {
      for (const v of template.variables) workflowState.variables.set(v.name, v.defaultValue);
    }

    const nodeState: NodeState = {
      nodeId: firstNode.id,
      status: 'pending',
      approvers: (firstNode.approvers || []).map(a => ({ id: a.id, name: a.name, status: 'pending' })),
      startedAt: new Date(),
    };
    workflowState.nodeStates.set(firstNode.id, nodeState);
    await this.saveWorkflowState(workflowState);
  }

  private async validateNodeOperation(instance: any, nodeId: string, action: ApprovalAction, operatorId: string): Promise<void> {
    if (instance.status !== 'pending' || instance.current_node_id !== nodeId) {
      throw new BadRequestException('当前操作无效');
    }
  }

  private async recordApprovalAction(instanceId: string, nodeId: string, action: ApprovalAction, operatorId: string): Promise<void> {
    await this.prisma.approval_records.create({
      data: {
        instance_id: instanceId,
        node_id: nodeId,
        approver_id: operatorId,
        action: action.action,
        comment: action.comment,
        attachments: action.attachments ? (action.attachments as any) : null,
      },
    });
  }

  private async updateNodeState(workflowState: WorkflowState, nodeId: string, action: ApprovalAction, operatorId: string): Promise<void> {
    const nodeState = workflowState.nodeStates.get(nodeId);
    if (nodeState) {
      const approver = nodeState.approvers.find(a => a.id === operatorId);
      if (approver) {
        approver.status = action.action === 'approve' ? 'approved' : 'rejected';
        approver.processedAt = new Date();
        approver.comment = action.comment;
      }
    }
  }

  private async handleApproveAction(instanceId: string, nodeId: string, template: WorkflowTemplate, workflowState: WorkflowState, operatorId: string): Promise<void> {
    const nextNodes = await this.calculateNextNodes(template.nodes, nodeId, Object.fromEntries(workflowState.variables));
    if (nextNodes.length === 0 || nextNodes[0].type === 'end') {
      await this.completeWorkflow(instanceId, workflowState, 'approved');
    } else {
      await this.advanceToNextNode(instanceId, nextNodes[0], template, workflowState);
    }
  }

  private async handleRejectAction(instanceId: string, nodeId: string, workflowState: WorkflowState, operatorId: string): Promise<void> {
    await this.completeWorkflow(instanceId, workflowState, 'rejected');
  }

  private async handleTransferAction(instanceId: string, nodeId: string, transferTo: string, workflowState: WorkflowState, operatorId: string): Promise<void> {}
  private async handleDelegateAction(instanceId: string, nodeId: string, delegateTo: string, workflowState: WorkflowState, operatorId: string): Promise<void> {}
  private async handleRecallAction(instanceId: string, nodeId: string, workflowState: WorkflowState, operatorId: string): Promise<void> {}

  private async advanceToNextNode(instanceId: string, nextNode: WorkflowNode, template: WorkflowTemplate, workflowState: WorkflowState): Promise<void> {
    workflowState.currentNodeId = nextNode.id;
    const nodeState: NodeState = {
      nodeId: nextNode.id,
      status: 'pending',
      approvers: (nextNode.approvers || []).map(a => ({ id: a.id, name: a.name, status: 'pending' })),
      startedAt: new Date(),
    };
    workflowState.nodeStates.set(nextNode.id, nodeState);
    await this.prisma.approval_instances.update({
      where: { id: instanceId },
      data: { current_node_id: nextNode.id },
    });
    await this.notifyNodeApprovers(instanceId, nextNode, 'new_task');
  }

  private async completeWorkflow(instanceId: string, workflowState: WorkflowState, status: 'approved' | 'rejected'): Promise<void> {
    await this.prisma.approval_instances.update({
      where: { id: instanceId },
      data: { status, current_node_id: null },
    });
    this.workflowStates.delete(instanceId);
    await this.redis.del(`workflow:state:${instanceId}`);
  }

  private async notifyNodeApprovers(instanceId: string, node: WorkflowNode, type: string): Promise<void> {
    if (node.approvers) {
      for (const a of node.approvers) await this.notifyApprover(instanceId, a.id, type);
    }
  }

  private async notifyApprover(instanceId: string, userId: string, type: string): Promise<void> {
    await this.realtimeService.emitToUser(userId, 'approval_notification', { instanceId, type });
  }

  private async scheduleTimeout(instanceId: string, nodeId: string, timeoutHours: number): Promise<void> {}

  private async rebuildWorkflowState(instanceId: string): Promise<WorkflowState> {
    return { instanceId, currentNodeId: '', nodeStates: new Map(), variables: new Map(), history: [] };
  }

  private mapToApprovalInstance(instance: any): ApprovalInstance {
    return {
      id: instance.id,
      templateId: instance.template_id,
      applicantId: instance.applicant_id,
      title: instance.title,
      formData: instance.form_data,
      currentNodeId: instance.current_node_id,
      status: instance.status,
      priority: instance.priority,
      platformId: instance.platform_id,
      departmentId: instance.department_id,
      createdAt: instance.create_time,
      updatedAt: instance.update_time,
    };
  }
}
