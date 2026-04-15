import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { Cacheable } from '../../../common/decorators/cache.decorator';
import { CacheEvict } from '../../../common/decorators/cache-evict.decorator';
import { QueryOptimize } from '../../../common/decorators/query-optimize.decorator';
import { MessageService } from '../../../common/services/message.service';
import { RealtimeService } from '../../../common/services/realtime.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApprovalActionDto } from '../dto/approval-action.dto';
import { QueryApprovalRequestsDto } from '../dto/query-approval-requests.dto';
import { SaveApprovalTemplateDto } from '../dto/save-approval-template.dto';
import { SystemMessagesService } from '../../system/services/system-messages.service';

export interface ApprovalPerson {
  id: string;
  name: string;
  employeeNo: string;
  department: string;
  title: string;
}

export interface ApprovalTemplate {
  id: string;
  name: string;
  type: string;
  platformId?: string;
  platformName: string;
  deptId?: string;
  departmentName: string;
  status: string;
  description: string;
  updatedAt: string;
  nodes: any[];
  formFields?: any[];
}

export interface ApprovalRequestRecord {
  id: string;
  requestNo: string;
  templateId: string;
  templateName: string;
  bizType?: string;
  bizId?: string;
  type: string;
  applicantId: string;
  applicantName: string;
  currentApproverId?: string;
  currentApproverName?: string;
  currentNodeId?: string;
  status: string;
  amount?: number;
  platformId?: string;
  platformName: string;
  deptId?: string;
  departmentName: string;
  summary: string;
  formData?: any;
  createdAt: string;
  updatedAt: string;
  progress: any[];
}

