import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../../prisma/prisma.service";
import { ScopeService } from "../../../common/services/scope.service";
import { RedisService } from "../../../common/services/redis.service";
import { BusinessLockService } from "../../../common/services/business-lock.service";
import { PaginationService } from "../../../common/services/pagination.service";
import {
  PaginationDto,
  PaginatedResponse,
} from "../../../common/dto/pagination.dto";
import { QueryAttendanceRecordsDto } from "../dto/query-attendance-records.dto";
import { Cache } from "../../../common/decorators/cache.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";

@Injectable()
export class AttendanceRecordsService {
  private readonly logger = new Logger(AttendanceRecordsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly redisService: RedisService,
    private readonly businessLockService: BusinessLockService,
    private readonly paginationService: PaginationService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue("attendance-queue") private readonly attendanceQueue: Queue,
  ) {}


  async clockIn(
    userId: string,
    data: { type: "on" | "off"; location?: string },
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lockKey = `attendance:lock:${userId}:${today.getTime()}:${data.type}`;

    return this.businessLockService.runExclusive(lockKey, 5, async () => {
      let employeeId = await this.redisService.get(`user:employee:${userId}`);
      let employee: any;
      if (!employeeId) {
        employee = await this.prisma.hr_employee.findUnique({
          where: { user_id: userId },
        });
        if (!employee) throw new NotFoundException("员工档案不存在");
        employeeId = employee.id;
        await this.redisService.set(
          `user:employee:${userId}`,
          employeeId as string,
          3600,
        );
      } else {
        employee = await this.prisma.hr_employee.findUnique({
          where: { id: employeeId as string },
        });
      }

      return this.prisma.$transaction(async (tx) => {
        let record = await tx.attendance_record.findFirst({
          where: {
            employee_id: employee.id,
            attendance_date: today,
            is_deleted: 0,
          },
        });

        if (!record) {
          record = await tx.attendance_record.create({
            data: {
              employee_id: employee.id,
              attendance_date: today,
              platform_id: employee.platform_id,
              dept_id: employee.department_id,
            },
          });
        }

        const updateData: any = {};
        if (data.type === "on") {
          if (record.actual_on_duty_time)
            throw new BadRequestException("今日上班已打卡");
          updateData.actual_on_duty_time = new Date();
          updateData.on_duty_location = data.location;
        } else {
          updateData.actual_off_duty_time = new Date();
          updateData.off_duty_location = data.location;
        }

        const updated = await tx.attendance_record.update({
          where: { id: record.id },
          data: updateData,
        });

        // V5.0 加固：增加 BullMQ 重试与指数退避，确保计算任务的高可靠性
        await this.attendanceQueue.add(
          "recalculate",
          { recordId: updated.id },
          {
            attempts: 3,
            backoff: { type: "exponential", delay: 1000 },
            removeOnComplete: true,
          },
        );

        const monthKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}`;
        await this.redisService.del(
          `attendance:stats:${employee.platform_id}:${monthKey}`,
        );

        return updated;
      });
    });
  }

  /**
   * 查询考勤记录（V3.0 统一分页）
   * 优化点：添加查询监控、统一分页
   */
  @QueryOptimize({ timeout: 5000, slowQueryThreshold: 300 })
  async findAll(
    userId: string,
    pagination: PaginationDto,
    query: QueryAttendanceRecordsDto,
  ): Promise<PaginatedResponse<any>> {
    const scope = await this.scopeService.resolveAccess(userId);

    const baseWhere: any = { is_deleted: 0 };
    if (query.start_date && query.end_date) {
      baseWhere.attendance_date = {
        gte: new Date(query.start_date),
        lte: new Date(query.end_date),
      };
    }
    if (query.keyword) {
      baseWhere.OR = [
        { hr_employee: { name: { contains: query.keyword } } },
        { hr_employee: { employee_no: { contains: query.keyword } } },
      ];
    }

    const where = this.scopeService.applyScope(scope, baseWhere, {
      platform: "platform_id",
      department: "dept_id",
    });

    const { skip, take } = this.paginationService.calculatePagination(
      pagination.page,
      pagination.pageSize,
    );

    const [data, total] = await Promise.all([
      this.prisma.attendance_record.findMany({
        where: where as any,
        skip,
        take,
        orderBy: { attendance_date: "desc" },
      }),
      this.prisma.attendance_record.count({ where: where as any }),
    ]);

    return this.paginationService.createResponse(
      data,
      total,
      pagination.page,
      pagination.pageSize,
    );
  }

  /**
   * 工业级高效率统计 (V5.0 + V2.0 性能优化)
   * 优先从汇总快照表读取，避免全量扫描
   * 优化点：添加缓存（5分钟）和查询监控
   */
  @Cache({ ttl: 300, byParams: true, prefix: "attendance-stats" })
  @QueryOptimize({ timeout: 5000, slowQueryThreshold: 300 })
  async getStatistics(
    userId: string,
    query: { month: string; dept_id?: string; platform_id?: string },
  ) {
    const scope = await this.scopeService.resolveAccess(userId);

    // 1. 获取员工列表（基于 Scope）
    const employees = await this.prisma.hr_employee.findMany({
      where: this.scopeService.applyScope(
        scope,
        { is_deleted: 0, department_id: query.dept_id } as any,
        { platform: "platform_id", department: "department_id" },
      ),
      select: { id: true, name: true, employee_no: true },
    });

    const employeeIds = employees.map((e) => e.id);

    // 2. 从汇总快照表读取
    const summaries = await this.prisma.attendance_monthly_summary.findMany({
      where: {
        employee_id: { in: employeeIds },
        month: query.month,
        is_deleted: 0,
      },
    });

    const summaryMap = new Map(summaries.map((s) => [s.employee_id, s]));

    // 3. 组装结果（若快照不存在则返回全 0，等待 Worker 补全）
    return employees.map((e) => {
      const s = summaryMap.get(e.id);
      return {
        employee_name: e.name,
        employee_no: e.employee_no,
        normal_days: s?.normal_days ?? 0,
        late_count: s?.late_count ?? 0,
        early_count: s?.early_count ?? 0,
        absent_days: s?.absent_days ?? 0,
        miss_count: s?.miss_count ?? 0,
      };
    });
  }

  /**
   * 执行月度汇总的增量更新 (V5.0)
   * 由 Worker 在每次记录重算后调用
   */
  async updateMonthlySummary(employeeId: string, month: string) {
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    const records = await this.prisma.attendance_record.findMany({
      where: {
        employee_id: employeeId,
        attendance_date: { gte: startDate, lte: endDate },
        is_deleted: 0,
      },
    });

    const employee = await this.prisma.hr_employee.findUnique({
      where: { id: employeeId },
      select: { platform_id: true, department_id: true },
    });

    const summary = {
      normal_days: records.filter(
        (r) => r.on_duty_status === 1 && r.off_duty_status === 1,
      ).length,
      late_count: records.filter((r) => r.on_duty_status === 2).length,
      early_count: records.filter((r) => r.off_duty_status === 3).length,
      absent_days: records.filter(
        (r) => r.on_duty_status === 4 || r.off_duty_status === 4,
      ).length,
      miss_count: records.filter(
        (r) => r.on_duty_status === 5 || r.off_duty_status === 5,
      ).length,
    };

    return this.prisma.attendance_monthly_summary.upsert({
      where: { employee_id_month: { employee_id: employeeId, month } },
      create: {
        employee_id: employeeId,
        month,
        ...summary,
        platform_id: employee?.platform_id,
        dept_id: employee?.department_id,
      },
      update: summary,
    });
  }

  async reCalculate(id: string) {
    const record = await this.prisma.attendance_record.findUnique({
      where: { id },
    });
    if (!record) return;

    const schedule = await this.prisma.attendance_schedule.findFirst({
      where: {
        employee_id: record.employee_id,
        schedule_date: record.attendance_date,
        is_deleted: 0,
      },
    });
    if (!schedule) return;

    const rule = await this.prisma.attendance_rule.findFirst({
      where: { name: schedule.shift_name, is_deleted: 0 },
    });
    if (!rule) return;

    const onStatus = this.calculateStatus(
      record.actual_on_duty_time,
      rule.on_duty_time,
      rule.late_threshold,
      rule.absenteeism_threshold,
      "on",
    );
    const offStatus = this.calculateStatus(
      record.actual_off_duty_time,
      rule.off_duty_time,
      rule.early_threshold,
      rule.absenteeism_threshold,
      "off",
    );

    let ex = "";
    if (onStatus !== 1)
      ex += onStatus === 2 ? "迟到" : onStatus === 4 ? "旷工" : "漏打卡";
    if (offStatus !== 1)
      ex += (ex ? " / " : "") + (offStatus === 3 ? "早退" : "漏打卡");

    await this.prisma.attendance_record.update({
      where: { id },
      data: {
        on_duty_status: onStatus,
        off_duty_status: offStatus,
        exception_type: ex || null,
        scheduled_on_duty_time: rule.on_duty_time,
        scheduled_off_duty_time: rule.off_duty_time,
        shift_name: rule.name,
      },
    });

    // --- [NEW] 触发考勤异常通知 (PRD 2.5) ---
    if (onStatus !== 1 || offStatus !== 1) {
      const employee = await this.prisma.hr_employee.findUnique({
        where: { id: record.employee_id },
        select: { id: true, name: true, platform_id: true, department_id: true },
      });

      if (employee) {
        this.eventEmitter.emit("message.trigger", {
          event: "attendance.anomaly",
          variables: {
            username: employee.name,
            date: record.attendance_date.toISOString().split("T")[0],
            type: ex || "未知异常",
          },
          recipientIds: [employee.id],
          platformId: employee.platform_id,
          deptId: employee.department_id,
        });
      }
    }
  }


  private calculateStatus(
    actual: Date | null,
    planned: string,
    threshold: number,
    absenteeismThreshold: number,
    type: "on" | "off",
  ): number {
    if (!actual) return 5;
    const [h, m] = planned.split(":").map(Number);
    const pDate = new Date(actual);
    pDate.setHours(h, m, 0, 0);
    const diff = (actual.getTime() - pDate.getTime()) / 60000;

    if (type === "on") {
      if (diff <= threshold) return 1; // 正常
      if (diff <= absenteeismThreshold) return 2; // 迟到
      return 4; // 旷工
    } else {
      if (diff >= -threshold) return 1; // 正常
      return 3; // 早退
    }
  }

  /**
   * 查询考勤记录详情
   */
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async findOne(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const record = await this.prisma.attendance_record.findFirst({
      where: this.scopeService.applyScope(
        scope,
        { id, is_deleted: 0 },
        { platform: "platform_id", department: "dept_id" },
      ),
      include: {
        hr_employee: {
          select: {
            id: true,
            name: true,
            employee_no: true,
            hr_department: { select: { name: true } },
            hr_position: { select: { name: true } },
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException("考勤记录不存在");
    }

    return record;
  }

  /**
   * 导出考勤记录
   */
  async export(userId: string, query: QueryAttendanceRecordsDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const baseWhere: any = { is_deleted: 0 };

    if (query.start_date && query.end_date) {
      baseWhere.attendance_date = {
        gte: new Date(query.start_date),
        lte: new Date(query.end_date),
      };
    }

    if (query.keyword) {
      baseWhere.OR = [
        { hr_employee: { name: { contains: query.keyword } } },
        { hr_employee: { employee_no: { contains: query.keyword } } },
      ];
    }

    const where = this.scopeService.applyScope(scope, baseWhere, {
      platform: "platform_id",
      department: "dept_id",
    });

    const records = await this.prisma.attendance_record.findMany({
      where: where as any,
      include: {
        hr_employee: {
          select: {
            name: true,
            employee_no: true,
            hr_department: { select: { name: true } },
          },
        },
      },
      orderBy: { attendance_date: "desc" },
      take: 5000, // 限制导出数量
    });

    const statusMap = {
      1: "正常",
      2: "迟到",
      3: "早退",
      4: "旷工",
      5: "漏打卡",
    };

    const exportData = records.map((record) => ({
      员工工号: record.hr_employee?.employee_no || "",
      员工姓名: record.hr_employee?.name || "",
      部门: record.hr_employee?.hr_department?.name || "",
      考勤日期: record.attendance_date?.toISOString().split("T")[0] || "",
      班次: record.shift_name || "",
      计划上班: record.scheduled_on_duty_time || "",
      实际上班:
        record.actual_on_duty_time?.toLocaleTimeString("zh-CN", {
          hour12: false,
        }) || "",
      上班状态: statusMap[record.on_duty_status] || "",
      计划下班: record.scheduled_off_duty_time || "",
      实际下班:
        record.actual_off_duty_time?.toLocaleTimeString("zh-CN", {
          hour12: false,
        }) || "",
      下班状态: statusMap[record.off_duty_status] || "",
      异常类型: record.exception_type || "",
    }));

    return {
      data: exportData,
      filename: `考勤记录_${new Date().toISOString().split("T")[0]}.xlsx`,
    };
  }

  /**
   * 批量审批考勤异常
   */
  async batchApprove(userId: string, ids: string[], status: number) {
    const scope = await this.scopeService.resolveAccess(userId);

    // 权限校验：确保所有记录都在用户权限范围内
    const records = await this.prisma.attendance_record.findMany({
      where: this.scopeService.applyScope(
        scope,
        { id: { in: ids }, is_deleted: 0 },
        { platform: "platform_id", department: "dept_id" },
      ),
    });

    if (records.length !== ids.length) {
      throw new NotFoundException("部分考勤记录不存在或无权限访问");
    }

    // 批量更新审批状态
    await this.prisma.attendance_record.updateMany({
      where: { id: { in: ids } },
      data: {
        approval_status: status,
        approval_time: new Date(),
        approval_user_id: userId,
      },
    });

    return { success: true, updated: ids.length };
  }
}
