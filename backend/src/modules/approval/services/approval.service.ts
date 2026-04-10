import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

export interface ApprovalProgressRecord {
  id: string;
  nodeId: string;
  nodeName: string;
  action: 'submitted' | 'approved' | 'rejected' | 'transferred';
  actorId: string;
  actorName: string;
  comment?: string;
  createdAt: string;
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
  status: 'pending' | 'approved' | 'rejected' | 'transferred';
  amount?: number;
  platformName: string;
  departmentName: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  progress: ApprovalProgressRecord[];
}

type ApprovalEventType =
  | 'request_created'
  | 'request_transferred'
  | 'request_status_changed'
  | 'biz_status_synced'
  | 'biz_schedule_synced'
  | 'biz_attendance_synced';
type ApprovalEventSource = 'system' | 'manual' | 'callback';

interface ApprovalEventInput {
  requestId: string;
  requestNo: string;
  bizType?: string;
  bizId?: string;
  eventType: ApprovalEventType;
  eventSource: ApprovalEventSource;
  requestStatusFrom?: string;
  requestStatusTo?: string;
  bizStatusFrom?: number | null;
  bizStatusTo?: number | null;
  operatorId?: string;
  operatorName?: string;
  dedupKey?: string;
  externalEventId?: string;
  payload?: Record<string, unknown>;
}

export interface CreateAttendanceApprovalInput {
  bizType: 'attendance_leave' | 'attendance_overtime' | 'attendance_patch_card';
  bizId: string;
  bizNo: string;
  applicantId: string;
  applicantName: string;
  currentApproverId?: string;
  currentApproverName?: string;
  platformName: string;
  departmentName: string;
  summary: string;
}

const defaultPeople: ApprovalPerson[] = [
  { id: 'u-01', name: '李晨', employeeNo: 'A1001', department: '运营中心', title: '部门负责人' },
  { id: 'u-02', name: '周雅', employeeNo: 'A1002', department: '人力资源部', title: 'HRBP' },
  { id: 'u-03', name: '王贺', employeeNo: 'A1003', department: '财务部', title: '财务主管' },
  { id: 'u-04', name: '陈澄', employeeNo: 'A1004', department: '总经办', title: '总经理' },
  { id: 'u-05', name: '林晓', employeeNo: 'A1005', department: '采购部', title: '采购经理' },
  { id: 'u-06', name: '赵宁', employeeNo: 'A1006', department: '行政部', title: '行政专员' }
];

const defaultTemplates: ApprovalTemplate[] = [
  {
    id: 'tpl-leave',
    name: '请假审批',
    type: '请假',
    platformName: '企业中台',
    departmentName: '运营中心',
    status: 'enabled',
    description: '适用于普通请假、调休和年假审批，支持按时长分支处理。',
    updatedAt: '2026-04-05 11:20',
    nodes: [
      { id: 'node-start', name: '申请人提交', type: 'start', timeoutHours: 0, approvers: [], copies: [] },
      {
        id: 'node-leader',
        name: '部门负责人审批',
        type: 'approval',
        timeoutHours: 24,
        approvers: [defaultPeople[0]],
        copies: []
      },
      {
        id: 'node-hr',
        name: 'HR 复核',
        type: 'branch',
        timeoutHours: 12,
        condition: '请假时长大于 3 天时进入 HR 复核，否则直接归档。',
        approvers: [defaultPeople[1]],
        copies: [defaultPeople[5]]
      },
      { id: 'node-end', name: '审批完成', type: 'end', timeoutHours: 0, approvers: [], copies: [] }
    ]
  },
  {
    id: 'tpl-expense',
    name: '报销审批',
    type: '报销',
    platformName: '企业中台',
    departmentName: '财务部',
    status: 'enabled',
    description: '适用于差旅、办公采购和营销费用报销。',
    updatedAt: '2026-04-05 10:48',
    nodes: [
      { id: 'node-expense-start', name: '提交报销单', type: 'start', timeoutHours: 0, approvers: [], copies: [] },
      {
        id: 'node-expense-finance',
        name: '财务初审',
        type: 'approval',
        timeoutHours: 24,
        approvers: [defaultPeople[2]],
        copies: []
      },
      {
        id: 'node-expense-gm',
        name: '总经理终审',
        type: 'approval',
        timeoutHours: 24,
        approvers: [defaultPeople[3]],
        copies: []
      },
      { id: 'node-expense-end', name: '打款归档', type: 'end', timeoutHours: 0, approvers: [], copies: [] }
    ]
  }
];

