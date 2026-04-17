import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { ScopeService } from "../../../common/services/scope.service";
import { ConfigCacheService } from "../../../common/services/config-cache.service";

export interface SchedulePreference {
  avoid_shifts?: string[]; // 不希望排的班次名称
  prefer_shifts?: string[]; // 希望优先排的班次
  avoid_weekdays?: number[]; // 0=周日,1=周一...不希望上班的星期
  max_days_per_week?: number;
  can_overtime?: boolean;
  note?: string;
}

@Injectable()
export class EmployeeScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly configCacheService: ConfigCacheService,
  ) {}

  // ======= 排班偏好 =======
  private prefKey(employeeId: string) {
    return `schedule:preference:${employeeId}`;
  }

  async getPreference(employeeId: string): Promise<SchedulePreference> {
    const value = await this.configCacheService.get(this.prefKey(employeeId));
    if (!value) return {};
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  /**
   * 批量获取员工偏好（V2.0 性能优化）
   * 解决N+1查询问题，将N次查询优化为1次
   */
  async getPreferencesBatch(
    employeeIds: string[],
  ): Promise<Map<string, SchedulePreference>> {
    if (employeeIds.length === 0) {
      return new Map();
    }

    // 批量查询所有员工的偏好配置
    const keys = employeeIds.map((id) => this.prefKey(id));
    const records = await this.prisma.sys_config.findMany({
      where: { config_key: { in: keys } },
    });

    // 构建Map
    const map = new Map<string, SchedulePreference>();
    const recordMap = new Map(
      records.map((r) => [r.config_key, r.config_value]),
    );

    employeeIds.forEach((id) => {
      const key = this.prefKey(id);
      const value = recordMap.get(key);
      if (value) {
        try {
          map.set(id, JSON.parse(value));
        } catch {
          map.set(id, {});
        }
      } else {
        map.set(id, {});
      }
    });

    return map;
  }

  async savePreference(employeeId: string, pref: SchedulePreference) {
    await this.prisma.sys_config.upsert({
      where: { config_key: this.prefKey(employeeId) },
      create: {
        config_key: this.prefKey(employeeId),
        config_value: JSON.stringify(pref),
      },
      update: { config_value: JSON.stringify(pref) },
    });
    return { success: true };
  }

  // ======= 员工查看个人排班 =======
  async getMySchedule(userId: string, startDate: string, endDate: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    // 通过 userId 找到对应员工
    const employee = await this.prisma.hr_employee.findFirst({
      where: {
        user_id: userId,
        platform_id: scope.platform_id as string,
        is_deleted: 0,
      },
    });
    if (!employee) return { employee: null, schedules: [] };

    const schedules = await this.prisma.attendance_schedule.findMany({
      where: {
        employee_id: employee.id,
        schedule_date: { gte: new Date(startDate), lte: new Date(endDate) },
        is_deleted: 0,
      },
      orderBy: { schedule_date: "asc" },
    });

    return {
      employee: {
        id: employee.id,
        name: employee.name,
        dept_id: employee.department_id,
      },
      schedules: schedules.map((s) => ({
        id: s.id,
        date: s.schedule_date.toISOString().split("T")[0],
        shift_name: s.shift_name,
      })),
    };
  }

  // ======= 调班申请 =======
  async submitSwapRequest(
    userId: string,
    payload: {
      schedule_date: string;
      current_shift_name: string;
      target_shift_name: string;
      reason: string;
    },
  ) {
    const scope = await this.scopeService.resolveAccess(userId);
    const employee = await this.prisma.hr_employee.findFirst({
      where: {
        user_id: userId,
        platform_id: scope.platform_id as string,
        is_deleted: 0,
      },
    });

    const changeNo = `SC${Date.now()}`;
    const record = await this.prisma.attendance_schedule_change.create({
      data: {
        change_no: changeNo,
        employee_id: employee?.id ?? userId,
        change_date: new Date(payload.schedule_date),
        before_shift_name: payload.current_shift_name,
        after_shift_name: payload.target_shift_name,
        change_type: "swap_request",
        reason: payload.reason,
        operator_id: userId,
        notify_status: 0,
        platform_id: scope.platform_id as string,
        dept_id: employee?.department_id ?? undefined,
      },
    });
    return { success: true, change_no: record.change_no };
  }

  // ======= 查看调班申请列表 =======
  async listMySwapRequests(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const employee = await this.prisma.hr_employee.findFirst({
      where: {
        user_id: userId,
        platform_id: scope.platform_id as string,
        is_deleted: 0,
      },
    });
    if (!employee) return [];

    return this.prisma.attendance_schedule_change.findMany({
      where: {
        employee_id: employee.id,
        change_type: "swap_request",
        platform_id: scope.platform_id as string,
        is_deleted: 0,
      },
      orderBy: { create_time: "desc" },
    });
  }

  // ======= 排班反馈 =======
  private feedbackKey(employeeId: string, date: string) {
    return `schedule:feedback:${employeeId}:${date}`;
  }

  async submitFeedback(
    userId: string,
    payload: {
      schedule_date: string;
      rating: "ok" | "unreasonable" | "need_adjust";
      comment?: string;
    },
  ) {
    const scope = await this.scopeService.resolveAccess(userId);
    const employee = await this.prisma.hr_employee.findFirst({
      where: {
        user_id: userId,
        platform_id: scope.platform_id as string,
        is_deleted: 0,
      },
    });
    const empId = employee?.id ?? userId;
    const key = this.feedbackKey(empId, payload.schedule_date);

    await this.prisma.sys_config.upsert({
      where: { config_key: key },
      create: {
        config_key: key,
        config_value: JSON.stringify({
          ...payload,
          employee_id: empId,
          submitted_at: new Date().toISOString(),
        }),
      },
      update: {
        config_value: JSON.stringify({
          ...payload,
          employee_id: empId,
          submitted_at: new Date().toISOString(),
        }),
      },
    });
    return { success: true };
  }

  // ======= 模板保存/查询 =======
  private templateKey(platformId: string) {
    return `ai_schedule_template:${platformId}`;
  }

  async saveTemplate(
    userId: string,
    template: { name: string; params: Record<string, any> },
  ) {
    const scope = await this.scopeService.resolveAccess(userId);
    const key = this.templateKey(scope.platform_id as string);

    const existing = await this.prisma.sys_config.findUnique({
      where: { config_key: key },
    });
    const list: any[] = existing ? JSON.parse(existing.config_value) : [];

    const newTemplate = {
      id: `tpl_${Date.now()}`,
      ...template,
      created_at: new Date().toISOString(),
    };
    list.unshift(newTemplate);
    const trimmed = list.slice(0, 20);

    await this.prisma.sys_config.upsert({
      where: { config_key: key },
      create: { config_key: key, config_value: JSON.stringify(trimmed) },
      update: { config_value: JSON.stringify(trimmed) },
    });
    return { success: true, id: newTemplate.id };
  }

  async listTemplates(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const key = this.templateKey(scope.platform_id as string);
    const existing = await this.prisma.sys_config.findUnique({
      where: { config_key: key },
    });
    if (!existing) return [];
    try {
      return JSON.parse(existing.config_value);
    } catch {
      return [];
    }
  }

  async deleteTemplate(userId: string, templateId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const key = this.templateKey(scope.platform_id as string);
    const existing = await this.prisma.sys_config.findUnique({
      where: { config_key: key },
    });
    if (!existing) return { success: true };
    const list: any[] = JSON.parse(existing.config_value);
    await this.prisma.sys_config.update({
      where: { config_key: key },
      data: {
        config_value: JSON.stringify(list.filter((t) => t.id !== templateId)),
      },
    });
    return { success: true };
  }

  // ======= 管理端调班审批 =======
  async listAllSwapRequests(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.attendance_schedule_change.findMany({
      where: {
        change_type: "swap_request",
        platform_id: scope.platform_id as string,
        is_deleted: 0,
      },
      include: {
        hr_employee: { select: { name: true } },
      },
      orderBy: { create_time: "desc" },
    });
  }

  async approveSwapRequest(userId: string, changeId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const change = await this.prisma.attendance_schedule_change.findFirst({
      where: { id: changeId, platform_id: scope.platform_id as string },
    });

    if (!change) throw new Error("申请记录不存在");

    // 1. 更新正式排班表
    await this.prisma.attendance_schedule.updateMany({
      where: {
        employee_id: change.employee_id,
        schedule_date: change.change_date,
        platform_id: scope.platform_id as string,
      },
      data: {
        shift_name: change.after_shift_name,
      },
    });

    // 2. 更新申请状态
    await this.prisma.attendance_schedule_change.update({
      where: { id: changeId },
      data: {
        notify_status: 1, // 已批准
        operator_id: userId,
      },
    });

    return { success: true };
  }

  async rejectSwapRequest(userId: string, changeId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    await this.prisma.attendance_schedule_change.updateMany({
      where: { id: changeId, platform_id: scope.platform_id as string },
      data: {
        notify_status: 2, // 已拒绝
        operator_id: userId,
      },
    });
    return { success: true };
  }
}
