import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { MessageService } from '../../../common/services/message.service';
import { RealtimeService } from '../../../common/services/realtime.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApprovalActionDto } from '../dto/approval-action.dto';
import { QueryApprovalRequestsDto } from '../dto/query-approval-requests.dto';
import { SaveApprovalTemplateDto } from '../dto/save-approval-template.dto';

export interface ApprovalPerson {
  id: string;
  name: string;
  employeeNo: string;
  department: string;
  title: string;
}

export interface ApprovalNode {
  id: string;
  name: string;
  type: 'start' | 'approval' | 'branch' | 'copy' | 'end';
  timeoutHours: number;
  condition?: string;
  approvers: ApprovalPerson[];
  copies: ApprovalPerson[];
}

export interface ApprovalTemplate {
  id: string;
  name: string;
  type: string;
  platformName: string;
  departmentName: string;
  status: 'enabled' | 'disabled';
  description: string;
  updatedAt: string;
  nodes: ApprovalNode[];
}

@Injectable()
export class ApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageService: MessageService,
    private readonly realtimeService: RealtimeService,
  ) {}

  private get templateDelegate() {
    return (this.prisma as any).approval_template;
  }

  private get requestDelegate() {
    return (this.prisma as any).approval_request;
  }

  private get userDelegate() {
    return (this.prisma as any).sys_user;
  }

  async listTemplates(_userId?: string) {
    const items = await this.templateDelegate.findMany({
      where: { is_deleted: 0 },
      orderBy: { update_time: 'desc' },
    });

    return items.map((item: any) => this.mapTemplate(item));
  }

  async getTemplate(_userId: string | undefined, id: string) {
    const item = await this.templateDelegate.findFirst({
      where: { id, is_deleted: 0 },
    });

    if (!item) {
      throw new NotFoundException('审批模板不存在');
    }

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

  async deleteTemplate(_userId: string | undefined, id: string) {
    await this.ensureTemplateExists(id);
    return this.templateDelegate.update({
      where: { id },
      data: { is_deleted: 1 },
    });
  }

  async listPeople(_userId?: string): Promise<ApprovalPerson[]> {
    const users = await this.userDelegate.findMany({
      where: { is_deleted: 0, status: 1 },
      include: { dept: true },
      orderBy: { update_time: 'desc' },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      employeeNo: user.username,
      department: user.dept?.name ?? '',
      title: '',
    }));
  }

  async listRequests(userId: string | undefined, query: QueryApprovalRequestsDto) {
    const where: Record<string, unknown> = { is_deleted: 0 };

    switch (query.view) {
      case 'my':
        where.applicant_id = userId;
        break;
      case 'pending':
        where.current_approver_id = userId;
        where.status = 'pending';
        break;
      case 'processed':
        where.status = { in: ['approved', 'rejected', 'transferred'] };
        break;
      default:
        break;
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

    return items.map((item: any) => this.mapRequest(item));
  }

  async stats(userId: string | undefined) {
    const [pending, mine, processed] = await Promise.all([
      this.requestDelegate.count({
        where: { is_deleted: 0, current_approver_id: userId, status: 'pending' },
      }),
      this.requestDelegate.count({
        where: { is_deleted: 0, applicant_id: userId },
      }),
      this.requestDelegate.count({
        where: { is_deleted: 0, status: { in: ['approved', 'rejected', 'transferred'] } },
      }),
    ]);

    return { pending, mine, processed };
  }

  async approveRequest(userId: string, id: string, dto: ApprovalActionDto) {
    return this.updateRequestByAction(userId, id, 'approved', dto);
  }

  async rejectRequest(userId: string, id: string, dto: ApprovalActionDto) {
    return this.updateRequestByAction(userId, id, 'rejected', dto);
  }

  async transferRequest(userId: string, id: string, dto: ApprovalActionDto) {
    if (!dto.assigneeId) {
      throw new BadRequestException('缺少转交目标');
    }

    const [request, assignee] = await Promise.all([
      this.requestDelegate.findUnique({ where: { id } }),
      this.userDelegate.findUnique({ where: { id: dto.assigneeId } }),
    ]);

    if (!request || request.is_deleted) {
      throw new NotFoundException('审批单不存在');
    }

    if (!assignee || assignee.is_deleted || assignee.status !== 1) {
      throw new BadRequestException('转交目标不存在或不可用');
    }

    const progress = Array.isArray(request.progress) ? request.progress : [];

    const updated = await this.requestDelegate.update({
      where: { id },
      data: {
        status: 'transferred',
        current_approver_id: assignee.id,
        current_approver_name: assignee.name,
        updated_at: new Date().toISOString(),
        progress: [
          ...progress,
          {
            nodeId: 'transfer',
            nodeName: '转交',
            action: 'transferred',
            actorId: userId,
            actorName: userId,
            comment: dto.comment,
            createdAt: new Date().toISOString(),
            transferTo: assignee.id,
            transferToName: assignee.name,
          },
        ],
      },
    });

    return this.mapRequest(updated);
  }

  /**
   * 考勤提交流程时使用，保留现有逻辑。
   */
  async createAttendanceApproval(input: any) {
    const templateId = this.resolveAttendanceTemplateId(input.bizType);
    const template = await this.templateDelegate.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException('审批模板不存在');

    const nodes = (template.nodes as unknown) as ApprovalNode[];
    const startNode = nodes.find((node) => node.type === 'start');
    const firstApprovalNode = nodes.find((node) => node.type === 'approval');
    if (!firstApprovalNode || firstApprovalNode.approvers.length === 0) {
      throw new BadRequestException('审批模板未配置审批人');
    }

    const firstApprover = firstApprovalNode.approvers[0];
    const requestId = randomUUID();
    const createdAt = new Date().toISOString();

    const request = await this.requestDelegate.create({
      data: {
        id: requestId,
        request_no: `APP-${Date.now()}`,
        template_id: template.id,
        template_name: template.name,
        biz_type: input.bizType,
        biz_id: input.bizId,
        type: template.type,
        applicant_id: input.applicantId,
        applicant_name: input.applicantName,
        current_approver_id: firstApprover.id,
        current_approver_name: firstApprover.name,
        status: 'pending',
        platform_name: input.platformName,
        department_name: input.departmentName,
        summary: input.summary,
        created_at: createdAt,
        updated_at: createdAt,
        progress: [
          {
            nodeId: startNode?.id || 'start',
            nodeName: startNode?.name || '开始',
            action: 'submitted',
            actorId: input.applicantId,
            actorName: input.applicantName,
            createdAt,
          },
        ],
      },
    });

    if (firstApprover.id) {
      await this.messageService.send({
        recipientId: firstApprover.id,
        title: '待处理审批',
        content: `${input.applicantName} 提交了 ${template.name}`,
        messageType: 'approval_pending',
        bizType: input.bizType,
        bizId: input.bizId,
        route: `/approval/requests?view=pending&requestNo=${request.request_no}`,
      });
    }

    return request;
  }

  async updateRequestByAction(userId: string, id: string, action: 'approved' | 'rejected', dto: ApprovalActionDto) {
    const request = await this.requestDelegate.findUnique({ where: { id } });
    if (!request || request.status !== 'pending') {
      throw new BadRequestException('该审批单当前不可处理');
    }

    const template = await this.templateDelegate.findUnique({ where: { id: request.template_id } });
    const nodes = ((template?.nodes as unknown) ?? []) as ApprovalNode[];
    const currentNodeIdx = nodes.findIndex((node) => node.approvers?.some((item) => item.id === userId));
    const currentNode = currentNodeIdx >= 0 ? nodes[currentNodeIdx] : undefined;

    let nextStatus = request.status;
    let nextApproverId: string | null = null;
    let nextApproverName: string | null = null;

    if (action === 'rejected') {
      nextStatus = 'rejected';
    } else {
      const nextNode = nodes[currentNodeIdx + 1];
      if (!nextNode || nextNode.type === 'end') {
        nextStatus = 'approved';
      } else if (nextNode.type === 'approval' && nextNode.approvers.length > 0) {
        nextApproverId = nextNode.approvers[0].id;
        nextApproverName = nextNode.approvers[0].name;
      } else {
        nextStatus = 'approved';
      }
    }

    const currentProgress = Array.isArray(request.progress) ? request.progress : [];

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await (tx as any).approval_request.update({
        where: { id },
        data: {
          status: nextStatus,
          current_approver_id: nextApproverId,
          current_approver_name: nextApproverName,
          updated_at: new Date().toISOString(),
          progress: [
            ...currentProgress,
            {
              nodeId: currentNode?.id ?? 'approval',
              nodeName: currentNode?.name ?? '审批',
              action,
              actorId: userId,
              actorName: userId,
              comment: dto.comment,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      });

      if (nextStatus === 'approved') {
        await this.syncAttendanceWorkflowStatus(tx, result, 'approved', userId, userId, 'approval');
      }

      return result;
    });

    if (nextApproverId && nextApproverName) {
      await this.messageService.send({
        recipientId: nextApproverId,
        title: '待处理审批',
        content: `${request.applicant_name} 提交的 ${request.template_name} 正在等待你处理`,
        messageType: 'approval_pending',
        bizType: request.biz_type,
        bizId: request.biz_id,
        route: `/approval/requests?view=pending&requestNo=${request.request_no}`,
      });
    }

    return this.mapRequest(updated);
  }

  private resolveAttendanceTemplateId(type: string) {
    if (type.includes('leave')) return 'tpl-leave';
    if (type.includes('expense')) return 'tpl-expense';
    return 'tpl-default';
  }

  async syncAttendanceWorkflowStatus(
    _tx: Prisma.TransactionClient,
    _request: any,
    _action: any,
    _opId: string,
    _opName: string,
    _key: string,
  ) {
    return undefined;
  }

  async runBizSync(_request: any, _action: any, _operatorId: string) {
    return undefined;
  }

  private normalizeTemplatePayload(dto: SaveApprovalTemplateDto, id: string) {
    return {
      id,
      name: dto.name,
      type: dto.type,
      platform_name: dto.platformName,
      department_name: dto.departmentName,
      status: dto.status,
      description: dto.description,
      updated_at: dto.updatedAt || new Date().toISOString(),
      nodes: dto.nodes,
      is_deleted: 0,
    };
  }

  private mapTemplate(item: any): ApprovalTemplate {
    return {
      id: item.id,
      name: item.name,
      type: item.type,
      platformName: item.platform_name,
      departmentName: item.department_name,
      status: item.status,
      description: item.description ?? '',
      updatedAt: item.updated_at,
      nodes: Array.isArray(item.nodes) ? item.nodes : [],
    };
  }

  private mapRequest(item: any) {
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
      status: item.status,
      amount: item.amount,
      platformName: item.platform_name,
      departmentName: item.department_name,
      summary: item.summary,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      progress: Array.isArray(item.progress) ? item.progress : [],
    };
  }

  private async ensureTemplateExists(id: string) {
    const item = await this.templateDelegate.findFirst({
      where: { id, is_deleted: 0 },
    });

    if (!item) {
      throw new NotFoundException('审批模板不存在');
    }

    return item;
  }
}
