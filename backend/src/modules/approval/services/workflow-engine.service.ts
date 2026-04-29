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
  skipCondition?: string; // 跳过条件
  nextNodes?: string[]; // 下一个节点ID列表
  description?: string; // 节点描述
  position?: { x: number; y: number }; // 节点位置(用于可视化)
}

export interface WorkflowCondition {
  field: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn';
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
    comment?: string;
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
    // 获取审批模板
    const template = await this.getWorkflowTemplate(templateId);

    // 验证模板
    this.validateWorkflowTemplate(template);

    // 找到开始节点
    const startNode = this.getStartNode(template.nodes);
    if (!startNode) {
      throw new BadRequestException('审批模板未配置开始节点');
    }

    // 找到第一个审批节点
    const firstApprovalNode = await this.getNextApprovalNode(template.nodes, startNode.id, data.formData);
    if (!firstApprovalNode) {
      throw new BadRequestException('审批模板未配置有效的审批节点');
    }

    // 创建审批实例
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

    // 初始化工作流状态
    await this.initializeWorkflowState(instance.id, template, firstApprovalNode);

    // 通知第一个审批人
    await this.notifyNodeApprovers(instance.id, firstApprovalNode, 'new_task');

    // 设置超时处理
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

    // 验证操作权限
    await this.validateNodeOperation(instance, nodeId, action, operatorId);

    const currentNode = template.nodes.find(n => n.id === nodeId);
    if (!currentNode) {
      throw new BadRequestException('审批节点不存在');
    }

    // 记录审批操作
    await this.recordApprovalAction(instanceId, nodeId, action, operatorId);

    // 更新节点状态
    await this.updateNodeState(workflowState, nodeId, action, operatorId);

    // 处理不同的操作类型
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

