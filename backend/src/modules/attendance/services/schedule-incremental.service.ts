import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScheduleAlgorithmService } from './schedule-algorithm.service';
import { EmployeeScheduleService, type SchedulePreference } from './employee-schedule.service';

/**
 * 增量排班服务 (V4.0 中期优化)
 * 
 * 功能：
 * 1. 只更新变化的部分，避免全量重新生成
 * 2. 支持局部调整（单个员工、单个日期、单个班次）
 * 3. 自动检测冲突并解决
 * 4. 保持整体排班的一致性
 */
@Injectable()
export class ScheduleIncrementalService {
  private readonly logger = new Logger(ScheduleIncrementalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleAlgorithmService: ScheduleAlgorithmService,
    private readonly employeeScheduleService: EmployeeScheduleService,
  ) {}

  /**
   * 增量更新排班 - 单个员工调整
   */
  async updateEmployeeSchedule(
    userId: string,
    employeeId: string,
    date: string,
    newShiftName: string,
    config: any
  ) {
    this.logger.log(`增量更新排班: 员工=${employeeId}, 日期=${date}, 新班次=${newShiftName}`);

    // 1. 获取当前排班
    const currentSchedule = await this.prisma.attendance_schedule.findFirst({
      where: {
        employee_id: employeeId,
        schedule_date: new Date(date),
        is_deleted: 0,
      },
    });

    // 2. 检测冲突
    const conflicts = await this.detectConflicts(employeeId, date, newShiftName, config);

    if (conflicts.length > 0) {
      return {
        success: false,
        conflicts,
        message: '检测到冲突，请先解决冲突',
      };
    }

    // 3. 更新排班
    if (currentSchedule) {
      await this.prisma.attendance_schedule.update({
        where: { id: currentSchedule.id },
        data: {
          shift_name: newShiftName,
          update_time: new Date(),
        },
      });
    } else {
      const employee = await this.prisma.hr_employee.findUnique({
        where: { id: employeeId },
      });

      await this.prisma.attendance_schedule.create({
        data: {
          employee_id: employeeId,
          schedule_date: new Date(date),
          shift_name: newShiftName,
          dept_id: employee?.department_id || '',
          platform_id: employee?.platform_id || '',
          status: 0,
        },
      });
    }

    return {
      success: true,
      message: '排班更新成功',
    };
  }

  /**
   * 增量更新排班 - 批量调整
   */
  async batchUpdateSchedules(
    userId: string,
    updates: Array<{
      employee_id: string;
      date: string;
      shift_name: string;
    }>,
    config: any
  ) {
    this.logger.log(`批量增量更新排班: ${updates.length} 条记录`);

    const results = [];
    const conflicts = [];

    // 1. 检测所有冲突
    for (const update of updates) {
      const itemConflicts = await this.detectConflicts(
        update.employee_id,
        update.date,
        update.shift_name,
        config
      );

      if (itemConflicts.length > 0) {
        conflicts.push({
          ...update,
          conflicts: itemConflicts,
        });
      }
    }

    if (conflicts.length > 0) {
      return {
        success: false,
        conflicts,
        message: `检测到 ${conflicts.length} 个冲突`,
      };
    }

    // 2. 批量更新
    await this.prisma.$transaction(async (tx) => {
      for (const update of updates) {
        const currentSchedule = await tx.attendance_schedule.findFirst({
          where: {
            employee_id: update.employee_id,
            schedule_date: new Date(update.date),
            is_deleted: 0,
          },
        });

        if (currentSchedule) {
          await tx.attendance_schedule.update({
            where: { id: currentSchedule.id },
            data: {
              shift_name: update.shift_name,
              update_time: new Date(),
            },
          });
        } else {
          const employee = await tx.hr_employee.findUnique({
            where: { id: update.employee_id },
          });

          await tx.attendance_schedule.create({
            data: {
              employee_id: update.employee_id,
              schedule_date: new Date(update.date),
              shift_name: update.shift_name,
              dept_id: employee?.department_id || '',
              platform_id: employee?.platform_id || '',
              status: 0,
            },
          });
        }

        results.push({
          employee_id: update.employee_id,
          date: update.date,
          success: true,
        });
      }
    });

    return {
      success: true,
      updated: results.length,
      message: `成功更新 ${results.length} 条排班`,
    };
  }

  /**
   * 智能补班 - 自动填充缺口
   */
  async autoFillGaps(
    userId: string,
    deptId: string,
    startDate: string,
    endDate: string,
    config: any
  ) {
    this.logger.log(`智能补班: 部门=${deptId}, 周期=${startDate}~${endDate}`);

    // 1. 获取当前排班
    const currentSchedules = await this.prisma.attendance_schedule.findMany({
      where: {
        dept_id: deptId,
        schedule_date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        is_deleted: 0,
      },
    });

    // 2. 获取人力需求
    const demands = await this.prisma.attendance_staffing_demand.findMany({
      where: {
        dept_id: deptId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        is_deleted: 0,
      },
    });

    // 3. 计算缺口
    const gaps = [];
    for (const demand of demands) {
      const dateStr = demand.date.toISOString().split('T')[0];
      const currentCount = currentSchedules.filter(
        s => s.schedule_date.toISOString().split('T')[0] === dateStr &&
             s.shift_name === demand.shift_name
      ).length;

      if (currentCount < demand.required_count) {
        gaps.push({
          date: dateStr,
          shift_name: demand.shift_name,
          required: demand.required_count,
          current: currentCount,
          gap: demand.required_count - currentCount,
        });
      }
    }

    if (gaps.length === 0) {
      return {
        success: true,
        message: '无需补班，当前排班已满足需求',
        gaps: [],
      };
    }

    // 4. 获取可用员工
    const employees = await this.prisma.hr_employee.findMany({
      where: {
        department_id: deptId,
        is_deleted: 0,
        status: 1,
      },
    });

    const preferencesMap = await this.employeeScheduleService.getPreferencesBatch(
      employees.map(e => e.id)
    );

    // 5. 智能填充
    const fills = [];
    for (const gap of gaps) {
      const candidates = await this.findBestCandidates(
        employees,
        gap.date,
        gap.shift_name,
        gap.gap,
        currentSchedules,
        preferencesMap,
        config
      );

      for (const candidate of candidates) {
        fills.push({
          employee_id: candidate.id,
          employee_name: candidate.name,
          date: gap.date,
          shift_name: gap.shift_name,
          score: candidate.score,
        });
      }
    }

    // 6. 应用补班
    if (fills.length > 0) {
      await this.batchUpdateSchedules(userId, fills.map(f => ({
        employee_id: f.employee_id,
        date: f.date,
        shift_name: f.shift_name,
      })), config);
    }

    return {
      success: true,
      gaps,
      fills,
      message: `成功补班 ${fills.length} 条记录`,
    };
  }

