import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
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

export interface ApprovalTemplate {
  id: string;
  name: string;
  type: string;
  platformName: string;
  departmentName: string;
  status: string;
  description: string;
  updatedAt: string;
  nodes: any[];
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
  status: string;
  amount?: number;
  platformName: string;
  departmentName: string;
  summary: string;
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
    @InjectQueue('approval-queue') private readonly approvalQueue: Queue,
  ) {}

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
    return users.map((user: any) => ({
      id: user.id,
      name: user.name,
      employeeNo: user.username,
      department: user.dept?.name ?? '',
      title: '',
    }));
  }

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

  async approveRequest(userId: string | undefined, id: string, dto: ApprovalActionDto) {
    const request = await this.requestDelegate.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('审批单不存在');
    // 简化实现：更新状态并记录进度
    const progress = Array.isArray(request.progress) ? [...request.progress] : [];
    progress.push({ actorId: userId, action: 'approved', comment: dto.comment, time: new Date().toISOString() });
    const updated = await this.requestDelegate.update({
      where: { id },
      data: { status: 'approved', progress }
    });
    await this.approvalQueue.add('biz-callback', { requestId: id, action: 'approved', operatorId: userId });
    return this.mapRequest(updated);
  }

  async rejectRequest(userId: string | undefined, id: string, dto: ApprovalActionDto) {
    const request = await this.requestDelegate.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('审批单不存在');
    const progress = Array.isArray(request.progress) ? [...request.progress] : [];
    progress.push({ actorId: userId, action: 'rejected', comment: dto.comment, time: new Date().toISOString() });
    const updated = await this.requestDelegate.update({
      where: { id },
      data: { status: 'rejected', progress }
    });
    await this.approvalQueue.add('biz-callback', { requestId: id, action: 'rejected', operatorId: userId });
    return this.mapRequest(updated);
  }

  async transferRequest(userId: string | undefined, id: string, dto: ApprovalActionDto) {
    const request = await this.requestDelegate.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('审批单不存在');
    const progress = Array.isArray(request.progress) ? [...request.progress] : [];
    progress.push({ actorId: userId, action: 'transferred', comment: dto.comment, time: new Date().toISOString(), targetId: dto.target_user_id });
    const updated = await this.requestDelegate.update({
      where: { id },
      data: { current_approver_id: dto.target_user_id, progress }
    });
    return this.mapRequest(updated);
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
      nodes: dto.nodes as any,
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
      status: item.status,
      amount: item.amount ? Number(item.amount) : undefined,
      platformName: item.platform_name,
      departmentName: item.department_name,
      summary: item.summary,
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
