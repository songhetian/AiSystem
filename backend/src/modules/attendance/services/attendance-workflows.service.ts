import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BusinessLockService } from '../../../common/services/business-lock.service';
import { MessageService } from '../../../common/services/message.service';
import { ScopeService } from '../../../common/services/scope.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApprovalService } from '../../approval/services/approval.service';
import { QueryAttendanceRecordsDto } from '../dto/query-attendance-records.dto';
import { QueryAttendanceWorkflowsDto } from '../dto/query-attendance-workflows.dto';
import { UpsertAttendanceLeaveDto } from '../dto/upsert-attendance-leave.dto';
import { UpsertAttendanceOvertimeDto } from '../dto/upsert-attendance-overtime.dto';
import { UpsertAttendancePatchCardDto } from '../dto/upsert-attendance-patch-card.dto';
import { UpsertAttendanceScheduleChangeDto } from '../dto/upsert-attendance-schedule-change.dto';

type WorkflowType = 'leave' | 'overtime' | 'patch-card' | 'schedule-change';

interface WorkflowConfig {
  delegate: string;
  serialField: string;
  dateField: string;
  serialPrefix: string;
}

const WORKFLOW_CONFIG: Record<WorkflowType, WorkflowConfig> = {
  leave: {
    delegate: 'attendance_leave',
    serialField: 'leave_no',
    dateField: 'start_time',
    serialPrefix: 'LV'
  },
  overtime: {
    delegate: 'attendance_overtime',
    serialField: 'overtime_no',
    dateField: 'start_time',
    serialPrefix: 'OT'
  },
  'patch-card': {
    delegate: 'attendance_patch_card',
    serialField: 'patch_no',
    dateField: 'patch_date',
    serialPrefix: 'PC'
  },
  'schedule-change': {
    delegate: 'attendance_schedule_change',
    serialField: 'change_no',
    dateField: 'change_date',
    serialPrefix: 'SC'
  }
};

function normalizeDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('日期格式无效');
  }

  return date;
}

function normalizeDateRange(start?: string, end?: string) {
  const startDate = normalizeDate(start);
  const endDate = normalizeDate(end);
  if (startDate && endDate && endDate < startDate) {
    throw new BadRequestException('结束日期必须晚于开始日期');
  }

  return { startDate, endDate };
}

function buildSerial(prefix: string) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = `${now.getMonth() + 1}`.padStart(2, '0');
  const dd = `${now.getDate()}`.padStart(2, '0');
  const tail = `${Date.now()}`.slice(-6);
  return `${prefix}${yyyy}${mm}${dd}${tail}`;
}

function ensureRange(start: Date, end: Date, message: string) {
  if (end <= start) {
    throw new BadRequestException(message);
  }
}

function ensureNonNegative(value: number | undefined, message: string) {
  if (value !== undefined && value < 0) {
    throw new BadRequestException(message);
  }
}

function isSameDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