  /**
   * 检测冲突
   */
  private async detectConflicts(
    employeeId: string,
    date: string,
    shiftName: string,
    config: any
  ): Promise<string[]> {
    const conflicts: string[] = [];
    const dateObj = new Date(date);

    // 1. 检查是否已有排班
    const existingSchedule = await this.prisma.attendance_schedule.findFirst({
      where: {
        employee_id: employeeId,
        schedule_date: dateObj,
        is_deleted: 0,
      },
    });

    if (existingSchedule && existingSchedule.shift_name !== shiftName) {
      conflicts.push(`该员工在 ${date} 已有排班: ${existingSchedule.shift_name}`);
    }

    // 2. 检查连续工作天数
    const weekStart = new Date(dateObj);
    weekStart.setDate(weekStart.getDate() - 7);

    const recentSchedules = await this.prisma.attendance_schedule.findMany({
      where: {
        employee_id: employeeId,
        schedule_date: {
          gte: weekStart,
          lt: dateObj,
        },
        is_deleted: 0,
      },
      orderBy: { schedule_date: 'desc' },
    });

    let consecutiveDays = 0;
    for (let i = 0; i < recentSchedules.length; i++) {
      const scheduleDate = new Date(recentSchedules[i].schedule_date);
      const prevDate = new Date(dateObj);
      prevDate.setDate(prevDate.getDate() - (i + 1));

      if (scheduleDate.toISOString().split('T')[0] === prevDate.toISOString().split('T')[0]) {
        consecutiveDays++;
      } else {
        break;
      }
    }

    const maxConsecutiveDays = config.max_consecutive_days || 6;
    if (consecutiveDays >= maxConsecutiveDays) {
      conflicts.push(`连续工作天数超限: ${consecutiveDays + 1} 天 (最大 ${maxConsecutiveDays} 天)`);
    }

    // 3. 检查周工时
    const weekStartDate = new Date(dateObj);
    weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay());

    const weekSchedules = await this.prisma.attendance_schedule.findMany({
      where: {
        employee_id: employeeId,
        schedule_date: {
          gte: weekStartDate,
          lt: dateObj,
        },
        is_deleted: 0,
      },
    });

    const weekHours = weekSchedules.length * 8; // 简化计算
    const maxWeekHours = config.max_hours_per_week || 40;

    if (weekHours + 8 > maxWeekHours) {
      conflicts.push(`周工时超限: ${weekHours + 8} 小时 (最大 ${maxWeekHours} 小时)`);
    }

    // 4. 检查员工偏好
    const preferences = await this.employeeScheduleService.getPreferencesBatch([employeeId]);
    const pref = preferences.get(employeeId);

    if (pref) {
      const dayOfWeek = dateObj.getDay();
      if (pref.avoid_weekdays?.includes(dayOfWeek)) {
        conflicts.push(`员工偏好避开该工作日: ${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dayOfWeek]}`);
      }

      if (pref.avoid_shifts?.some(s => shiftName.includes(s))) {
        conflicts.push(`员工偏好避开该班次: ${shiftName}`);
      }
    }

    return conflicts;
  }

  /**
   * 查找最佳候选人
   */
  private async findBestCandidates(
    employees: any[],
    date: string,
    shiftName: string,
    count: number,
    currentSchedules: any[],
    preferencesMap: Map<string, SchedulePreference>,
    config: any
  ): Promise<Array<{ id: string; name: string; score: number }>> {
    const dateObj = new Date(date);
    const candidates = [];

    for (const emp of employees) {
      // 检查是否已排班
      const hasSchedule = currentSchedules.some(
        s => s.employee_id === emp.id &&
             s.schedule_date.toISOString().split('T')[0] === date
      );

      if (hasSchedule) continue;

      // 计算得分
      let score = 50;
      const pref = preferencesMap.get(emp.id);

      if (pref) {
        const dayOfWeek = dateObj.getDay();
        if (pref.avoid_weekdays?.includes(dayOfWeek)) score -= 30;
        if (pref.avoid_shifts?.some(s => shiftName.includes(s))) score -= 20;
        if (pref.prefer_shifts?.some(s => shiftName.includes(s))) score += 30;
      }

      // 公平性考虑
      const empScheduleCount = currentSchedules.filter(s => s.employee_id === emp.id).length;
      const avgScheduleCount = currentSchedules.length / employees.length;
      if (empScheduleCount < avgScheduleCount) score += 10;

      candidates.push({
        id: emp.id,
        name: emp.name,
        score: Math.max(0, Math.min(100, score)),
      });
    }

    // 按得分排序，返回前N个
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
  }
}