const defaultRequests: ApprovalRequestRecord[] = [
  {
    id: 'req-001',
    requestNo: 'APP-20260405-001',
    templateId: 'tpl-leave',
    templateName: '请假审批',
    type: '请假',
    applicantId: 'u-06',
    applicantName: '赵宁',
    currentApproverId: 'u-01',
    currentApproverName: '李晨',
    status: 'pending',
    platformName: '企业中台',
    departmentName: '行政部',
    summary: '2026-04-08 至 2026-04-10 事假，共 3 天。',
    createdAt: '2026-04-05 09:20',
    updatedAt: '2026-04-05 09:20',
    progress: [
      {
        id: 'pr-001',
        nodeId: 'node-start',
        nodeName: '申请人提交',
        action: 'submitted',
        actorId: 'u-06',
        actorName: '赵宁',
        comment: '家庭事务请假',
        createdAt: '2026-04-05 09:20'
      }
    ]
  },
  {
    id: 'req-002',
    requestNo: 'APP-20260405-002',
    templateId: 'tpl-expense',
    templateName: '报销审批',
    type: '报销',
    applicantId: 'u-05',
    applicantName: '林晓',
    currentApproverId: 'u-03',
    currentApproverName: '王贺',
    status: 'pending',
    amount: 2380,
    platformName: '企业中台',
    departmentName: '采购部',
    summary: '办公采购报销，金额 2380 元。',
    createdAt: '2026-04-05 10:10',
    updatedAt: '2026-04-05 10:10',
    progress: [
      {
        id: 'pr-002',
        nodeId: 'node-expense-start',
        nodeName: '提交报销单',
        action: 'submitted',
        actorId: 'u-05',
        actorName: '林晓',
        comment: '办公用品补采',
        createdAt: '2026-04-05 10:10'
      }
    ]
  },
  {
    id: 'req-003',
    requestNo: 'APP-20260404-003',
    templateId: 'tpl-leave',
    templateName: '请假审批',
    type: '请假',
    applicantId: 'u-02',
    applicantName: '周雅',
    currentApproverId: 'u-04',
    currentApproverName: '陈澄',
    status: 'approved',
    platformName: '企业中台',
    departmentName: '人力资源部',
    summary: '年假 1 天。',
    createdAt: '2026-04-04 14:30',
    updatedAt: '2026-04-04 17:00',
    progress: [
      {
        id: 'pr-003',
        nodeId: 'node-start',
        nodeName: '申请人提交',
        action: 'submitted',
        actorId: 'u-02',
        actorName: '周雅',
        createdAt: '2026-04-04 14:30'
      },
      {
        id: 'pr-004',
        nodeId: 'node-leader',
        nodeName: '部门负责人审批',
        action: 'approved',
        actorId: 'u-04',
        actorName: '陈澄',
        comment: '已安排替岗',
        createdAt: '2026-04-04 17:00'
      }
    ]
  }
];