@Injectable()
export class AttendanceWorkflowsService {
  private readonly approvalLockTtlSeconds = Number(process.env.ATTENDANCE_APPROVAL_LOCK_TTL_SECONDS ?? 30);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly approvalService: ApprovalService,
    private readonly businessLockService: BusinessLockService,
    private readonly messageService: MessageService
  ) {}

  private async resolveEmployees(userId: string, query: QueryAttendanceRecordsDto | QueryAttendanceWorkflowsDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const employeeWhere: Record<string, unknown> = this.scopeService.applyScope(
      scope,
      { is_deleted: 0 },
      { platform: 'platform_id', department: 'department_id' }
    );

    if (query.platform_id) {
      this.scopeService.assertPlatformAccess(scope, query.platform_id);
      employeeWhere.platform_id = query.platform_id;
    }

    if (query.dept_id) {
      this.scopeService.assertDepartmentAccess(scope, query.dept_id);
      employeeWhere.department_id = query.dept_id;
    }

    if (query.employee_id) {
      employeeWhere.id = query.employee_id;
    }

    if (query.keyword) {
      employeeWhere.OR = [
        { name: { contains: query.keyword } },
        { employee_no: { contains: query.keyword } },
        { job_no: { contains: query.keyword } }
      ];
    }

    const employees = await this.prisma.hr_employee.findMany({
      where: employeeWhere,
      orderBy: [{ department_id: 'asc' }, { employee_no: 'asc' }, { create_time: 'desc' }]
    });

    return { scope, employees };
  }

  private async resolveEmployeeForWrite(userId: string, employeeId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const employee = await this.prisma.hr_employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.is_deleted) {
      throw new NotFoundException('员工不存在');
    }

    this.scopeService.assertPlatformAccess(scope, employee.platform_id);
    this.scopeService.assertDepartmentAccess(scope, employee.department_id);
    return { scope, employee };
  }

  private attachEmployeeInfo<T extends { employee_id: string }>(items: T[], employees: any[]) {
    const employeeMap = new Map(employees.map((item) => [item.id, item]));
    return items.map((item) => {
      const employee = employeeMap.get(item.employee_id);
      return {
        ...item,
        employee_name: employee?.name ?? '',
        employee_no: employee?.employee_no ?? '',
        department_id: employee?.department_id ?? null,
        platform_id: item['platform_id' as keyof T] ?? employee?.platform_id ?? null
      };
    });
  }

  private getDelegate(type: WorkflowType) {
    return (this.prisma as any)[WORKFLOW_CONFIG[type].delegate];
  }

  private async notifyScheduleChange(
    actorUserId: string,
    employee: any,
    change: {
      id: string;
      change_no: string;
      change_date: Date;
      before_shift_name?: string | null;
      after_shift_name?: string | null;
    },
    operatorId?: string | null
  ) {
    const recipientIds = new Set<string>([operatorId ?? actorUserId]);
    const employeeUserId = employee.user_id ?? undefined;
    if (employeeUserId) {
      recipientIds.add(employeeUserId);
    }

    for (const recipientId of recipientIds) {
      const isAffectedEmployee = recipientId === employeeUserId;
      await this.messageService.send({
        recipientId,
        title: isAffectedEmployee ? '班次调整通知' : '调班申请已提交',
        content: isAffectedEmployee
          ? `${employee.name} ${change.change_date.toISOString().slice(0, 10)} shift updated to ${change.after_shift_name ?? 'rest'}.`
          : `${employee.name} schedule change ${change.change_no} has been submitted.`,
        messageType: isAffectedEmployee ? 'schedule_change_notified' : 'schedule_change_created',
        bizType: 'attendance_schedule_change',
        bizId: change.id,
        route: '/attendance/requests',
        senderId: actorUserId,
        payload: {
          employeeId: employee.id,
          employeeName: employee.name,
          beforeShiftName: change.before_shift_name,
          afterShiftName: change.after_shift_name
        }
      });
    }

    return employeeUserId ? 1 : 0;
  }

  private async resolveApprovalActors(userId: string, employee: any) {
    const [applicant, department] = await Promise.all([
      this.prisma.sys_user.findUnique({ where: { id: userId } }),
      employee.department_id
        ? this.prisma.biz_department.findUnique({ where: { id: employee.department_id } })
        : Promise.resolve(null)
    ]);

    const approver =
      department?.owner_id ? await this.prisma.sys_user.findUnique({ where: { id: department.owner_id } }) : null;

    return {
      applicantId: userId,
      applicantName: applicant?.name ?? applicant?.username ?? employee.name,
      approverId: approver?.id ?? userId,
      approverName: approver?.name ?? approver?.username ?? employee.name,
      departmentName: department?.name ?? '未分配部门',
      platformName: '企业中台'
    };
  }

  private async createAttendanceApprovalForRecord(
    userId: string,
    employee: any,
    workflow: { id: string; approval_status?: number | null },
    payload: {
      bizType: 'attendance_leave' | 'attendance_overtime' | 'attendance_patch_card';
      bizNo: string;
      summary: string;
    }
  ) {
    if ((workflow.approval_status ?? 0) !== 0) {
      return;
    }

    await this.businessLockService.runExclusive(
      `attendance-approval:${payload.bizType}:${workflow.id}`,
      this.approvalLockTtlSeconds,
      async () => {
        const delegate = this.getDelegate(
          payload.bizType === 'attendance_leave'
            ? 'leave'
            : payload.bizType === 'attendance_overtime'
              ? 'overtime'
              : 'patch-card'
        ) as any;

        const latest = await delegate.findUnique({
          where: { id: workflow.id },
          select: {
            id: true,
            approval_status: true,
            approval_request_id: true,
            approval_request_no: true
          }
        });

        if (!latest || latest.approval_status !== 0 || latest.approval_request_id) {
          return;
        }

        const actors = await this.resolveApprovalActors(userId, employee);
        const approval = await this.approvalService.createAttendanceApproval({
          bizType: payload.bizType,
          bizId: workflow.id,
          bizNo: payload.bizNo,
          applicantId: actors.applicantId,
          applicantName: actors.applicantName,
          currentApproverId: actors.approverId,
          currentApproverName: actors.approverName,
          platformName: actors.platformName,
          departmentName: actors.departmentName,
          summary: payload.summary
        });

        await delegate.update({
          where: { id: workflow.id },
          data: {
            approval_request_id: approval.id,
            approval_request_no: approval.requestNo
          }
        });
      }
    );
  }

  private assertApprovalStatus(value: number | undefined) {
    if (value !== undefined && ![0, 1, 2].includes(value)) {
      throw new BadRequestException('审批状态无效');
    }
  }

  private assertNotifyStatus(value: number | undefined) {
    if (value !== undefined && ![0, 1].includes(value)) {
      throw new BadRequestException('通知状态无效');
    }
  }

  private ensureWorkflowMutable(approvalStatus: number | null | undefined, entityName: string) {
    if (approvalStatus === 1) {
      throw new BadRequestException(`${entityName}已审批通过，不允许再修改或删除`);
    }
  }

  private validateLeaveDto(dto: UpsertAttendanceLeaveDto) {
    const startTime = normalizeDate(dto.start_time)!;
    const endTime = normalizeDate(dto.end_time)!;
    ensureRange(startTime, endTime, '请假结束时间必须晚于开始时间');
    ensureNonNegative(dto.duration_hours, '请假时长不能为负数');
    this.assertApprovalStatus(dto.approval_status);
    normalizeDate(dto.approved_time);
    return { startTime, endTime };
  }

  private validateOvertimeDto(dto: UpsertAttendanceOvertimeDto) {
    const startTime = normalizeDate(dto.start_time)!;
    const endTime = normalizeDate(dto.end_time)!;
    ensureRange(startTime, endTime, '加班结束时间必须晚于开始时间');
    ensureNonNegative(dto.duration_hours, '加班时长不能为负数');
    this.assertApprovalStatus(dto.approval_status);
    normalizeDate(dto.approved_time);
    return { startTime, endTime };
  }

  private validatePatchCardDto(dto: UpsertAttendancePatchCardDto) {
    const patchDate = normalizeDate(dto.patch_date)!;
    const targetTime = normalizeDate(dto.target_time)!;
    if (!isSameDate(patchDate, targetTime)) {
      throw new BadRequestException('补卡时间必须落在补卡日期当天');
    }
    this.assertApprovalStatus(dto.approval_status);
    normalizeDate(dto.approved_time);
    return { patchDate, targetTime };
  }

  private validateScheduleChangeDto(dto: UpsertAttendanceScheduleChangeDto) {
    const changeDate = normalizeDate(dto.change_date)!;
    this.assertNotifyStatus(dto.notify_status);
    return { changeDate };
  }

  private async ensureNoDuplicateLeave(employeeId: string, dto: UpsertAttendanceLeaveDto, excludeId?: string) {
    const duplicate = await this.prisma.attendance_leave.findFirst({
      where: {
        is_deleted: 0,
        employee_id: employeeId,
        leave_type: dto.leave_type,
        start_time: new Date(dto.start_time),
        end_time: new Date(dto.end_time),
        ...(excludeId ? { NOT: { id: excludeId } } : {})
      },
      select: { id: true }
    });

    if (duplicate) {
      throw new BadRequestException('存在重复的请假申请');
    }
  }

  private async ensureNoOverlappingLeave(employeeId: string, startTime: Date, endTime: Date, excludeId?: string) {
    const conflict = await this.prisma.attendance_leave.findFirst({
      where: {
        is_deleted: 0,
        employee_id: employeeId,
        start_time: { lt: endTime },
        end_time: { gt: startTime },
        ...(excludeId ? { NOT: { id: excludeId } } : {})
      },
      select: { id: true }
    });

    if (conflict) {
      throw new BadRequestException('请假时间与已有请假申请冲突');
    }
  }

  private async ensureNoDuplicateOvertime(employeeId: string, dto: UpsertAttendanceOvertimeDto, excludeId?: string) {
    const duplicate = await this.prisma.attendance_overtime.findFirst({
      where: {
        is_deleted: 0,
        employee_id: employeeId,
        start_time: new Date(dto.start_time),
        end_time: new Date(dto.end_time),
        ...(excludeId ? { NOT: { id: excludeId } } : {})
      },
      select: { id: true }
    });

    if (duplicate) {
      throw new BadRequestException('存在重复的加班申请');
    }
  }

  private async ensureNoOverlappingOvertime(employeeId: string, startTime: Date, endTime: Date, excludeId?: string) {
    const conflict = await this.prisma.attendance_overtime.findFirst({
      where: {
        is_deleted: 0,
        employee_id: employeeId,
        start_time: { lt: endTime },
        end_time: { gt: startTime },
        ...(excludeId ? { NOT: { id: excludeId } } : {})
      },
      select: { id: true }
    });

    if (conflict) {
      throw new BadRequestException('加班时间与已有加班申请冲突');
    }
  }

  private async ensureNoDuplicatePatchCard(employeeId: string, dto: UpsertAttendancePatchCardDto, excludeId?: string) {
    const duplicate = await this.prisma.attendance_patch_card.findFirst({
      where: {
        is_deleted: 0,
        employee_id: employeeId,
        patch_date: new Date(dto.patch_date),
        patch_type: dto.patch_type,
        target_time: new Date(dto.target_time),
        ...(excludeId ? { NOT: { id: excludeId } } : {})
      },
      select: { id: true }
    });

    if (duplicate) {
      throw new BadRequestException('存在重复的补卡申请');
    }
  }

  private async ensureNoDuplicateScheduleChange(employeeId: string, dto: UpsertAttendanceScheduleChangeDto, excludeId?: string) {
    const duplicate = await this.prisma.attendance_schedule_change.findFirst({
      where: {
        is_deleted: 0,
        employee_id: employeeId,
        change_date: new Date(dto.change_date),
        change_type: dto.change_type,
        ...(excludeId ? { NOT: { id: excludeId } } : {})
      },
      select: { id: true }
    });

    if (duplicate) {
      throw new BadRequestException('存在重复的调班申请');
    }
  }

  private async ensureLeaveOvertimeConflictFree(employeeId: string, startTime: Date, endTime: Date) {
    const overtimeConflict = await this.prisma.attendance_overtime.findFirst({
      where: {
        is_deleted: 0,
        employee_id: employeeId,
        start_time: { lt: endTime },
        end_time: { gt: startTime }
      },
      select: { id: true }
    });

    if (overtimeConflict) {
      throw new BadRequestException('请假时间与已有加班申请冲突');
    }
  }

  private async ensureOvertimeLeaveConflictFree(employeeId: string, startTime: Date, endTime: Date) {
    const leaveConflict = await this.prisma.attendance_leave.findFirst({
      where: {
        is_deleted: 0,
        employee_id: employeeId,
        start_time: { lt: endTime },
        end_time: { gt: startTime }
      },
      select: { id: true }
    });

    if (leaveConflict) {
      throw new BadRequestException('加班时间与已有请假申请冲突');
    }
  }

  async listRecords(userId: string, query: QueryAttendanceRecordsDto) {
    const { scope, employees } = await this.resolveEmployees(userId, query);
    if (employees.length === 0) {
      return [];
    }

    const { startDate, endDate } = normalizeDateRange(query.start_date, query.end_date);
    const records = await this.prisma.attendance_record.findMany({
      where: this.scopeService.applyScope(
        scope,
        {
          is_deleted: 0,
          employee_id: { in: employees.map((item) => item.id) },
          ...(startDate || endDate
            ? {
                attendance_date: {
                  ...(startDate ? { gte: startDate } : {}),
                  ...(endDate ? { lte: endDate } : {})
                }
              }
            : {})
        },
        { platform: 'platform_id', department: 'dept_id' }
      ),
      orderBy: [{ attendance_date: 'desc' }, { create_time: 'desc' }]
    });

    return this.attachEmployeeInfo(records, employees);
  }

  async listWorkflow(type: WorkflowType, userId: string, query: QueryAttendanceWorkflowsDto) {
    const { scope, employees } = await this.resolveEmployees(userId, query);
    if (employees.length === 0) {
      return [];
    }

    const config = WORKFLOW_CONFIG[type];
    const delegate = this.getDelegate(type);
    const { startDate, endDate } = normalizeDateRange(query.start_date, query.end_date);
    const items = await delegate.findMany({
      where: this.scopeService.applyScope(
        scope,
        {
          is_deleted: 0,
          employee_id: { in: employees.map((item) => item.id) },
          ...(query.approval_status !== undefined ? { approval_status: query.approval_status } : {}),
          ...(startDate || endDate
            ? {
                [config.dateField]: {
                  ...(startDate ? { gte: startDate } : {}),
                  ...(endDate ? { lte: endDate } : {})
                }
              }
            : {})
        },
        { platform: 'platform_id', department: 'dept_id' }
      ),
      orderBy: [{ [config.dateField]: 'desc' }, { create_time: 'desc' }]
    });

    return this.attachEmployeeInfo(items, employees);
  }

  async createLeave(userId: string, dto: UpsertAttendanceLeaveDto) {
    const { startTime, endTime } = this.validateLeaveDto(dto);
    const { employee } = await this.resolveEmployeeForWrite(userId, dto.employee_id);
    await this.ensureNoDuplicateLeave(employee.id, dto);
    await this.ensureNoOverlappingLeave(employee.id, startTime, endTime);
    await this.ensureLeaveOvertimeConflictFree(employee.id, startTime, endTime);

    const created = await this.prisma.attendance_leave.create({
      data: {
        leave_no: dto.leave_no || buildSerial(WORKFLOW_CONFIG.leave.serialPrefix),
        employee_id: employee.id,
        leave_type: dto.leave_type,
        start_time: startTime,
        end_time: endTime,
        duration_hours: dto.duration_hours,
        reason: dto.reason,
        approval_status: dto.approval_status ?? 0,
        approved_by: dto.approved_by,
        approved_time: dto.approved_time ? new Date(dto.approved_time) : undefined,
        platform_id: employee.platform_id,
        dept_id: employee.department_id,
        sync_attendance: dto.sync_attendance ?? 0,
        sync_schedule: dto.sync_schedule ?? 0,
        attachment_urls: dto.attachment_urls
      }
    });

    await this.createAttendanceApprovalForRecord(userId, employee, created, {
      bizType: 'attendance_leave',
      bizNo: created.leave_no,
      summary: `${employee.name} ${dto.leave_type} ${dto.start_time} ~ ${dto.end_time}`
    });

    return created;
  }

  async updateLeave(userId: string, id: string, dto: UpsertAttendanceLeaveDto) {
    const { startTime, endTime } = this.validateLeaveDto(dto);
    const current = await this.prisma.attendance_leave.findUnique({ where: { id } });
    if (!current || current.is_deleted) {
      throw new NotFoundException('请假申请不存在');
    }

    this.ensureWorkflowMutable(current.approval_status, '请假申请');
    await this.resolveEmployeeForWrite(userId, current.employee_id);
    const employeeId = dto.employee_id || current.employee_id;
    const { employee } = await this.resolveEmployeeForWrite(userId, employeeId);
    await this.ensureNoDuplicateLeave(employee.id, dto, id);
    await this.ensureNoOverlappingLeave(employee.id, startTime, endTime, id);
    await this.ensureLeaveOvertimeConflictFree(employee.id, startTime, endTime);

    return this.prisma.attendance_leave.update({
      where: { id },
      data: {
        leave_no: dto.leave_no || current.leave_no,
        employee_id: employee.id,
        leave_type: dto.leave_type,
        start_time: startTime,
        end_time: endTime,
        duration_hours: dto.duration_hours,
        reason: dto.reason,
        approval_status: dto.approval_status ?? current.approval_status,
        approved_by: dto.approved_by,
        approved_time: dto.approved_time ? new Date(dto.approved_time) : null,
        platform_id: employee.platform_id,
        dept_id: employee.department_id,
        sync_attendance: dto.sync_attendance ?? current.sync_attendance,
        sync_schedule: dto.sync_schedule ?? current.sync_schedule,
        attachment_urls: dto.attachment_urls
      }
    });
  }

  async removeLeave(userId: string, id: string) {
    const current = await this.prisma.attendance_leave.findUnique({ where: { id } });
    if (!current || current.is_deleted) {
      throw new NotFoundException('请假申请不存在');
    }

    this.ensureWorkflowMutable(current.approval_status, '请假申请');
    await this.resolveEmployeeForWrite(userId, current.employee_id);
    return this.prisma.attendance_leave.update({
      where: { id },
      data: { is_deleted: 1 }
    });
  }

  async createOvertime(userId: string, dto: UpsertAttendanceOvertimeDto) {
    const { startTime, endTime } = this.validateOvertimeDto(dto);
    const { employee } = await this.resolveEmployeeForWrite(userId, dto.employee_id);
    await this.ensureNoDuplicateOvertime(employee.id, dto);
    await this.ensureNoOverlappingOvertime(employee.id, startTime, endTime);
    await this.ensureOvertimeLeaveConflictFree(employee.id, startTime, endTime);

    const created = await this.prisma.attendance_overtime.create({
      data: {
        overtime_no: dto.overtime_no || buildSerial(WORKFLOW_CONFIG.overtime.serialPrefix),
        employee_id: employee.id,
        start_time: startTime,
        end_time: endTime,
        duration_hours: dto.duration_hours,
        reason: dto.reason,
        approval_status: dto.approval_status ?? 0,
        approved_by: dto.approved_by,
        approved_time: dto.approved_time ? new Date(dto.approved_time) : undefined,
        platform_id: employee.platform_id,
        dept_id: employee.department_id,
        sync_attendance: dto.sync_attendance ?? 0,
        sync_schedule: dto.sync_schedule ?? 0,
        attachment_urls: dto.attachment_urls
      }
    });

    await this.createAttendanceApprovalForRecord(userId, employee, created, {
      bizType: 'attendance_overtime',
      bizNo: created.overtime_no,
      summary: `${employee.name} ${dto.start_time} ~ ${dto.end_time} 加班申请`
    });

    return created;
  }

  async updateOvertime(userId: string, id: string, dto: UpsertAttendanceOvertimeDto) {
    const { startTime, endTime } = this.validateOvertimeDto(dto);
    const current = await this.prisma.attendance_overtime.findUnique({ where: { id } });
    if (!current || current.is_deleted) {
      throw new NotFoundException('加班申请不存在');
    }

    this.ensureWorkflowMutable(current.approval_status, '加班申请');
    await this.resolveEmployeeForWrite(userId, current.employee_id);
    const employeeId = dto.employee_id || current.employee_id;
    const { employee } = await this.resolveEmployeeForWrite(userId, employeeId);
    await this.ensureNoDuplicateOvertime(employee.id, dto, id);
    await this.ensureNoOverlappingOvertime(employee.id, startTime, endTime, id);
    await this.ensureOvertimeLeaveConflictFree(employee.id, startTime, endTime);

    return this.prisma.attendance_overtime.update({
      where: { id },
      data: {
        overtime_no: dto.overtime_no || current.overtime_no,
        employee_id: employee.id,
        start_time: startTime,
        end_time: endTime,
        duration_hours: dto.duration_hours,
        reason: dto.reason,
        approval_status: dto.approval_status ?? current.approval_status,
        approved_by: dto.approved_by,
        approved_time: dto.approved_time ? new Date(dto.approved_time) : null,
        platform_id: employee.platform_id,
        dept_id: employee.department_id,
        sync_attendance: dto.sync_attendance ?? current.sync_attendance,
        sync_schedule: dto.sync_schedule ?? current.sync_schedule,
        attachment_urls: dto.attachment_urls
      }
    });
  }

  async removeOvertime(userId: string, id: string) {
    const current = await this.prisma.attendance_overtime.findUnique({ where: { id } });
    if (!current || current.is_deleted) {
      throw new NotFoundException('加班申请不存在');
    }

    this.ensureWorkflowMutable(current.approval_status, '加班申请');
    await this.resolveEmployeeForWrite(userId, current.employee_id);
    return this.prisma.attendance_overtime.update({
      where: { id },
      data: { is_deleted: 1 }
    });
  }

  async createPatchCard(userId: string, dto: UpsertAttendancePatchCardDto) {
    const { patchDate, targetTime } = this.validatePatchCardDto(dto);
    const { employee } = await this.resolveEmployeeForWrite(userId, dto.employee_id);
    await this.ensureNoDuplicatePatchCard(employee.id, dto);

    const created = await this.prisma.attendance_patch_card.create({
      data: {
        patch_no: dto.patch_no || buildSerial(WORKFLOW_CONFIG['patch-card'].serialPrefix),
        employee_id: employee.id,
        patch_date: patchDate,
        patch_type: dto.patch_type,
        target_time: targetTime,
        reason: dto.reason,
        approval_status: dto.approval_status ?? 0,
        approved_by: dto.approved_by,
        approved_time: dto.approved_time ? new Date(dto.approved_time) : undefined,
        platform_id: employee.platform_id,
        dept_id: employee.department_id,
        sync_attendance: dto.sync_attendance ?? 0,
        attachment_urls: dto.attachment_urls
      }
    });

    await this.createAttendanceApprovalForRecord(userId, employee, created, {
      bizType: 'attendance_patch_card',
      bizNo: created.patch_no,
      summary: `${employee.name} ${dto.patch_date} ${dto.patch_type} ${dto.target_time}`
    });

    return created;
  }

  async updatePatchCard(userId: string, id: string, dto: UpsertAttendancePatchCardDto) {
    const { patchDate, targetTime } = this.validatePatchCardDto(dto);
    const current = await this.prisma.attendance_patch_card.findUnique({ where: { id } });
    if (!current || current.is_deleted) {
      throw new NotFoundException('补卡申请不存在');
    }

    this.ensureWorkflowMutable(current.approval_status, '补卡申请');
    await this.resolveEmployeeForWrite(userId, current.employee_id);
    const employeeId = dto.employee_id || current.employee_id;
    const { employee } = await this.resolveEmployeeForWrite(userId, employeeId);
    await this.ensureNoDuplicatePatchCard(employee.id, dto, id);

    return this.prisma.attendance_patch_card.update({
      where: { id },
      data: {
        patch_no: dto.patch_no || current.patch_no,
        employee_id: employee.id,
        patch_date: patchDate,
        patch_type: dto.patch_type,
        target_time: targetTime,
        reason: dto.reason,
        approval_status: dto.approval_status ?? current.approval_status,
        approved_by: dto.approved_by,
        approved_time: dto.approved_time ? new Date(dto.approved_time) : null,
        platform_id: employee.platform_id,
        dept_id: employee.department_id,
        sync_attendance: dto.sync_attendance ?? current.sync_attendance,
        attachment_urls: dto.attachment_urls
      }
    });
  }

  async removePatchCard(userId: string, id: string) {
    const current = await this.prisma.attendance_patch_card.findUnique({ where: { id } });
    if (!current || current.is_deleted) {
      throw new NotFoundException('补卡申请不存在');
    }

    this.ensureWorkflowMutable(current.approval_status, '补卡申请');
    await this.resolveEmployeeForWrite(userId, current.employee_id);
    return this.prisma.attendance_patch_card.update({
      where: { id },
      data: { is_deleted: 1 }
    });
  }

  async createScheduleChange(userId: string, dto: UpsertAttendanceScheduleChangeDto) {
    const { changeDate } = this.validateScheduleChangeDto(dto);
    const { employee } = await this.resolveEmployeeForWrite(userId, dto.employee_id);
    await this.ensureNoDuplicateScheduleChange(employee.id, dto);
    const notifyStatus = employee.user_id ? 1 : 0;

    const created = await this.prisma.attendance_schedule_change.create({
      data: {
        change_no: dto.change_no || buildSerial(WORKFLOW_CONFIG['schedule-change'].serialPrefix),
        employee_id: employee.id,
        change_date: changeDate,
        before_shift_name: dto.before_shift_name,
        after_shift_name: dto.after_shift_name,
        change_type: dto.change_type,
        reason: dto.reason,
        operator_id: dto.operator_id,
        notify_status: notifyStatus,
        platform_id: employee.platform_id,
        dept_id: employee.department_id
      }
    });

    await this.messageService.send({
      recipientId: dto.operator_id ?? userId,
      title: '调班申请已创建',
      content: `${employee.name} 的调班申请 ${created.change_no} 已提交。`,
      messageType: 'schedule_change_created',
      bizType: 'attendance_schedule_change',
      bizId: created.id,
      route: '/attendance/requests',
      senderId: userId,
      payload: {
        employeeId: employee.id,
        employeeName: employee.name,
        beforeShiftName: created.before_shift_name,
        afterShiftName: created.after_shift_name
      }
    });

    if (employee.user_id && employee.user_id !== (dto.operator_id ?? userId)) {
      await this.notifyScheduleChange(userId, employee, created, dto.operator_id);
    }

    return created;
  }

  async updateScheduleChange(userId: string, id: string, dto: UpsertAttendanceScheduleChangeDto) {
    const { changeDate } = this.validateScheduleChangeDto(dto);
    const current = await this.prisma.attendance_schedule_change.findUnique({ where: { id } });
    if (!current || current.is_deleted) {
      throw new NotFoundException('调班申请不存在');
    }

    await this.resolveEmployeeForWrite(userId, current.employee_id);
    const employeeId = dto.employee_id || current.employee_id;
    const { employee } = await this.resolveEmployeeForWrite(userId, employeeId);
    await this.ensureNoDuplicateScheduleChange(employee.id, dto, id);
    const notifyStatus = employee.user_id ? 1 : current.notify_status;

    const updated = await this.prisma.attendance_schedule_change.update({
      where: { id },
      data: {
        change_no: dto.change_no || current.change_no,
        employee_id: employee.id,
        change_date: changeDate,
        before_shift_name: dto.before_shift_name,
        after_shift_name: dto.after_shift_name,
        change_type: dto.change_type,
        reason: dto.reason,
        operator_id: dto.operator_id,
        notify_status: notifyStatus,
        platform_id: employee.platform_id,
        dept_id: employee.department_id
      }
    });

    if (employee.user_id && employee.user_id !== (dto.operator_id ?? userId)) {
      await this.notifyScheduleChange(userId, employee, updated, dto.operator_id);
    }

    return updated;
  }

  async removeScheduleChange(userId: string, id: string) {
    const current = await this.prisma.attendance_schedule_change.findUnique({ where: { id } });
    if (!current || current.is_deleted) {
      throw new NotFoundException('调班申请不存在');
    }

    await this.resolveEmployeeForWrite(userId, current.employee_id);
    return this.prisma.attendance_schedule_change.update({
      where: { id },
      data: { is_deleted: 1 }
    });
  }
}