@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageService: MessageService,
    private readonly realtimeService: RealtimeService,
    private readonly systemMessageService: SystemMessagesService,
    @InjectQueue('approval-queue') private readonly approvalQueue: Queue,
  ) {}

  private readonly handlers = new Map<string, (request: any, action: string, operatorId: string) => Promise<void>>();

  registerHandler(bizType: string, handler: (request: any, action: string, operatorId: string) => Promise<void>) {
    this.handlers.set(bizType, handler);
  }

  private get templateDelegate() { return (this.prisma as any).approval_template; }
  private get requestDelegate() { return (this.prisma as any).approval_request; }
  private get userDelegate() { return (this.prisma as any).sys_user; }

  private getTemplateCandidates(bizType: string) {
    const normalized = bizType.toLowerCase();
    if (normalized.includes('leave')) return ['请假', '考勤审批', 'attendance'];
    if (normalized.includes('overtime')) return ['加班', '考勤审批', 'attendance'];
    if (normalized.includes('patch')) return ['补卡', '考勤审批', 'attendance'];
    if (normalized.includes('schedule')) return ['调班', '考勤审批', 'attendance'];
    if (normalized.includes('purchase')) return ['采购', '财务', 'finance'];
    if (normalized.includes('reimbursement')) return ['报销', '财务', 'finance'];
    return [bizType];
  }

  private getFallbackTemplateName(bizType: string) {
    const normalized = bizType.toLowerCase();
    if (normalized.includes('leave')) return '请假审批';
    if (normalized.includes('overtime')) return '加班审批';
    if (normalized.includes('patch')) return '补卡审批';
    if (normalized.includes('schedule')) return '调班审批';
    if (normalized.includes('purchase')) return '采购审批';
    if (normalized.includes('reimbursement')) return '报销审批';
    return '通用审批';
  }

  private getRequestType(bizType: string) {
    if (bizType.startsWith('attendance_')) return 'attendance';
    if (bizType.startsWith('finance_')) return 'finance';
    return bizType.split('_')[0] || 'general';
  }

  private async resolveTemplateMetadata(bizType: string) {
    const candidates = this.getTemplateCandidates(bizType);
    const item = await this.templateDelegate.findFirst({
      where: {
        is_deleted: 0,
        status: 'enabled',
        OR: [
          { type: { in: candidates } },
          { name: { in: candidates } },
        ],
      },
      orderBy: { update_time: 'desc' },
    });

    if (item) {
      return {
        templateId: item.id,
        templateName: item.name,
      };
    }

    return {
      templateId: `builtin:${bizType}`,
      templateName: this.getFallbackTemplateName(bizType),
    };
  }

  // ✅ 优化：无需额外查询，模板数据已包含所有信息
  async listTemplates(_userId?: string): Promise<ApprovalTemplate[]> {
    const items = await this.templateDelegate.findMany({
      where: { is_deleted: 0 },
      orderBy: { update_time: 'desc' },
    });
    return items.map((item: any) => this.mapTemplate(item));
  }

  async getTemplate(_userId: string | undefined, id: string): Promise<ApprovalTemplate> {
    const item = await this.templateDelegate.findFirst({
      where: { id, is_deleted: 0 },
    });
    if (!item) throw new NotFoundException('审批模板不存在');
    return this.mapTemplate(item);
  }

  async createTemplate(_userId: string | undefined, dto: SaveApprovalTemplateDto) {
    const payload = this.normalizeTemplatePayload(dto, dto.id || randomUUID());
    const created = await this.templateDelegate.create({ data: payload });
    return this.mapTemplate(created);
  }

  async saveTemplate(_userId: string | undefined, id: string, dto: SaveApprovalTemplateDto) {
    await this.ensureTemplateExists(id);
    const payload = this.normalizeTemplatePayload(dto, id);
    const updated = await this.templateDelegate.update({
      where: { id },
      data: payload,
    });
    return this.mapTemplate(updated);
  }

  async duplicateTemplate(_userId: string | undefined, id: string) {
    const original = await this.getTemplate(_userId, id);
    const payload = this.normalizeTemplatePayload({
      ...original,
      name: `${original.name} (副本)`,
      id: randomUUID() as string,
    }, randomUUID());
    
    const created = await this.templateDelegate.create({ data: payload });
    return this.mapTemplate(created);
  }

  async deleteTemplate(_userId: string | undefined, id: string) {
    await this.ensureTemplateExists(id);
    return this.templateDelegate.update({
      where: { id },
      data: { is_deleted: 1 },
    });
  }

  // ✅ 优化：使用include预加载部门信息，避免N+1问题
  async listPeople(_userId?: string): Promise<ApprovalPerson[]> {
    const users = await this.userDelegate.findMany({
      where: { is_deleted: 0, status: 1 },
      include: { 
        dept: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { update_time: 'desc' },
    });
    return users.map((user: any) => ({
      id: user.id,
      name: user.name,
      employeeNo: user.username,
      department: user.dept?.name ?? '',
      title: '',
    }));
  }

  // ✅ 优化：添加缓存和查询监控
  @Cacheable({
    prefix: 'approval:requests',
    ttl: 180,
    keyGenerator: (userId: string | undefined, query: QueryApprovalRequestsDto) => 
      `${userId}:${query.view}:${query.keyword || 'all'}`,
  })
  @QueryOptimize()
  async listRequests(userId: string | undefined, query: QueryApprovalRequestsDto) {
    const where: Record<string, any> = { is_deleted: 0 };
    if (query.view === 'my') {
      where.applicant_id = userId;
    } else if (query.view === 'pending') {
      where.current_approver_id = userId;
      where.status = 'pending';
    }
    if (query.keyword) {
      where.OR = [
        { request_no: { contains: query.keyword } },
        { template_name: { contains: query.keyword } },
        { applicant_name: { contains: query.keyword } },
        { summary: { contains: query.keyword } },
      ];
    }
    const items = await this.requestDelegate.findMany({
      where,
      orderBy: { update_time: 'desc' },
    });
    let mapped = items.map((item: any) => this.mapRequest(item));
    if (query.view === 'processed') {
      mapped = mapped.filter((item: any) => 
        item.progress.some((p: any) => p.actorId === userId && ['approved', 'rejected', 'transferred'].includes(p.action))
      );
    }
    return mapped;
  }

  async stats(userId: string | undefined) {
    const [pending, mine, allProcessed] = await Promise.all([
      this.requestDelegate.count({ where: { is_deleted: 0, current_approver_id: userId, status: 'pending' } }),
      this.requestDelegate.count({ where: { is_deleted: 0, applicant_id: userId } }),
      this.requestDelegate.findMany({ where: { is_deleted: 0 }, select: { progress: true } }),
    ]);
    const processed = allProcessed.filter((item: any) => 
      Array.isArray(item.progress) && item.progress.some((p: any) => p.actorId === userId && ['approved', 'rejected', 'transferred'].includes(p.action))
    ).length;
    return { pending, mine, processed };
  }

  // ✅ 优化：添加缓存清除
  @CacheEvict({
    prefix: ['approval:requests'],
    pattern: '*',
  })
  async approveRequest(userId: string, id: string, dto: ApprovalActionDto) {
    const request = await this.requestDelegate.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('审批单不存在');
    if (request.status !== 'pending') throw new BadRequestException('该申请不在待处理状态');

    const template = await this.templateDelegate.findUnique({ where: { id: request.template_id } });
    const nodes = Array.isArray(template?.nodes) ? template.nodes : [];
    const currentNode = nodes.find((n: any) => n.id === request.current_node_id);
    const currentNodeIdx = nodes.findIndex((n: any) => n.id === request.current_node_id);
    
    const progress = Array.isArray(request.progress) ? [...request.progress] : [];
    progress.push({ 
      nodeId: request.current_node_id,
      actorId: userId, 
      action: 'approved', 
      comment: dto.comment, 
      time: new Date().toISOString() 
    });

    // 会签 (AND) 逻辑处理
    let shouldAdvance = true;
    let nextApprover = null;

    if (currentNode?.mode === 'and' && Array.isArray(currentNode.approvers)) {
      const approvedActors = new Set(
        progress.filter(p => p.nodeId === request.current_node_id && p.action === 'approved').map(p => p.actorId)
      );
      
      const remainingApprovers = currentNode.approvers.filter((a: any) => !approvedActors.has(a.id));
      if (remainingApprovers.length > 0) {
        shouldAdvance = false;
        nextApprover = remainingApprovers[0];
      }
    }

    if (shouldAdvance) {
      const nextNode = this.resolveNextNode(nodes, currentNodeIdx, Number(request.amount || 0));
      
      if (nextNode && nextNode.id !== 'end') {
        const approver = nextNode.approvers?.[0];
        await this.requestDelegate.update({
          where: { id },
          data: {
            status: 'pending',
            current_node_id: nextNode.id,
            current_approver_id: approver?.id,
            current_approver_name: approver?.name,
            progress
          }
        });
        if (approver?.id) this.realtimeService.emitToUser(approver.id, 'approval_task_updated', { id, requestNo: request.request_no });
      } else {
        await this.requestDelegate.update({
          where: { id },
          data: {
            status: 'approved',
            current_node_id: 'end',
            current_approver_id: null,
            current_approver_name: null,
            progress
          }
        });
        await this.approvalQueue.add('biz-callback', { requestId: id, action: 'approved', operatorId: userId });
        
        // --- [NEW] 发送审批通过通知 (PRD 2.5) ---
        try {
          await this.systemMessageService.sendFromTemplate({
            templateName: '审批通过提醒',
            recipientId: request.applicant_id,
            variables: {
              username: request.applicant_name,
              requestId: request.request_no,
            },
            senderId: userId,
          });
        } catch (error) {
          this.logger.error(`Failed to send approval notification: ${error.message}`);
        }
      }
    } else {
      // 仍停留在当前节点，但更新当前审批人为下一个待审批者
      await this.requestDelegate.update({
        where: { id },
        data: {
          current_approver_id: nextApprover?.id,
          current_approver_name: nextApprover?.name,
          progress
        }
      });
      if (nextApprover?.id) this.realtimeService.emitToUser(nextApprover.id, 'approval_task_updated', { id, requestNo: request.request_no });
    }

    return this.getProcessedRequest(id);
  }

  private evaluateCondition(condition: string, data: Record<string, any>): boolean {
    if (!condition) return true;
    
    // 正则解析简单的比较逻辑: [字段] [操作符] [数值]
    const match = condition.match(/(\w+)\s*(>|<|>=|<=|==)\s*(\d+)/);
    if (!match) return true;

    const [_, field, operator, valueStr] = match;
    const fieldValue = Number(data[field]);
    const targetValue = Number(valueStr);

    if (isNaN(fieldValue)) return true;

    switch (operator) {
      case '>': return fieldValue > targetValue;
      case '<': return fieldValue < targetValue;
      case '>=': return fieldValue >= targetValue;
      case '<=': return fieldValue <= targetValue;
      case '==': return fieldValue == targetValue;
      default: return true;
    }
  }

  private resolveNextNode(nodes: any[], currentIdx: number, amount: number) {
    for (let i = currentIdx + 1; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.type === 'branch') {
        // 使用更健壮的条件评估引擎
        if (!this.evaluateCondition(node.condition, { amount })) {
          continue; // 不满足条件，跳过此节点
        }
      }
      if (['approval', 'approver', 'end'].includes(node.type)) {
        return node;
      }
    }
    return nodes[nodes.length - 1];
  }

  // ✅ 优化：添加缓存清除
  @CacheEvict({
    prefix: ['approval:requests'],
    pattern: '*',
  })
  async rejectRequest(userId: string, id: string, dto: ApprovalActionDto) {
    const request = await this.requestDelegate.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('审批单不存在');
    
    const progress = Array.isArray(request.progress) ? [...request.progress] : [];
    progress.push({ actorId: userId, action: 'rejected', comment: dto.comment, time: new Date().toISOString() });
    
    const updated = await this.requestDelegate.update({
      where: { id },
      data: { 
        status: 'rejected', 
        progress,
        current_approver_id: null,
        current_approver_name: null
      }
    });

    await this.approvalQueue.add('biz-callback', { requestId: id, action: 'rejected', operatorId: userId });

    // --- [NEW] 发送审批驳回通知 (PRD 2.5) ---
    try {
      await this.systemMessageService.sendFromTemplate({
        templateName: '审批通知', // 若无专用驳回模板，使用通用模板
        recipientId: request.applicant_id,
        variables: {
          username: request.applicant_name,
          requestId: request.request_no,
          action: '驳回',
          comment: dto.comment || '无原因',
        },
        senderId: userId,
      });
    } catch (error) {
       this.logger.error(`Failed to send rejection notification: ${error.message}`);
    }

    return this.mapRequest(updated);
  }

  // ✅ 优化：添加缓存清除
  @CacheEvict({
    prefix: ['approval:requests'],
    pattern: '*',
  })
  async transferRequest(userId: string, id: string, dto: ApprovalActionDto) {
    if (!dto.target_user_id) throw new BadRequestException('请选择转审人员');
    const [request, targetUser] = await Promise.all([
        this.requestDelegate.findUnique({ where: { id } }),
        this.userDelegate.findUnique({ where: { id: dto.target_user_id } })
    ]);

    if (!request) throw new NotFoundException('审批单不存在');
    if (!targetUser) throw new NotFoundException('目标用户不存在');

    const progress = Array.isArray(request.progress) ? [...request.progress] : [];
    progress.push({ 
        actorId: userId, 
        action: 'transferred', 
        comment: dto.comment, 
        time: new Date().toISOString(), 
        targetId: dto.target_user_id,
        targetName: targetUser.name
    });

    const updated = await this.requestDelegate.update({
      where: { id },
      data: { 
        current_approver_id: dto.target_user_id, 
        current_approver_name: targetUser.name,
        progress 
      }
    });
    return this.mapRequest(updated);
  }

  private async getProcessedRequest(id: string) {
    const item = await this.requestDelegate.findUnique({ where: { id } });
    return this.mapRequest(item);
  }

  async createAttendanceApproval(payload: {
    bizType: string;
    bizId: string;
    bizNo?: string;
    applicantId: string;
    applicantName: string;
    currentApproverId?: string;
    currentApproverName?: string;
    platformName: string;
    departmentName: string;
    summary: string;
    amount?: number;
  }) {
    const id = randomUUID();
    const requestNo = `APP${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const template = await this.resolveTemplateMetadata(payload.bizType);
    const data = {
      id,
      request_no: requestNo,
      template_id: template.templateId,
      template_name: template.templateName,
      biz_type: payload.bizType,
      biz_id: payload.bizId,
      biz_no: payload.bizNo,
      type: this.getRequestType(payload.bizType),
      applicant_id: payload.applicantId,
      applicant_name: payload.applicantName,
      current_approver_id: payload.currentApproverId,
      current_approver_name: payload.currentApproverName,
      amount: payload.amount,
      platform_name: payload.platformName,
      department_name: payload.departmentName,
      summary: payload.summary,
      status: 'pending',
      progress: [] as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: 0,
    };
    const created = await this.requestDelegate.create({ data });
    return this.mapRequest(created);
  }

  async runBizSync(request: any, action: string, operatorId: string) {
    this.logger.log(`Executing sync for request ${request.request_no} action ${action} by ${operatorId}`);
    
    if (request.biz_type && this.handlers.has(request.biz_type)) {
      const handler = this.handlers.get(request.biz_type)!;
      await handler(request, action, operatorId);
    }
  }

  private normalizeTemplatePayload(dto: SaveApprovalTemplateDto, id: string) {
    return {
      id,
      name: dto.name,
      type: dto.type,
      platform_id: dto.platformId,
      platform_name: dto.platformName,
      dept_id: dto.deptId,
      department_name: dto.departmentName,
      status: dto.status,
      description: dto.description,
      updated_at: dto.updatedAt || new Date().toISOString(),
      nodes: dto.nodes as any,
      form_fields: dto.formFields as any,
      is_deleted: 0,
    };
  }

  private mapTemplate(item: any): ApprovalTemplate {
    return {
      id: item.id,
      name: item.name,
      type: item.type,
      platformId: item.platform_id,
      platformName: item.platform_name,
      deptId: item.dept_id,
      departmentName: item.department_name,
      status: item.status,
      description: item.description ?? '',
      updatedAt: item.updated_at,
      nodes: Array.isArray(item.nodes) ? item.nodes : [],
      formFields: Array.isArray(item.form_fields) ? item.form_fields : [],
    };
  }

  private mapRequest(item: any): ApprovalRequestRecord {
    return {
      id: item.id,
      requestNo: item.request_no,
      templateId: item.template_id,
      templateName: item.template_name,
      bizType: item.biz_type,
      bizId: item.biz_id,
      type: item.type,
      applicantId: item.applicant_id,
      applicantName: item.applicant_name,
      currentApproverId: item.current_approver_id,
      currentApproverName: item.current_approver_name,
      currentNodeId: item.current_node_id,
      status: item.status,
      amount: item.amount ? Number(item.amount) : undefined,
      platformId: item.platform_id,
      platformName: item.platform_name,
      deptId: item.dept_id,
      departmentName: item.department_name,
      summary: item.summary,
      formData: item.form_data,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      progress: Array.isArray(item.progress) ? item.progress : [],
    };
  }

  private async ensureTemplateExists(id: string) {
    const item = await this.templateDelegate.findFirst({ where: { id, is_deleted: 0 } });
    if (!item) throw new NotFoundException('审批模板不存在');
  }
}