@Injectable()
export class ApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageService: MessageService,
    private readonly realtimeService: RealtimeService
  ) {}

  private get templateDelegate() {
    return (this.prisma as any).approval_template;
  }

  private get requestDelegate() {
    return (this.prisma as any).approval_request;
  }

  async createAttendanceApproval(input: CreateAttendanceApprovalInput) {
    await this.ensureSeedData();
    const existing = await this.findAttendanceApproval(input.bizType, input.bizId);

    if (existing) {
      return this.toRequest(existing);
    }

    const createdAt = this.formatDate(new Date());
    const record: ApprovalRequestRecord = {
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      requestNo: this.buildApprovalRequestNo(),
      templateId: this.resolveAttendanceTemplateId(input.bizType),
      templateName: this.resolveAttendanceTemplateName(input.bizType),
      bizType: input.bizType,
      bizId: input.bizId,
      type: input.bizType,
      applicantId: input.applicantId,
      applicantName: input.applicantName,
      currentApproverId: input.currentApproverId,
      currentApproverName: input.currentApproverName,
      status: 'pending',
      platformName: input.platformName,
      departmentName: input.departmentName,
      summary: `${this.buildAttendanceSummaryTag(input.bizType, input.bizId)} ${input.summary}`,
      createdAt,
      updatedAt: createdAt,
      progress: [
        {
          id: `progress-${Date.now()}`,
          nodeId: 'node-start',
          nodeName: '提交申请',
          action: 'submitted',
          actorId: input.applicantId,
          actorName: input.applicantName,
          comment: input.bizNo,
          createdAt
        }
      ]
    };

    let saved: any;
    try {
      saved = await this.prisma.$transaction(async (tx) => {
        const requestDelegate = (tx as any).approval_request;
        const created = await requestDelegate.create({
          data: {
            id: record.id,
            ...this.requestToInput(record)
          }
        });

        await this.createApprovalEvent(tx, {
          requestId: record.id,
          requestNo: record.requestNo,
          bizType: record.bizType,
          bizId: record.bizId,
          eventType: 'request_created',
          eventSource: 'system',
          requestStatusTo: record.status,
          operatorId: input.applicantId,
          operatorName: input.applicantName,
          dedupKey: `request-created:${record.id}:${record.progress[0]?.id ?? 'submitted'}`,
          payload: {
            bizNo: input.bizNo,
            summary: record.summary,
            currentApproverId: record.currentApproverId,
            currentApproverName: record.currentApproverName
          }
        });

        if (record.currentApproverId) {
          await this.messageService.send(
            {
              recipientId: record.currentApproverId,
              title: '待处理审批',
              content: `${record.applicantName} 提交了${record.templateName}，请及时处理。`,
              messageType: 'approval_pending',
              bizType: record.bizType,
              bizId: record.bizId,
              route: `/approval/requests?view=pending&requestNo=${encodeURIComponent(record.requestNo)}`,
              senderId: input.applicantId,
              senderName: input.applicantName,
              payload: this.buildApprovalMessagePayload(record)
            },
            tx
          );
        }

        return created;
      });
    } catch (error) {
      if (this.isBizUniqueConstraintError(error)) {
        const duplicated = await this.findAttendanceApproval(input.bizType, input.bizId);
        if (duplicated) {
          return this.toRequest(duplicated);
        }
      }

      throw error;
    }

    return this.toRequest(saved);
  }

  async listTemplates(_userId?: string) {
    await this.ensureSeedData();
    const items = await this.templateDelegate.findMany({
      where: { is_deleted: 0 },
      orderBy: [{ update_time: 'desc' }]
    });
    return items.map((item) => this.toTemplate(item));
  }

  async getTemplate(_userId: string | undefined, id: string) {
    await this.ensureSeedData();
    const item = await this.templateDelegate.findFirst({
      where: { id, is_deleted: 0 }
    });
    if (!item) {
      throw new NotFoundException('审批模板不存在');
    }
    return this.toTemplate(item);
  }

  async saveTemplate(_userId: string | undefined, id: string, dto: SaveApprovalTemplateDto) {
    if (dto.id !== id) {
      throw new NotFoundException('审批模板参数不匹配');
    }

    await this.ensureSeedData();
    const current = await this.templateDelegate.findFirst({
      where: { id, is_deleted: 0 }
    });
    if (!current) {
      throw new NotFoundException('审批模板不存在');
    }

    const template = {
      ...dto,
      updatedAt: this.formatDate(new Date())
    } satisfies ApprovalTemplate;

    const saved = await this.templateDelegate.update({
      where: { id },
      data: this.templateToInput(template)
    });

    return this.toTemplate(saved);
  }

  async listPeople(_userId?: string) {
    const [employees, departments, positions] = await Promise.all([
      this.prisma.hr_employee.findMany({
        where: { is_deleted: 0 },
        orderBy: [{ create_time: 'desc' }]
      }),
      this.prisma.biz_department.findMany({
        where: { is_deleted: 0 },
        select: { id: true, name: true }
      }),
      this.prisma.hr_position.findMany({
        where: { is_deleted: 0 },
        select: { id: true, name: true }
      })
    ]);

    if (employees.length === 0) {
      return defaultPeople;
    }

    const departmentMap = new Map(departments.map((item) => [item.id, item.name]));
    const positionMap = new Map(positions.map((item) => [item.id, item.name]));

    return employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      employeeNo: employee.employee_no ?? employee.job_no ?? employee.id.slice(0, 8),
      department: employee.department_id ? departmentMap.get(employee.department_id) ?? '未分配部门' : '未分配部门',
      title: employee.position_id ? positionMap.get(employee.position_id) ?? '未设置岗位' : '未设置岗位'
    }));
  }

  async listRequests(userId: string | undefined, query: QueryApprovalRequestsDto) {
    await this.ensureSeedData();
    const records = await this.requestDelegate.findMany({
      where: { is_deleted: 0 },
      orderBy: [{ update_time: 'desc' }]
    });

    const view = query.view ?? 'my';
    const keyword = query.keyword?.trim().toLowerCase();
    let items = records.map((item) => this.toRequest(item));

    if (view === 'my') {
      items = items.filter((item) => item.applicantId === userId);
    } else if (view === 'pending') {
      items = items.filter((item) => item.currentApproverId === userId && item.status === 'pending');
    } else if (view === 'processed') {
      items = items.filter(
        (item) =>
          item.progress.some(
            (progress) => progress.actorId === userId && ['approved', 'rejected', 'transferred'].includes(progress.action)
          ) || (item.currentApproverId === userId && item.status !== 'pending')
      );
    }

    if (keyword) {
      items = items.filter((item) =>
        [item.requestNo, item.templateName, item.applicantName, item.summary, item.departmentName]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
      );
    }

    return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async stats(userId: string | undefined) {
    const [allItems, myItems, pendingItems, processedItems] = await Promise.all([
      this.listRequests(userId, {}),
      this.listRequests(userId, { view: 'my' }),
      this.listRequests(userId, { view: 'pending' }),
      this.listRequests(userId, { view: 'processed' })
    ]);

    return {
      allCount: allItems.length,
      myCount: myItems.length,
      pendingCount: pendingItems.length,
      processedCount: processedItems.length
    };
  }

  async approveRequest(userId: string | undefined, id: string, dto: ApprovalActionDto) {
    return this.updateRequestByAction(userId, id, 'approved', dto);
  }

  async rejectRequest(userId: string | undefined, id: string, dto: ApprovalActionDto) {
    return this.updateRequestByAction(userId, id, 'rejected', dto);
  }

  async transferRequest(userId: string | undefined, id: string, dto: ApprovalActionDto) {
    if (!dto.assigneeId) {
      throw new BadRequestException('转审人不能为空');
    }

    await this.ensureSeedData();
    const current = await this.requestDelegate.findFirst({
      where: { id, is_deleted: 0 }
    });
    if (!current) {
      throw new NotFoundException('审批单不存在');
    }

    const request = this.toRequest(current);
    if (request.status !== 'pending') {
      throw new BadRequestException('当前审批单不可重复处理');
    }

    const actor = await this.resolveActor(userId);
    const assignee = (await this.listPeople(userId)).find((item) => item.id === dto.assigneeId);
    if (!assignee) {
      throw new NotFoundException('转审人不存在');
    }

    const previousApproverId = request.currentApproverId;
    const previousApproverName = request.currentApproverName;
    request.currentApproverId = assignee.id;
    request.currentApproverName = assignee.name;
    request.status = 'pending';
    request.updatedAt = this.formatDate(new Date());
    const progress: ApprovalProgressRecord = {
      id: `progress-${Date.now()}`,
      nodeId: 'manual-transfer',
      nodeName: '转审处理',
      action: 'transferred',
      actorId: actor.id,
      actorName: actor.name,
      comment: dto.comment,
      createdAt: request.updatedAt
    };
    request.progress.push(progress);

    const saved = await this.prisma.$transaction(async (tx) => {
      const requestDelegate = (tx as any).approval_request;
      const updated = await requestDelegate.update({
        where: { id },
        data: this.requestToInput(request)
      });

      await this.createApprovalEvent(tx, {
        requestId: request.id,
        requestNo: request.requestNo,
        bizType: request.bizType,
        bizId: request.bizId,
        eventType: 'request_transferred',
        eventSource: 'manual',
        requestStatusFrom: current.status,
        requestStatusTo: request.status,
        operatorId: actor.id,
        operatorName: actor.name,
        dedupKey: `request-transferred:${request.id}:${progress.id}`,
        payload: {
          comment: dto.comment,
          previousApproverId,
          previousApproverName,
          assigneeId: assignee.id,
          assigneeName: assignee.name
        }
      });

      await this.messageService.send(
        {
          recipientId: assignee.id,
          title: '审批已转交给你',
          content: `${actor.name} 已将 ${request.templateName} 转交给你处理。`,
          messageType: 'approval_transferred',
          bizType: request.bizType,
          bizId: request.bizId,
          route: `/approval/requests?view=pending&requestNo=${encodeURIComponent(request.requestNo)}`,
          senderId: actor.id,
          senderName: actor.name,
          payload: this.buildApprovalMessagePayload(request, {
            comment: dto.comment
          })
        },
        tx
      );

      return updated;
    });

    this.emitApprovalChanged([actor.id, assignee.id, previousApproverId, request.applicantId], {
      action: 'transferred',
      requestId: request.id,
      requestNo: request.requestNo
    });

    return this.toRequest(saved);
  }

  private async syncAttendanceWorkflowStatus(
    tx: Prisma.TransactionClient,
    request: ApprovalRequestRecord,
    action: 'approved' | 'rejected',
    operatorId: string,
    operatorName: string | undefined,
    dedupKey: string,
    comment?: string
  ) {
    const biz =
      request.bizType && request.bizId
        ? { bizType: request.bizType, bizId: request.bizId }
        : this.parseAttendanceSummary(request.summary);
    if (!biz) {
      return;
    }

    const delegate = (tx as any)[biz.bizType];
    if (!delegate) {
      return;
    }

    const current = await delegate.findUnique({
      where: { id: biz.bizId },
      select: {
        approval_status: true,
        approved_by: true,
        approved_time: true
      }
    });

    if (!current) {
      return;
    }

    const nextStatus = action === 'approved' ? 1 : 2;
    await delegate.update({
      where: { id: biz.bizId },
      data: {
        approval_status: nextStatus,
        approved_by: operatorId,
        approved_time: new Date()
      }
    });

    await this.createApprovalEvent(tx, {
      requestId: request.id,
      requestNo: request.requestNo,
      bizType: biz.bizType,
      bizId: biz.bizId,
      eventType: 'biz_status_synced',
      eventSource: 'manual',
      requestStatusFrom: this.mapBizApprovalStatus(current.approval_status),
      requestStatusTo: this.mapBizApprovalStatus(nextStatus),
      bizStatusFrom: current.approval_status,
      bizStatusTo: nextStatus,
      operatorId,
      operatorName,
      dedupKey: `biz-status-synced:${request.id}:${dedupKey}`,
      payload: {
        action,
        comment,
        approvedByBefore: current.approved_by,
        approvedTimeBefore: current.approved_time?.toISOString() ?? null
      }
    });

    await this.syncAttendanceBusinessArtifacts(tx, request, action, operatorId, operatorName, comment);
    
    // --- 新增：财务闭环逻辑 ---
    await this.syncFinanceBusinessArtifacts(tx, request, action, operatorId, operatorName, comment);
  }

  public async syncFinanceBusinessArtifacts(
    tx: Prisma.TransactionClient,
    request: ApprovalRequestRecord,
    action: 'approved' | 'rejected',
    operatorId: string,
    operatorName?: string,
    comment?: string
  ) {
    const bizType = request.bizType;
    const bizId = request.bizId;
    if (!bizId || !['finance_reimbursement', 'finance_purchase'].includes(bizType as string)) {
      return;
    }

    const nextStatus = action === 'approved' ? 2 : 3;

    if (bizType === 'finance_reimbursement') {
      const reim = await (tx as any).fin_reimbursement.update({
        where: { id: bizId },
        data: { status: nextStatus }
      });

      // 自动生成支出流水 (仅在通过时)
      if (action === 'approved') {
        await (tx as any).fin_cash_record.create({
          data: {
            type: 2, // 支出
            amount: reim.amount,
            source: `报销支出: ${reim.reason}`,
            biz_id: reim.id,
            biz_type: 'reimbursement',
            platform_id: reim.platform_id,
            dept_id: reim.dept_id
          }
        });
      }
    } else if (bizType === 'finance_purchase') {
      await (tx as any).fin_purchase.update({
        where: { id: bizId },
        data: { status: nextStatus }
      });
    }

    // 发送 Socket 通知给申请人
    this.realtimeService.emitToUser(request.applicantId, 'approval_result', {
      requestId: request.id,
      requestNo: request.requestNo,
      status: action,
      templateName: request.templateName,
      comment: comment || '无说明'
    });
  }

  public async syncAttendanceBusinessArtifacts(
    tx: Prisma.TransactionClient,
    request: ApprovalRequestRecord,
    action: 'approved' | 'rejected',
    operatorId: string,
    operatorName?: string,
    comment?: string
  ) {
    if (action !== 'approved') {
      return;
    }

    const biz =
      request.bizType && request.bizId
        ? { bizType: request.bizType, bizId: request.bizId }
        : this.parseAttendanceSummary(request.summary);
    if (!biz) {
      return;
    }

    switch (biz.bizType) {
      case 'attendance_leave':
        await this.syncApprovedLeaveArtifacts(tx, request, biz.bizId, operatorId, operatorName, comment);
        break;
      case 'attendance_overtime':
        await this.syncApprovedOvertimeArtifacts(tx, request, biz.bizId, operatorId, operatorName, comment);
        break;
      case 'attendance_patch_card':
        await this.syncApprovedPatchCardArtifacts(tx, request, biz.bizId, operatorId, operatorName, comment);
        break;
      default:
        break;
    }
  }

  private async syncApprovedLeaveArtifacts(
    tx: Prisma.TransactionClient,
    request: ApprovalRequestRecord,
    bizId: string,
    operatorId: string,
    operatorName?: string,
    comment?: string
  ) {
    const leave = await tx.attendance_leave.findUnique({
      where: { id: bizId }
    });
    if (!leave || leave.is_deleted) {
      return;
    }

    const { start, end } = this.buildDateBounds(leave.start_time, leave.end_time);
    let affectedSchedules = 0;
    let affectedRecords = 0;

    if (leave.sync_schedule === 1) {
      const schedules = await tx.attendance_schedule.findMany({
        where: {
          is_deleted: 0,
          employee_id: leave.employee_id,
          schedule_date: {
            gte: start,
            lte: end
          }
        },
        orderBy: [{ schedule_date: 'asc' }]
      });

      for (const schedule of schedules) {
        await tx.attendance_schedule.update({
          where: { id: schedule.id },
          data: { is_deleted: 1 }
        });

        await tx.attendance_schedule_change.create({
          data: {
            change_no: this.buildSerialNo('SC'),
            employee_id: leave.employee_id,
            change_date: schedule.schedule_date,
            before_shift_name: schedule.shift_name,
            after_shift_name: null,
            change_type: 'leave_auto_clear',
            reason: `auto-sync from leave ${leave.leave_no}`,
            operator_id: operatorId,
            notify_status: 0,
            platform_id: leave.platform_id,
            dept_id: leave.dept_id
          }
        });

        affectedSchedules += 1;
      }

      if (affectedSchedules > 0) {
        await this.createApprovalEvent(tx, {
          requestId: request.id,
          requestNo: request.requestNo,
          bizType: 'attendance_leave',
          bizId,
          eventType: 'biz_schedule_synced',
          eventSource: 'system',
          requestStatusTo: request.status,
          operatorId,
          operatorName,
          dedupKey: `biz-schedule-synced:${request.id}:leave`,
          payload: {
            action: 'leave_schedule_cleared',
            affectedSchedules,
            leaveNo: leave.leave_no,
            comment
          }
        });
      }
    }

    if (leave.sync_attendance === 1) {
      const existingRecords = await tx.attendance_record.findMany({
        where: {
          is_deleted: 0,
          employee_id: leave.employee_id,
          attendance_date: {
            gte: start,
            lte: end
          }
        }
      });
      const recordMap = new Map(existingRecords.map((item) => [this.buildDateKey(item.attendance_date), item]));

      for (const date of this.enumerateDates(start, end)) {
        const current = recordMap.get(this.buildDateKey(date));
        const recordData = {
          employee_id: leave.employee_id,
          attendance_date: date,
          schedule_id: leave.sync_schedule === 1 ? null : current?.schedule_id ?? undefined,
          shift_name: leave.sync_schedule === 1 ? null : current?.shift_name ?? undefined,
          scheduled_on_duty_time: leave.sync_schedule === 1 ? null : current?.scheduled_on_duty_time ?? undefined,
          scheduled_off_duty_time: leave.sync_schedule === 1 ? null : current?.scheduled_off_duty_time ?? undefined,
          on_duty_status: 3,
          off_duty_status: 3,
          work_duration_minutes: 0,
          exception_type: 'leave',
          remark: this.appendRemark(current?.remark, `leave:${leave.leave_no}:${leave.leave_type}`),
          platform_id: leave.platform_id,
          dept_id: leave.dept_id
        };

        if (current) {
          await tx.attendance_record.update({
            where: { id: current.id },
            data: recordData
          });
        } else {
          await tx.attendance_record.create({
            data: recordData
          });
        }

        affectedRecords += 1;
      }

      await this.createApprovalEvent(tx, {
        requestId: request.id,
        requestNo: request.requestNo,
        bizType: 'attendance_leave',
        bizId,
        eventType: 'biz_attendance_synced',
        eventSource: 'system',
        requestStatusTo: request.status,
        operatorId,
        operatorName,
        dedupKey: `biz-attendance-synced:${request.id}:leave`,
        payload: {
          action: 'leave_attendance_marked',
          affectedRecords,
          leaveNo: leave.leave_no,
          comment
        }
      });
    }

    await this.notifyLeaveSyncClosedLoop(tx, request, leave, operatorId, operatorName, affectedSchedules, affectedRecords, comment);
  }

  private async syncApprovedOvertimeArtifacts(
    tx: Prisma.TransactionClient,
    request: ApprovalRequestRecord,
    bizId: string,
    operatorId: string,
    operatorName?: string,
    comment?: string
  ) {
    const overtime = await tx.attendance_overtime.findUnique({
      where: { id: bizId }
    });
    if (!overtime || overtime.is_deleted || overtime.sync_attendance !== 1) {
      return;
    }

    const { start, end } = this.buildDateBounds(overtime.start_time, overtime.end_time);
    const existingRecords = await tx.attendance_record.findMany({
      where: {
        is_deleted: 0,
        employee_id: overtime.employee_id,
        attendance_date: {
          gte: start,
          lte: end
        }
      }
    });
    const recordMap = new Map(existingRecords.map((item) => [this.buildDateKey(item.attendance_date), item]));
    let affectedRecords = 0;

    for (const date of this.enumerateDates(start, end)) {
      const current = recordMap.get(this.buildDateKey(date));
      const remark = this.appendRemark(current?.remark, `overtime:${overtime.overtime_no}`);
      const data = {
        employee_id: overtime.employee_id,
        attendance_date: date,
        exception_type: current?.exception_type ?? 'overtime',
        remark,
        platform_id: overtime.platform_id,
        dept_id: overtime.dept_id
      };

      if (current) {
        await tx.attendance_record.update({
          where: { id: current.id },
          data
        });
      } else {
        await tx.attendance_record.create({
          data: {
            ...data,
            on_duty_status: 0,
            off_duty_status: 0
          }
        });
      }

      affectedRecords += 1;
    }

    await this.createApprovalEvent(tx, {
      requestId: request.id,
      requestNo: request.requestNo,
      bizType: 'attendance_overtime',
      bizId,
      eventType: 'biz_attendance_synced',
      eventSource: 'system',
      requestStatusTo: request.status,
      operatorId,
      operatorName,
      dedupKey: `biz-attendance-synced:${request.id}:overtime`,
      payload: {
        action: 'overtime_attendance_marked',
        affectedRecords,
        overtimeNo: overtime.overtime_no,
        scheduleSyncRequested: overtime.sync_schedule === 1,
        comment
      }
    });
  }

  private async syncApprovedPatchCardArtifacts(
    tx: Prisma.TransactionClient,
    request: ApprovalRequestRecord,
    bizId: string,
    operatorId: string,
    operatorName?: string,
    comment?: string
  ) {
    const patchCard = await tx.attendance_patch_card.findUnique({
      where: { id: bizId }
    });
    if (!patchCard || patchCard.is_deleted || patchCard.sync_attendance !== 1) {
      return;
    }

    const attendanceDate = this.toDateOnly(patchCard.patch_date);
    const current = await tx.attendance_record.findFirst({
      where: {
        is_deleted: 0,
        employee_id: patchCard.employee_id,
        attendance_date: attendanceDate
      }
    });
    const schedule = await tx.attendance_schedule.findFirst({
      where: {
        is_deleted: 0,
        employee_id: patchCard.employee_id,
        schedule_date: attendanceDate
      }
    });
    const shift = schedule?.shift_name
      ? await tx.attendance_rule.findFirst({
          where: { is_deleted: 0, name: schedule.shift_name }
        })
      : null;

    const patchType = patchCard.patch_type.toLowerCase();
    const isOnDutyPatch =
      patchType.includes('on') ||
      patchType.includes('start') ||
      patchCard.patch_type.includes('上');

    const nextActualOnDutyTime = isOnDutyPatch
      ? patchCard.target_time
      : current?.actual_on_duty_time ?? null;
    const nextActualOffDutyTime = isOnDutyPatch
      ? current?.actual_off_duty_time ?? null
      : patchCard.target_time;

    const workDurationMinutes =
      nextActualOnDutyTime && nextActualOffDutyTime
        ? Math.max(0, Math.round((nextActualOffDutyTime.getTime() - nextActualOnDutyTime.getTime()) / 60000))
        : current?.work_duration_minutes ?? null;

    const data = {
      employee_id: patchCard.employee_id,
      attendance_date: attendanceDate,
      schedule_id: current?.schedule_id ?? schedule?.id ?? undefined,
      shift_name: current?.shift_name ?? schedule?.shift_name ?? undefined,
      scheduled_on_duty_time: current?.scheduled_on_duty_time ?? shift?.on_duty_time ?? undefined,
      scheduled_off_duty_time: current?.scheduled_off_duty_time ?? shift?.off_duty_time ?? undefined,
      actual_on_duty_time: nextActualOnDutyTime,
      actual_off_duty_time: nextActualOffDutyTime,
      on_duty_status: isOnDutyPatch ? 1 : current?.on_duty_status ?? 0,
      off_duty_status: isOnDutyPatch ? current?.off_duty_status ?? 0 : 1,
      work_duration_minutes: workDurationMinutes ?? undefined,
      exception_type: current?.exception_type ?? undefined,
      remark: this.appendRemark(current?.remark, `patch-card:${patchCard.patch_no}:${patchCard.patch_type}`),
      platform_id: patchCard.platform_id,
      dept_id: patchCard.dept_id
    };

    if (current) {
      await tx.attendance_record.update({
        where: { id: current.id },
        data
      });
    } else {
      await tx.attendance_record.create({
        data
      });
    }

    await this.createApprovalEvent(tx, {
      requestId: request.id,
      requestNo: request.requestNo,
      bizType: 'attendance_patch_card',
      bizId,
      eventType: 'biz_attendance_synced',
      eventSource: 'system',
      requestStatusTo: request.status,
      operatorId,
      operatorName,
      dedupKey: `biz-attendance-synced:${request.id}:patch-card`,
      payload: {
        action: 'patch_card_attendance_filled',
        patchNo: patchCard.patch_no,
        patchType: patchCard.patch_type,
        comment
      }
    });
  }

  private resolveAttendanceTemplateId(bizType: CreateAttendanceApprovalInput['bizType']) {
    if (bizType === 'attendance_leave') {
      return 'tpl-leave';
    }

    return `tpl-${bizType}`;
  }

  private resolveAttendanceTemplateName(bizType: CreateAttendanceApprovalInput['bizType']) {
    switch (bizType) {
      case 'attendance_leave':
        return '请假审批';
      case 'attendance_overtime':
        return '加班审批';
      case 'attendance_patch_card':
        return '补卡审批';
      default:
        return '审批';
    }
  }

  private buildApprovalRequestNo() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const tail = `${Date.now()}`.slice(-6);
    return `APP-${yyyy}${mm}${dd}-${tail}`;
  }

  private buildSerialNo(prefix: string) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const tail = `${Date.now()}`.slice(-6);
    return `${prefix}${yyyy}${mm}${dd}${tail}`;
  }

  private buildAttendanceSummaryTag(bizType: string, bizId: string) {
    return `[biz:${bizType}:${bizId}]`;
  }

  private async findAttendanceApproval(bizType: string, bizId: string) {
    return this.requestDelegate.findFirst({
      where: {
        is_deleted: 0,
        OR: [
          {
            biz_type: bizType,
            biz_id: bizId
          },
          {
            type: bizType,
            summary: {
              startsWith: this.buildAttendanceSummaryTag(bizType, bizId)
            }
          }
        ]
      }
    });
  }

  private isBizUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes('biz_type') &&
      error.meta.target.includes('biz_id')
    );
  }

  private isApprovalEventDedupError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes('dedup_key')
    );
  }

  private mapBizApprovalStatus(status: number | null | undefined) {
    switch (status) {
      case 1:
        return 'approved';
      case 2:
        return 'rejected';
      default:
        return 'pending';
    }
  }

  private parseAttendanceSummary(summary: string) {
    const match = summary.match(/^\[biz:(attendance_leave|attendance_overtime|attendance_patch_card):([^\]]+)\]/);
    if (!match) {
      return undefined;
    }

    return {
      bizType: match[1],
      bizId: match[2]
    };
  }

  private buildDateBounds(startTime: Date, endTime: Date) {
    return {
      start: this.toDateOnly(startTime),
      end: this.toDateOnly(endTime)
    };
  }

  private toDateOnly(value: Date) {
    const next = new Date(value);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  private enumerateDates(start: Date, end: Date) {
    const dates: Date[] = [];
    const cursor = this.toDateOnly(start);
    const last = this.toDateOnly(end);
    while (cursor <= last) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }

  private buildDateKey(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private appendRemark(current: string | null | undefined, token: string) {
    if (!current) {
      return token;
    }

    if (current.includes(token)) {
      return current;
    }

    return `${current}; ${token}`;
  }

  private async updateRequestByAction(
    userId: string | undefined,
    id: string,
    action: 'approved' | 'rejected',
    dto: ApprovalActionDto
  ) {
    await this.ensureSeedData();
    const current = await this.requestDelegate.findFirst({
      where: { id, is_deleted: 0 }
    });
    if (!current) {
      throw new NotFoundException('审批单不存在');
    }

    const request = this.toRequest(current);
    if (request.status !== 'pending') {
      throw new BadRequestException('当前审批单不可重复处理');
    }

    const actor = await this.resolveActor(userId);
    const previousStatus = request.status;
    request.status = action;
    request.updatedAt = this.formatDate(new Date());
    const progress: ApprovalProgressRecord = {
      id: `progress-${Date.now()}`,
      nodeId: request.templateId,
      nodeName: request.currentApproverName ?? '当前节点',
      action,
      actorId: actor.id,
      actorName: actor.name,
      comment: dto.comment,
      createdAt: request.updatedAt
    };
    request.progress.push(progress);

    if (action === 'approved') {
      request.currentApproverId = undefined;
      request.currentApproverName = undefined;
    }

    if (action === 'rejected') {
      request.currentApproverId = request.applicantId;
      request.currentApproverName = request.applicantName;
    }

    const saved = await this.prisma.$transaction(async (tx) => {
      const requestDelegate = (tx as any).approval_request;
      const updated = await requestDelegate.update({
        where: { id },
        data: this.requestToInput(request)
      });

      await this.createApprovalEvent(tx, {
        requestId: request.id,
        requestNo: request.requestNo,
        bizType: request.bizType,
        bizId: request.bizId,
        eventType: 'request_status_changed',
        eventSource: 'manual',
        requestStatusFrom: previousStatus,
        requestStatusTo: request.status,
        operatorId: actor.id,
        operatorName: actor.name,
        dedupKey: `request-status-changed:${request.id}:${progress.id}`,
        payload: {
          action,
          comment: dto.comment,
          currentApproverIdBefore: current.current_approver_id,
          currentApproverNameBefore: current.current_approver_name,
          currentApproverIdAfter: request.currentApproverId,
          currentApproverNameAfter: request.currentApproverName
        }
      });

      await this.syncAttendanceWorkflowStatus(
        tx,
        request,
        action,
        actor.id,
        actor.name,
        progress.id,
        dto.comment
      );

      await this.messageService.send(
        {
          recipientId: request.applicantId,
          title: action === 'approved' ? '审批已通过' : '审批已驳回',
          content:
            action === 'approved'
              ? `${actor.name} 已通过你的${request.templateName}。`
              : `${actor.name} 已驳回你的${request.templateName}。`,
          messageType: action === 'approved' ? 'approval_approved' : 'approval_rejected',
          bizType: request.bizType,
          bizId: request.bizId,
          route: `/approval/requests?view=my&requestNo=${encodeURIComponent(request.requestNo)}`,
          senderId: actor.id,
          senderName: actor.name,
          payload: this.buildApprovalMessagePayload(request, {
            comment: dto.comment
          })
        },
        tx
      );

      return updated;
    });

    this.emitApprovalChanged([actor.id, request.applicantId], {
      action,
      requestId: request.id,
      requestNo: request.requestNo
    });

    return this.toRequest(saved);
  }

  private emitApprovalChanged(userIds: Array<string | undefined>, payload: Record<string, unknown>) {
    for (const userId of new Set(userIds.filter((item): item is string => Boolean(item)))) {
      this.realtimeService.emitToUser(userId, 'approval-request.changed', payload);
    }
  }

  private buildApprovalMessagePayload(
    request: Pick<ApprovalRequestRecord, 'id' | 'requestNo' | 'bizType' | 'bizId'>,
    extra: Record<string, unknown> = {}
  ) {
    return {
      requestId: request.id,
      requestNo: request.requestNo,
      bizType: request.bizType,
      bizId: request.bizId,
      ...extra
    };
  }

  private async notifyLeaveSyncClosedLoop(
    tx: Prisma.TransactionClient,
    request: ApprovalRequestRecord,
    leave: {
      id: string;
      employee_id: string;
      leave_no: string;
      leave_type: string;
      start_time: Date;
      end_time: Date;
      platform_id: string | null;
      dept_id: string | null;
    },
    operatorId: string,
    operatorName: string | undefined,
    affectedSchedules: number,
    affectedRecords: number,
    comment?: string
  ) {
    if (affectedSchedules <= 0 && affectedRecords <= 0) {
      return;
    }

    const employee = await this.prisma.hr_employee.findUnique({
      where: { id: leave.employee_id },
      select: {
        id: true,
        name: true,
        user_id: true
      }
    });

    const recipients = new Set<string>([request.applicantId, operatorId]);
    if (employee?.user_id) {
      recipients.add(employee.user_id);
    }

    const details = [
      affectedSchedules > 0 ? `排班清理 ${affectedSchedules} 天` : undefined,
      affectedRecords > 0 ? `考勤回填 ${affectedRecords} 天` : undefined
    ]
      .filter(Boolean)
      .join('，');

    for (const recipientId of recipients) {
      await this.messageService.send(
        {
          recipientId,
          title: '请假联动已完成',
          content: `${employee?.name ?? request.applicantName} 的请假单 ${leave.leave_no} 已完成${details}。`,
          messageType: 'leave_sync_completed',
          bizType: 'attendance_leave',
          bizId: leave.id,
          route: `/attendance/requests?approvalRequestNo=${encodeURIComponent(request.requestNo)}`,
          senderId: operatorId,
          senderName: operatorName,
          payload: this.buildApprovalMessagePayload(request, {
            leaveId: leave.id,
            leaveNo: leave.leave_no,
            leaveType: leave.leave_type,
            startTime: leave.start_time.toISOString(),
            endTime: leave.end_time.toISOString(),
            affectedSchedules,
            affectedRecords,
            comment
          })
        },
        tx
      );
    }

    this.emitApprovalChanged([request.applicantId, operatorId, employee?.user_id ?? undefined], {
      action: 'leave-sync-completed',
      requestId: request.id,
      requestNo: request.requestNo,
      bizId: leave.id
    });
  }

  private async createApprovalEvent(tx: Prisma.TransactionClient, input: ApprovalEventInput) {
    try {
      await (tx as any).approval_event.create({
        data: {
          request_id: input.requestId,
          request_no: input.requestNo,
          biz_type: input.bizType,
          biz_id: input.bizId,
          event_type: input.eventType,
          event_source: input.eventSource,
          request_status_from: input.requestStatusFrom,
          request_status_to: input.requestStatusTo,
          biz_status_from: input.bizStatusFrom ?? undefined,
          biz_status_to: input.bizStatusTo ?? undefined,
          operator_id: input.operatorId,
          operator_name: input.operatorName,
          dedup_key: input.dedupKey,
          external_event_id: input.externalEventId,
          payload: input.payload as Prisma.InputJsonValue | undefined
        }
      });
    } catch (error) {
      if (this.isApprovalEventDedupError(error)) {
        return;
      }

      throw error;
    }
  }

  private async ensureSeedData() {
    const [templateCount, requestCount] = await Promise.all([
      this.templateDelegate.count({ where: { is_deleted: 0 } }),
      this.requestDelegate.count({ where: { is_deleted: 0 } })
    ]);

    if (templateCount === 0) {
      for (const template of defaultTemplates) {
        await this.templateDelegate.upsert({
          where: { id: template.id },
          update: this.templateToInput(template),
          create: { id: template.id, ...this.templateToInput(template) }
        });
      }
    }

    if (requestCount === 0) {
      for (const request of defaultRequests) {
        await this.requestDelegate.upsert({
          where: { id: request.id },
          update: this.requestToInput(request),
          create: { id: request.id, ...this.requestToInput(request) }
        });
      }
    }
  }

  private templateToInput(template: ApprovalTemplate) {
    return {
      name: template.name,
      type: template.type,
      platform_name: template.platformName,
      department_name: template.departmentName,
      status: template.status,
      description: template.description,
      updated_at: template.updatedAt,
      nodes: template.nodes,
      is_deleted: 0
    };
  }

  private requestToInput(request: ApprovalRequestRecord) {
    return {
      request_no: request.requestNo,
      template_id: request.templateId,
      template_name: request.templateName,
      biz_type: request.bizType,
      biz_id: request.bizId,
      type: request.type,
      applicant_id: request.applicantId,
      applicant_name: request.applicantName,
      current_approver_id: request.currentApproverId,
      current_approver_name: request.currentApproverName,
      status: request.status,
      amount: request.amount,
      platform_name: request.platformName,
      department_name: request.departmentName,
      summary: request.summary,
      created_at: request.createdAt,
      updated_at: request.updatedAt,
      progress: request.progress,
      is_deleted: 0
    };
  }

  private toTemplate(record: any): ApprovalTemplate {
    return {
      id: record.id,
      name: record.name,
      type: record.type,
      platformName: record.platform_name,
      departmentName: record.department_name,
      status: record.status as ApprovalTemplate['status'],
      description: record.description ?? '',
      updatedAt: record.updated_at,
      nodes: Array.isArray(record.nodes) ? (record.nodes as ApprovalNode[]) : []
    };
  }

  private toRequest(record: any): ApprovalRequestRecord {
    return {
      id: record.id,
      requestNo: record.request_no,
      templateId: record.template_id,
      templateName: record.template_name,
      bizType: record.biz_type ?? undefined,
      bizId: record.biz_id ?? undefined,
      type: record.type,
      applicantId: record.applicant_id,
      applicantName: record.applicant_name,
      currentApproverId: record.current_approver_id ?? undefined,
      currentApproverName: record.current_approver_name ?? undefined,
      status: record.status as ApprovalRequestRecord['status'],
      amount: record.amount === null || record.amount === undefined ? undefined : Number(record.amount),
      platformName: record.platform_name,
      departmentName: record.department_name,
      summary: record.summary,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      progress: Array.isArray(record.progress) ? (record.progress as ApprovalProgressRecord[]) : []
    };
  }

  private async resolveActor(userId?: string) {
    if (!userId) {
      return { id: 'system', name: '系统' };
    }

    const user = await this.prisma.sys_user.findUnique({
      where: { id: userId }
    });

    return {
      id: userId,
      name: user?.name ?? user?.username ?? userId
    };
  }

  private formatDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
}