    // 保存工作流状态
    await this.saveWorkflowState(workflowState);
  }

  /**
   * 获取下一个审批节点
   */
  async getNextNodes(instanceId: string, currentNodeId: string): Promise<WorkflowNode[]> {
    const instance = await this.getApprovalInstance(instanceId);
    const template = await this.getWorkflowTemplate(instance.template_id);

    return this.calculateNextNodes(template.nodes, currentNodeId, instance.form_data);
  }

  /**
   * 检查条件
   */
  async checkConditions(instanceId: string, conditions: WorkflowCondition[]): Promise<boolean> {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    const instance = await this.getApprovalInstance(instanceId);
    const formData = instance.form_data as any;
    const workflowState = await this.getWorkflowState(instanceId);

    return this.evaluateConditions(conditions, formData, workflowState.variables);
  }

  /**
   * 处理超时
   */
  async handleTimeout(instanceId: string, nodeId: string): Promise<void> {
    const instance = await this.getApprovalInstance(instanceId);
    const workflowState = await this.getWorkflowState(instanceId);

    if (instance.status !== 'pending' || instance.current_node_id !== nodeId) {
      return;
    }

    // 记录超时事件
    await this.recordTimeoutEvent(instanceId, nodeId);

    // 更新节点状态为超时
    const nodeState = workflowState.nodeStates.get(nodeId);
    if (nodeState) {
      nodeState.status = 'timeout';
      nodeState.completedAt = new Date();
    }

    // 根据超时策略处理
    const template = await this.getWorkflowTemplate(instance.template_id);
    const currentNode = template.nodes.find(n => n.id === nodeId);

    if (currentNode?.autoApprove) {
      // 自动审批通过
      await this.handleAutoApprove(instanceId, nodeId, template, workflowState);
    } else {
      // 发送超时通知
      await this.notifyNodeApprovers(instanceId, currentNode!, 'timeout_reminder');

      // 可选：自动转给上级审批
      await this.handleTimeoutEscalation(instanceId, nodeId, template, workflowState);
    }

    await this.saveWorkflowState(workflowState);
    this.logger.warn(`Approval timeout handled for instance: ${instanceId}, node: ${nodeId}`);
  }

  /**
   * 获取工作流状态
   */
  async getWorkflowState(instanceId: string): Promise<WorkflowState> {
    // 先从内存缓存获取
    if (this.workflowStates.has(instanceId)) {
      return this.workflowStates.get(instanceId)!;
    }

    // 从Redis获取
    const cacheKey = `workflow:state:${instanceId}`;
    const cachedState = await this.redis.get(cacheKey);

    if (cachedState) {
      const state = JSON.parse(cachedState);
      // 重建Map对象
      state.nodeStates = new Map(Object.entries(state.nodeStates));
      state.variables = new Map(Object.entries(state.variables));
      this.workflowStates.set(instanceId, state);
      return state;
    }

    // 从数据库重建状态
    return this.rebuildWorkflowState(instanceId);
  }

  /**
   * 保存工作流状态
   */
  async saveWorkflowState(state: WorkflowState): Promise<void> {
    // 保存到内存缓存
    this.workflowStates.set(state.instanceId, state);

    // 保存到Redis
    const cacheKey = `workflow:state:${state.instanceId}`;
    const serializedState = {
      ...state,
      nodeStates: Object.fromEntries(state.nodeStates),
      variables: Object.fromEntries(state.variables),
    };

    await this.redis.set(cacheKey, JSON.stringify(serializedState), 3600 * 24); // 24小时过期
  }

  /**
   * 验证工作流模板
   */
  validateWorkflowTemplate(template: WorkflowTemplate): void {
    if (!template.nodes || template.nodes.length === 0) {
      throw new BadRequestException('工作流模板必须包含至少一个节点');
    }

    // 检查是否有开始节点
    const startNodes = template.nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) {
      throw new BadRequestException('工作流模板必须包含开始节点');
    }
    if (startNodes.length > 1) {
      throw new BadRequestException('工作流模板只能包含一个开始节点');
    }

    // 检查是否有结束节点
    const endNodes = template.nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) {
      throw new BadRequestException('工作流模板必须包含结束节点');
    }

    // 检查节点ID唯一性
    const nodeIds = template.nodes.map(n => n.id);
    const duplicateIds = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      throw new BadRequestException(`工作流节点ID重复: ${duplicateIds.join(', ')}`);
    }

    // 检查节点连接性
    this.validateNodeConnectivity(template.nodes);

    // 检查循环依赖
    this.validateNoCycles(template.nodes);
  }

  /**
   * 获取工作流模板
   */
  private async getWorkflowTemplate(templateId: string): Promise<WorkflowTemplate> {
    const template = await this.prisma.approval_template.findUnique({
      where: { id: templateId, is_deleted: 0 },
    });

    if (!template) {
      throw new BadRequestException('审批模板不存在');
    }

    if (template.status !== 'enabled') {
      throw new BadRequestException('审批模板已禁用');
    }

    const nodes = Array.isArray(template.nodes) ? template.nodes : [];
    const workflowConfig = template.workflow_config as any || {};

    return {
      id: template.id,
      name: template.name,
      version: 1, // TODO: 实现版本管理
      nodes,
      variables: workflowConfig.variables || [],
      settings: workflowConfig.settings || {},
    };
  }

  /**
   * 获取审批实例
   */
  private async getApprovalInstance(instanceId: string) {
    const instance = await this.prisma.approval_instances.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new BadRequestException('审批实例不存在');
    }

    return instance;
  }

  /**
   * 获取开始节点
   */
  private getStartNode(nodes: WorkflowNode[]): WorkflowNode | null {
    return nodes.find(n => n.type === 'start') || null;
  }

  /**
   * 获取下一个审批节点
   */
  private async getNextApprovalNode(nodes: WorkflowNode[], fromNodeId: string, formData: any): Promise<WorkflowNode | null> {
    const fromNode = nodes.find(n => n.id === fromNodeId);
    if (!fromNode) return null;

    // 如果有明确指定的下一个节点
    if (fromNode.nextNodes && fromNode.nextNodes.length > 0) {
      for (const nextNodeId of fromNode.nextNodes) {
        const nextNode = nodes.find(n => n.id === nextNodeId);
        if (nextNode && nextNode.type === 'approval') {
          // 检查跳过条件
          if (nextNode.skipCondition && this.evaluateCondition(nextNode.skipCondition, formData)) {
            continue; // 跳过此节点
          }
          return nextNode;
        }
      }
    }

    // 按顺序查找下一个审批节点
    const currentIndex = nodes.findIndex(n => n.id === fromNodeId);
    for (let i = currentIndex + 1; i < nodes.length; i++) {
      const node = nodes[i];

      if (node.type === 'branch') {
        // 检查分支条件
        if (node.conditions && !this.evaluateConditions(node.conditions, formData, new Map())) {
          continue; // 不满足条件，跳过
        }
      } else if (node.type === 'approval') {
        // 检查跳过条件
        if (node.skipCondition && this.evaluateCondition(node.skipCondition, formData)) {
          continue; // 跳过此节点
        }
        return node;
      } else if (node.type === 'end') {
        break; // 流程结束
      }
    }

    return null;
  }

  /**
   * 计算下一个节点
   */
  private calculateNextNodes(nodes: WorkflowNode[], currentNodeId: string, formData: any): WorkflowNode[] {
    const currentNode = nodes.find(n => n.id === currentNodeId);
    if (!currentNode) return [];

    const nextNodes: WorkflowNode[] = [];

    // 如果有明确指定的下一个节点
    if (currentNode.nextNodes && currentNode.nextNodes.length > 0) {
      for (const nextNodeId of currentNode.nextNodes) {
        const nextNode = nodes.find(n => n.id === nextNodeId);
        if (nextNode) {
          nextNodes.push(nextNode);
        }
      }
      return nextNodes;
    }

    // 按顺序查找后续节点
    const currentIndex = nodes.findIndex(n => n.id === currentNodeId);
    for (let i = currentIndex + 1; i < nodes.length; i++) {
      const node = nodes[i];

      if (node.type === 'branch') {
        // 检查分支条件
        if (node.conditions && this.evaluateConditions(node.conditions, formData, new Map())) {
          continue; // 满足条件，继续查找
        } else {
          break; // 不满足条件，跳出
        }
      } else if (node.type === 'approval' || node.type === 'cc') {
        nextNodes.push(node);
        break; // 找到下一个处理节点
      } else if (node.type === 'end') {
        nextNodes.push(node);
        break; // 流程结束
      }
    }

    return nextNodes;
  }

  /**
   * 初始化工作流状态
   */
  private async initializeWorkflowState(instanceId: string, template: WorkflowTemplate, firstNode: WorkflowNode): Promise<void> {
    const workflowState: WorkflowState = {
      instanceId,
      currentNodeId: firstNode.id,
      nodeStates: new Map(),
      variables: new Map(),
      history: [],
    };

    // 初始化变量
    if (template.variables) {
      for (const variable of template.variables) {
        workflowState.variables.set(variable.name, variable.defaultValue);
      }
    }

    // 初始化第一个节点状态
    const nodeState: NodeState = {
      nodeId: firstNode.id,
      status: 'pending',
      approvers: (firstNode.approvers || []).map(approver => ({
        id: approver.id,
        name: approver.name,
        status: 'pending',
      })),
      startedAt: new Date(),
      timeoutAt: firstNode.timeout ? new Date(Date.now() + firstNode.timeout * 60 * 60 * 1000) : undefined,
    };

    workflowState.nodeStates.set(firstNode.id, nodeState);

    // 记录历史
    workflowState.history.push({
      nodeId: firstNode.id,
      action: 'start',
      operatorId: 'system',
      operatorName: 'System',
      timestamp: new Date(),
    });

    await this.saveWorkflowState(workflowState);
  }

  /**
   * 验证节点操作
   */
  private async validateNodeOperation(instance: any, nodeId: string, action: ApprovalAction, operatorId: string): Promise<void> {
    if (instance.status !== 'pending') {
      throw new BadRequestException('审批实例不在待处理状态');
    }

    if (instance.current_node_id !== nodeId) {
      throw new BadRequestException('当前节点不匹配');
    }

    // 验证操作者权限
    const workflowState = await this.getWorkflowState(instance.id);
    const nodeState = workflowState.nodeStates.get(nodeId);

    if (!nodeState) {
      throw new BadRequestException('节点状态不存在');
    }

    const approver = nodeState.approvers.find(a => a.id === operatorId);
    if (!approver) {
      throw new BadRequestException('您没有权限处理此审批节点');
    }

    if (approver.status !== 'pending') {
      throw new BadRequestException('您已经处理过此审批节点');
    }

    // 验证特定操作
    if (action.action === 'transfer' && !action.transferTo) {
      throw new BadRequestException('转审操作必须指定转审人');
    }

    if (action.action === 'delegate' && !action.delegateTo) {
      throw new BadRequestException('委托操作必须指定委托人');
    }
  }

  /**
   * 记录审批操作
   */
  private async recordApprovalAction(instanceId: string, nodeId: string, action: ApprovalAction, operatorId: string): Promise<void> {
    await this.prisma.approval_records.create({
      data: {
        instance_id: instanceId,
        node_id: nodeId,
        approver_id: operatorId,
        action: action.action,
        comment: action.comment,
        attachments: action.attachments ? JSON.stringify(action.attachments) : null,
        process_time: new Date(),
      },
    });
  }

  /**
   * 更新节点状态
   */
  private async updateNodeState(workflowState: WorkflowState, nodeId: string, action: ApprovalAction, operatorId: string): Promise<void> {
    const nodeState = workflowState.nodeStates.get(nodeId);
    if (!nodeState) return;

    // 更新审批人状态
    const approver = nodeState.approvers.find(a => a.id === operatorId);
    if (approver) {
      approver.status = action.action === 'approve' ? 'approved' : 'rejected';
      approver.processedAt = new Date();
      approver.comment = action.comment;
    }

    // 记录历史
    workflowState.history.push({
      nodeId,
      action: action.action,
      operatorId,
      operatorName: approver?.name || 'Unknown',
      comment: action.comment,
      timestamp: new Date(),
    });
  }

  /**
   * 处理审批通过操作
   */
  private async handleApproveAction(instanceId: string, nodeId: string, template: WorkflowTemplate, workflowState: WorkflowState, operatorId: string): Promise<void> {
    const currentNode = template.nodes.find(n => n.id === nodeId);
    const nodeState = workflowState.nodeStates.get(nodeId);

    if (!currentNode || !nodeState) return;

    // 检查是否所有审批人都已审批（会签模式）
    if (currentNode.mode === 'and') {
      const pendingApprovers = nodeState.approvers.filter(a => a.status === 'pending');
      if (pendingApprovers.length > 0) {
        // 还有待审批的人，不流转
        await this.notifyRemainingApprovers(instanceId, currentNode, pendingApprovers);
        return;
      }
    }

    // 标记节点完成
    nodeState.status = 'approved';
    nodeState.completedAt = new Date();

    // 查找下一个节点
    const nextNodes = this.calculateNextNodes(template.nodes, nodeId, workflowState.variables);

    if (nextNodes.length === 0 || nextNodes[0].type === 'end') {
      // 流程结束
      await this.completeWorkflow(instanceId, workflowState, 'approved');
    } else {
      // 流转到下一个节点
      const nextNode = nextNodes[0];
      await this.advanceToNextNode(instanceId, nextNode, template, workflowState);
    }
  }

  /**
   * 处理驳回操作
   */
  private async handleRejectAction(instanceId: string, nodeId: string, workflowState: WorkflowState, operatorId: string): Promise<void> {
    const nodeState = workflowState.nodeStates.get(nodeId);
    if (nodeState) {
      nodeState.status = 'rejected';
      nodeState.completedAt = new Date();
    }

    await this.completeWorkflow(instanceId, workflowState, 'rejected');
  }

  /**
   * 处理转审操作
   */
  private async handleTransferAction(instanceId: string, nodeId: string, transferTo: string, workflowState: WorkflowState, operatorId: string): Promise<void> {
    const nodeState = workflowState.nodeStates.get(nodeId);
    if (!nodeState) return;

    // 移除原审批人，添加新审批人
    const originalApprover = nodeState.approvers.find(a => a.id === operatorId);
    if (originalApprover) {
      originalApprover.status = 'rejected'; // 标记为已处理
    }

    // 获取转审人信息
    const transferUser = await this.prisma.sys_user.findUnique({
      where: { id: transferTo },
    });

    if (transferUser) {
      nodeState.approvers.push({
        id: transferTo,
        name: transferUser.name,
        status: 'pending',
      });

      // 通知新审批人
      await this.notifyApprover(instanceId, transferTo, 'transferred');
    }
  }

  /**
   * 处理委托操作
   */
  private async handleDelegateAction(instanceId: string, nodeId: string, delegateTo: string, workflowState: WorkflowState, operatorId: string): Promise<void> {
    const nodeState = workflowState.nodeStates.get(nodeId);
    if (!nodeState) return;

    // 获取委托人信息
    const delegateUser = await this.prisma.sys_user.findUnique({
      where: { id: delegateTo },
    });

    if (delegateUser) {
      nodeState.approvers.push({
        id: delegateTo,
        name: delegateUser.name,
        status: 'pending',
      });

      // 通知委托人
      await this.notifyApprover(instanceId, delegateTo, 'delegated');
    }
  }

  /**
   * 处理撤回操作
   */
  private async handleRecallAction(instanceId: string, nodeId: string, workflowState: WorkflowState, operatorId: string): Promise<void> {
    // 撤回到上一个节点或申请人
    const nodeState = workflowState.nodeStates.get(nodeId);
    if (nodeState) {
      nodeState.status = 'skipped';
      nodeState.completedAt = new Date();
    }

    // 更新实例状态为已撤回
    await this.prisma.approval_instances.update({
      where: { id: instanceId },
      data: {
        status: 'cancelled',
        current_node_id: null,
      },
    });

    workflowState.currentNodeId = '';
  }

  /**
   * 流转到下一个节点
   */
  private async advanceToNextNode(instanceId: string, nextNode: WorkflowNode, template: WorkflowTemplate, workflowState: WorkflowState): Promise<void> {
    // 更新当前节点
    workflowState.currentNodeId = nextNode.id;

    // 初始化下一个节点状态
    const nodeState: NodeState = {
      nodeId: nextNode.id,
      status: 'pending',
      approvers: (nextNode.approvers || []).map(approver => ({
        id: approver.id,
        name: approver.name,
        status: 'pending',
      })),
      startedAt: new Date(),
      timeoutAt: nextNode.timeout ? new Date(Date.now() + nextNode.timeout * 60 * 60 * 1000) : undefined,
    };

    workflowState.nodeStates.set(nextNode.id, nodeState);

    // 更新数据库
    await this.prisma.approval_instances.update({
      where: { id: instanceId },
      data: {
        current_node_id: nextNode.id,
      },
    });

    // 通知审批人
    await this.notifyNodeApprovers(instanceId, nextNode, 'new_task');

    // 设置超时处理
    if (nextNode.timeout) {
      await this.scheduleTimeout(instanceId, nextNode.id, nextNode.timeout);
    }

    // 记录历史
    workflowState.history.push({
      nodeId: nextNode.id,
      action: 'advance',
      operatorId: 'system',
      operatorName: 'System',
      timestamp: new Date(),
    });
  }

  /**
   * 完成工作流
   */
  private async completeWorkflow(instanceId: string, workflowState: WorkflowState, status: 'approved' | 'rejected'): Promise<void> {
    // 更新实例状态
    await this.prisma.approval_instances.update({
      where: { id: instanceId },
      data: {
        status,
        current_node_id: null,
      },
    });

    workflowState.currentNodeId = '';

    // 通知申请人
    const instance = await this.getApprovalInstance(instanceId);
    await this.notifyApprover(instanceId, instance.applicant_id, status);

    // 记录历史
    workflowState.history.push({
      nodeId: 'end',
      action: status,
      operatorId: 'system',
      operatorName: 'System',
      timestamp: new Date(),
    });

    // 清理缓存
    this.workflowStates.delete(instanceId);
    await this.redis.del(`workflow:state:${instanceId}`);

    this.logger.log(`Workflow completed for instance: ${instanceId} with status: ${status}`);
  }

  /**
   * 通知节点审批人
   */
  private async notifyNodeApprovers(instanceId: string, node: WorkflowNode, type: string): Promise<void> {
    if (!node.approvers || node.approvers.length === 0) return;

    for (const approver of node.approvers) {
      await this.notifyApprover(instanceId, approver.id, type);
    }
  }

  /**
   * 通知剩余审批人
   */
  private async notifyRemainingApprovers(instanceId: string, node: WorkflowNode, pendingApprovers: any[]): Promise<void> {
    for (const approver of pendingApprovers) {
      await this.notifyApprover(instanceId, approver.id, 'reminder');
    }
  }

  /**
   * 处理自动审批
   */
  private async handleAutoApprove(instanceId: string, nodeId: string, template: WorkflowTemplate, workflowState: WorkflowState): Promise<void> {
    const nodeState = workflowState.nodeStates.get(nodeId);
    if (nodeState) {
      nodeState.status = 'approved';
      nodeState.completedAt = new Date();

      // 标记所有审批人为自动通过
      nodeState.approvers.forEach(approver => {
        approver.status = 'approved';
        approver.processedAt = new Date();
        approver.comment = '超时自动审批';
      });
    }

    // 记录自动审批
    await this.recordApprovalAction(instanceId, nodeId, {
      action: 'approve',
      comment: '超时自动审批',
    }, 'system');

    // 继续流程
    await this.handleApproveAction(instanceId, nodeId, template, workflowState, 'system');
  }

  /**
   * 处理超时升级
   */
  private async handleTimeoutEscalation(instanceId: string, nodeId: string, template: WorkflowTemplate, workflowState: WorkflowState): Promise<void> {
    // 查找上级审批人或管理员
    const currentNode = template.nodes.find(n => n.id === nodeId);
    if (!currentNode || !currentNode.approvers) return;

    // 这里可以实现升级逻辑，比如转给部门经理或系统管理员
    // 简化实现：发送通知给管理员
    const adminUsers = await this.prisma.sys_user.findMany({
      where: {
        is_deleted: 0,
        status: 1,
        roles: {
          some: {
            role: {
              role_code: 'admin'
            }
          }
        }
      },
      take: 1,
    });

    if (adminUsers.length > 0) {
      const admin = adminUsers[0];
      const nodeState = workflowState.nodeStates.get(nodeId);
      if (nodeState) {
        nodeState.approvers.push({
          id: admin.id,
          name: admin.name,
          status: 'pending',
        });
      }

      await this.notifyApprover(instanceId, admin.id, 'escalated');
    }
  }

  /**
   * 记录超时事件
   */
  private async recordTimeoutEvent(instanceId: string, nodeId: string): Promise<void> {
    await this.prisma.approval_records.create({
      data: {
        instance_id: instanceId,
        node_id: nodeId,
        approver_id: 'system',
        action: 'timeout',
        comment: '审批超时',
        process_time: new Date(),
      },
    });
  }

  /**
   * 安排超时处理
   */
  private async scheduleTimeout(instanceId: string, nodeId: string, timeoutHours: number): Promise<void> {
    const timeoutKey = `timeout:${instanceId}:${nodeId}`;
    const timeoutMs = timeoutHours * 60 * 60 * 1000;

    // 使用Redis设置超时任务
    await this.redis.set(timeoutKey, JSON.stringify({
      instanceId,
      nodeId,
      scheduledAt: new Date().toISOString(),
    }), Math.floor(timeoutMs / 1000));

    this.logger.log(`Scheduled timeout for instance: ${instanceId}, node: ${nodeId}, timeout: ${timeoutHours}h`);
  }

  /**
   * 重建工作流状态
   */
  private async rebuildWorkflowState(instanceId: string): Promise<WorkflowState> {
    const instance = await this.getApprovalInstance(instanceId);
    const template = await this.getWorkflowTemplate(instance.template_id);

    // 从审批记录重建状态
    const records = await this.prisma.approval_records.findMany({
      where: { instance_id: instanceId },
      orderBy: { process_time: 'asc' },
    });

    const workflowState: WorkflowState = {
      instanceId,
      currentNodeId: instance.current_node_id || '',
      nodeStates: new Map(),
      variables: new Map(),
      history: [],
    };

    // 重建历史记录
    for (const record of records) {
      workflowState.history.push({
        nodeId: record.node_id,
        action: record.action,
        operatorId: record.approver_id,
        operatorName: 'Unknown', // TODO: 查询用户名
        comment: record.comment,
        timestamp: record.process_time,
      });
    }

    // 重建节点状态
    for (const node of template.nodes) {
      if (node.type === 'approval') {
        const nodeRecords = records.filter(r => r.node_id === node.id);
        const nodeState: NodeState = {
          nodeId: node.id,
          status: nodeRecords.length > 0 ? 'approved' : 'pending',
          approvers: (node.approvers || []).map(approver => {
            const approverRecord = nodeRecords.find(r => r.approver_id === approver.id);
            return {
              id: approver.id,
              name: approver.name,
              status: approverRecord ? (approverRecord.action === 'approve' ? 'approved' : 'rejected') : 'pending',
              processedAt: approverRecord?.process_time,
              comment: approverRecord?.comment,
            };
          }),
        };
        workflowState.nodeStates.set(node.id, nodeState);
      }
    }

    await this.saveWorkflowState(workflowState);
    return workflowState;
  }

  /**
   * 验证节点连接性
   */
  private validateNodeConnectivity(nodes: WorkflowNode[]): void {
    const nodeIds = new Set(nodes.map(n => n.id));

    for (const node of nodes) {
      if (node.nextNodes) {
        for (const nextNodeId of node.nextNodes) {
          if (!nodeIds.has(nextNodeId)) {
            throw new BadRequestException(`节点 ${node.id} 引用了不存在的下一个节点: ${nextNodeId}`);
          }
        }
      }
    }
  }

  /**
   * 验证无循环依赖
   */
  private validateNoCycles(nodes: WorkflowNode[]): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true; // 发现循环
      }

      if (visited.has(nodeId)) {
        return false; // 已访问过，无循环
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      if (node?.nextNodes) {
        for (const nextNodeId of node.nextNodes) {
          if (hasCycle(nextNodeId)) {
            return true;
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    const startNode = nodes.find(n => n.type === 'start');
    if (startNode && hasCycle(startNode.id)) {
      throw new BadRequestException('工作流存在循环依赖');
    }
  }

  /**
   * 评估条件表达式
   */
  private evaluateConditions(conditions: WorkflowCondition[], formData: any, variables: Map<string, any>): boolean {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    let result = true;
    let currentLogicalOperator: 'and' | 'or' = 'and';

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionResult = this.evaluateSingleCondition(condition, formData, variables);

      if (i === 0) {
        result = conditionResult;
      } else {
        if (currentLogicalOperator === 'and') {
          result = result && conditionResult;
        } else {
          result = result || conditionResult;
        }
      }

      // 设置下一个逻辑操作符
      if (condition.logicalOperator) {
        currentLogicalOperator = condition.logicalOperator;
      }
    }

    return result;
  }

  /**
   * 评估单个条件
   */
  private evaluateSingleCondition(condition: WorkflowCondition, formData: any, variables: Map<string, any>): boolean {
    let fieldValue = formData[condition.field];

    // 如果字段不存在，尝试从变量中获取
    if (fieldValue === undefined && variables.has(condition.field)) {
      fieldValue = variables.get(condition.field);
    }

    return this.evaluateCondition(fieldValue, condition.operator, condition.value);
  }

  /**
   * 条件评估
   */
  private evaluateCondition(fieldValue: any, operator: string, targetValue: any): boolean {
    // 处理null和undefined
    if (fieldValue === null || fieldValue === undefined) {
      return operator === '!=' ? targetValue !== null && targetValue !== undefined : false;
    }

    // 数值比较
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

    // 字符串比较
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

  /**
   * 通知审批人
   */
  private async notifyApprover(instanceId: string, userId: string, type: string): Promise<void> {
    try {
      // 发送WebSocket实时通知
      await this.realtimeService.emitToUser(userId, 'approval_notification', {
        instanceId,
        type,
        timestamp: new Date().toISOString(),
      });

      // 缓存通知状态
      const cacheKey = `approval:notification:${instanceId}:${userId}:${type}`;
      await this.redis.set(cacheKey, '1', 3600); // 1小时过期

      this.logger.log(`Notified user ${userId} for instance ${instanceId} with type ${type}`);
    } catch (error) {
      this.logger.error(`Failed to notify approver ${userId}: ${error.message}`);
    }
  }

  /**
   * 映射到审批实例对象
   */
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
