import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { RealtimeService } from "../../../common/services/realtime.service";
import { ScheduleIncrementalService } from "./schedule-incremental.service";

/**
 * 实时调整服务 (V4.0 长期优化)
 *
 * 功能：
 * 1. 实时监控排班执行情况
 * 2. 自动检测异常（缺勤、迟到等）
 * 3. 智能调整未来排班
 * 4. 智能补班建议
 * 5. 实时通知相关人员
 */
@Injectable()
export class ScheduleRealtimeService {
  private readonly logger = new Logger(ScheduleRealtimeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
    private readonly scheduleIncrementalService: ScheduleIncrementalService,
  ) {}

  /**
   * 监控今日排班执行情况
   */
  async monitorTodaySchedule(platformId: string, deptId: string) {
    this.logger.log(`监控今日排班: 部门=${deptId}`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. 获取今日排班
    const todaySchedules = await this.prisma.attendance_schedule.findMany({
      where: {
        platform_id: platformId,
        dept_id: deptId,
        schedule_date: today,
        status: 1, // 已发布
        is_deleted: 0,
      },
    });

    // 2. 获取今日考勤记录
    const todayRecords = await this.prisma.attendance_record.findMany({
      where: {
        platform_id: platformId,
        dept_id: deptId,
        attendance_date: today,
        is_deleted: 0,
      },
    });

    // 3. 分析执行情况
    const analysis = this.analyzeExecution(todaySchedules, todayRecords);

    // 4. 检测异常
    const anomalies = this.detectAnomalies(todaySchedules, todayRecords);

    // 5. 生成调整建议
    const suggestions = await this.generateAdjustmentSuggestions(
      platformId,
      deptId,
      todaySchedules,
      todayRecords,
      anomalies,
    );

    return {
      success: true,
      date: today.toISOString().split("T")[0],
      analysis,
      anomalies,
      suggestions,
    };
  }

  /**
   * 自动调整未来排班
   */
  async autoAdjustFutureSchedule(
    userId: string,
    platformId: string,
    deptId: string,
    reason: string,
  ) {
    this.logger.log(`自动调整未来排班: 部门=${deptId}, 原因=${reason}`);

    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // 1. 获取未来7天的排班
    const futureSchedules = await this.prisma.attendance_schedule.findMany({
      where: {
        platform_id: platformId,
        dept_id: deptId,
        schedule_date: {
          gt: today,
          lte: nextWeek,
        },
        is_deleted: 0,
      },
    });

    // 2. 分析历史缺勤模式
    const absenteeismPattern = await this.analyzeAbsenteeismPattern(
      platformId,
      deptId,
    );

    // 3. 生成调整方案
    const adjustments = this.generateAdjustments(
      futureSchedules,
      absenteeismPattern,
    );

    // 4. 应用调整
    if (adjustments.length > 0) {
      const result = await this.scheduleIncrementalService.batchUpdateSchedules(
        userId,
        adjustments,
        { platform_id: platformId, dept_id: deptId },
      );

      // 5. 通知相关人员
      await this.notifyAdjustments(adjustments, reason);

      return {
        success: true,
        adjustments: adjustments.length,
        result,
      };
    }

    return {
      success: true,
      adjustments: 0,
      message: "无需调整",
    };
  }

  /**
   * 智能补班建议
   */
  async suggestReplacement(
    platformId: string,
    deptId: string,
    absentEmployeeId: string,
    date: string,
    shiftName: string,
  ) {
    this.logger.log(
      `智能补班建议: 员工=${absentEmployeeId}, 日期=${date}, 班次=${shiftName}`,
    );

    // 1. 获取可用员工
    const availableEmployees = await this.findAvailableEmployees(
      platformId,
      deptId,
      date,
      shiftName,
    );

    // 2. 评分排序
    const rankedEmployees = await this.rankReplacementCandidates(
      availableEmployees,
      date,
      shiftName,
      absentEmployeeId,
    );

    // 3. 生成建议
    const suggestions = rankedEmployees.slice(0, 5).map((emp) => ({
      employee_id: emp.id,
      employee_name: emp.name,
      score: emp.score,
      reasons: emp.reasons,
      availability: emp.availability,
    }));

    return {
      success: true,
      suggestions,
      total: availableEmployees.length,
    };
  }

  /**
   * 实时通知排班变更
   */
  async notifyScheduleChange(
    employeeId: string,
    date: string,
    oldShift: string,
    newShift: string,
    reason: string,
  ) {
    this.logger.log(`通知排班变更: 员工=${employeeId}, 日期=${date}`);

    // 1. 发送实时通知
    this.realtimeService.sendToUser(employeeId, "schedule:changed", {
      date,
      oldShift,
      newShift,
      reason,
      timestamp: new Date().toISOString(),
    });

    // 2. 创建站内消息
    await this.prisma.sys_message.create({
      data: {
        recipient_id: employeeId,
        title: "📅 排班变更通知",
        content: `您在 ${date} 的排班已调整：${oldShift} → ${newShift}。原因：${reason}`,
        message_type: "NORMAL",
        biz_type: "SCHEDULE_CHANGE",
        biz_id: employeeId,
        route: "/attendance/my-schedule",
        sender_name: "雷犀 AI 排班助手",
      },
    });

    return {
      success: true,
      message: "通知已发送",
    };
  }

  /**
   * 分析执行情况
   */
  private analyzeExecution(schedules: any[], records: any[]) {
    const totalScheduled = schedules.length;
    const totalAttended = records.filter((r) => r.on_duty_status === 1).length;
    const totalAbsent = records.filter((r) => r.on_duty_status === 3).length;
    const totalLate = records.filter((r) => r.on_duty_status === 2).length;

    return {
      total_scheduled: totalScheduled,
      total_attended: totalAttended,
      total_absent: totalAbsent,
      total_late: totalLate,
      attendance_rate:
        totalScheduled > 0
          ? Math.round((totalAttended / totalScheduled) * 100)
          : 0,
      punctuality_rate:
        totalAttended > 0
          ? Math.round(((totalAttended - totalLate) / totalAttended) * 100)
          : 0,
    };
  }

  /**
   * 检测异常
   */
  private detectAnomalies(schedules: any[], records: any[]) {
    const anomalies: any[] = [];

    // 1. 检测缺勤
    for (const schedule of schedules) {
      const record = records.find(
        (r) => r.employee_id === schedule.employee_id,
      );

      if (!record || record.on_duty_status === 3) {
        anomalies.push({
          type: "absent",
          employee_id: schedule.employee_id,
          shift_name: schedule.shift_name,
          severity: "high",
        });
      }
    }

    // 2. 检测迟到
    for (const record of records) {
      if (record.on_duty_status === 2) {
        anomalies.push({
          type: "late",
          employee_id: record.employee_id,
          shift_name: record.shift_name,
          severity: "medium",
        });
      }
    }

    // 3. 检测人力不足
    const shiftCounts = new Map<string, number>();
    for (const schedule of schedules) {
      const count = shiftCounts.get(schedule.shift_name) || 0;
      shiftCounts.set(schedule.shift_name, count + 1);
    }

    for (const [shiftName, count] of shiftCounts.entries()) {
      if (count < 2) {
        // 假设最少需要2人
        anomalies.push({
          type: "understaffed",
          shift_name: shiftName,
          current_count: count,
          required_count: 2,
          severity: "high",
        });
      }
    }

    return anomalies;
  }

  /**
   * 生成调整建议
   */
  private async generateAdjustmentSuggestions(
    platformId: string,
    deptId: string,
    schedules: any[],
    records: any[],
    anomalies: any[],
  ) {
    const suggestions: any[] = [];

    for (const anomaly of anomalies) {
      if (anomaly.type === "absent") {
        suggestions.push({
          type: "replacement",
          priority: "high",
          action: "建议立即安排替班",
          employee_id: anomaly.employee_id,
          shift_name: anomaly.shift_name,
        });
      } else if (anomaly.type === "understaffed") {
        suggestions.push({
          type: "supplement",
          priority: "high",
          action: "建议增加人手",
          shift_name: anomaly.shift_name,
          gap: anomaly.required_count - anomaly.current_count,
        });
      } else if (anomaly.type === "late") {
        suggestions.push({
          type: "reminder",
          priority: "medium",
          action: "建议发送提醒",
          employee_id: anomaly.employee_id,
        });
      }
    }

    return suggestions;
  }

  /**
   * 分析缺勤模式
   */
  private async analyzeAbsenteeismPattern(platformId: string, deptId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const records = await this.prisma.attendance_record.findMany({
      where: {
        platform_id: platformId,
        dept_id: deptId,
        attendance_date: { gte: thirtyDaysAgo },
        on_duty_status: 3, // 缺勤
        is_deleted: 0,
      },
    });

    // 按员工统计缺勤次数
    const absenteeismMap = new Map<string, number>();
    for (const record of records) {
      const count = absenteeismMap.get(record.employee_id) || 0;
      absenteeismMap.set(record.employee_id, count + 1);
    }

    return absenteeismMap;
  }

  /**
   * 生成调整方案
   */
  private generateAdjustments(
    schedules: any[],
    absenteeismPattern: Map<string, number>,
  ) {
    const adjustments: any[] = [];

    // 对高缺勤率员工的未来排班进行调整
    for (const schedule of schedules) {
      const absentCount = absenteeismPattern.get(schedule.employee_id) || 0;

      // 如果缺勤次数超过5次,记录需要调整的排班
      if (absentCount > 5) {
        adjustments.push({
          scheduleId: schedule.id,
          employeeId: schedule.employee_id,
          reason: `员工近期缺勤${absentCount}次,建议调整排班`,
          absentCount,
          priority: absentCount > 10 ? "high" : "medium",
        });
      }
    }

    return adjustments;
  }

  /**
   * 查找可用员工
   */
  private async findAvailableEmployees(
    platformId: string,
    deptId: string,
    date: string,
    shiftName: string,
  ) {
    const employees = await this.prisma.hr_employee.findMany({
      where: {
        platform_id: platformId,
        department_id: deptId,
        is_deleted: 0,
        status: 1,
      },
    });

    // 过滤掉已有排班的员工
    const dateObj = new Date(date);
    const existingSchedules = await this.prisma.attendance_schedule.findMany({
      where: {
        platform_id: platformId,
        dept_id: deptId,
        schedule_date: dateObj,
        is_deleted: 0,
      },
    });

    const scheduledEmployeeIds = new Set(
      existingSchedules.map((s) => s.employee_id),
    );

    return employees.filter((emp) => !scheduledEmployeeIds.has(emp.id));
  }

  /**
   * 评分替班候选人
   */
  private async rankReplacementCandidates(
    employees: any[],
    date: string,
    shiftName: string,
    absentEmployeeId: string,
  ) {
    const ranked: any[] = [];

    for (const emp of employees) {
      let score = 50;
      const reasons: any[] = [];

      // 基础评分逻辑
      // 1. 检查员工当月排班次数(排班少的优先)
      const monthStart = new Date(date);
      monthStart.setDate(1);
      const monthEnd = new Date(date);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);

      const monthScheduleCount = await this.prisma.attendance_schedule.count({
        where: {
          employee_id: emp.id,
          schedule_date: {
            gte: monthStart,
            lte: monthEnd,
          },
          is_deleted: 0,
        },
      });

      // 排班次数少的加分
      if (monthScheduleCount < 15) {
        score += 20;
        reasons.push("本月排班较少");
      } else if (monthScheduleCount > 25) {
        score -= 10;
        reasons.push("本月排班较多");
      }

      // 2. 检查最近缺勤记录(缺勤少的优先)
      const recentAbsent = await this.prisma.attendance_schedule.count({
        where: {
          employee_id: emp.id,
          schedule_date: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 最近30天
          },
          status: 0, // 假设0是缺勤或异常，根据项目实际逻辑
          is_deleted: 0,
        },
      });

      if (recentAbsent === 0) {
        score += 15;
        reasons.push("近期出勤良好");
      } else if (recentAbsent > 3) {
        score -= 15;
        reasons.push("近期缺勤较多");
      }

      // 3. 同部门优先
      if (emp.department_id === employees[0]?.department_id) {
        score += 10;
        reasons.push("同部门员工");
      }

      ranked.push({
        ...emp,
        score,
        reasons,
        availability: "available",
      });
    }

    return ranked.sort((a, b) => b.score - a.score);
  }

  /**
   * 通知调整
   */
  private async notifyAdjustments(adjustments: any[], reason: string) {
    for (const adjustment of adjustments) {
      await this.notifyScheduleChange(
        adjustment.employee_id,
        adjustment.date,
        "",
        adjustment.shift_name,
        reason,
      );
    }
  }
}
