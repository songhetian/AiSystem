import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScopeService } from '../../../common/services/scope.service';
import { QueryAttendanceRecordsDto } from '../dto/query-attendance-records.dto';

@Injectable()
export class AttendanceRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  /**
   * 计算打卡状态
   * @param actual 打卡时间
   * @param planned 计划时间 (HH:mm)
   * @param threshold 阈值 (分钟)
   * @param type 类型: 'on' 上班, 'off' 下班
   */
  private calculateStatus(actual: Date | null, planned: string, threshold: number, type: 'on' | 'off'): number {
    if (!actual) return 5; // 漏打卡

    const [p_hour, p_min] = planned.split(':').map(Number);
    const plannedDate = new Date(actual);
    plannedDate.setHours(p_hour, p_min, 0, 0);

    const diffMinutes = (actual.getTime() - plannedDate.getTime()) / (1000 * 60);

    if (type === 'on') {
      if (diffMinutes <= threshold) return 1; // 正常
      if (diffMinutes <= 120) return 2; // 迟到 (假设超过2小时算旷工)
      return 4; // 旷工
    } else {
      if (diffMinutes >= -threshold) return 1; // 正常
      return 3; // 早退
    }
  }

  async findAll(userId: string, query: QueryAttendanceRecordsDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const employeeWhere: any = this.scopeService.applyScope(
      scope,
      { is_deleted: 0 },
      { platform: 'platform_id', department: 'department_id' }
    );

    if (query.keyword) {
      employeeWhere.OR = [
        { name: { contains: query.keyword } },
        { employee_no: { contains: query.keyword } }
      ];
    }

    const employees = await this.prisma.hr_employee.findMany({
      where: employeeWhere,
      select: { id: true, name: true, employee_no: true, department_id: true }
    });

    if (employees.length === 0) return [];

    const records = await this.prisma.attendance_record.findMany({
      where: {
        is_deleted: 0,
        employee_id: { in: employees.map(e => e.id) },
        ...(query.start_date && query.end_date ? {
          attendance_date: {
            gte: new Date(query.start_date),
            lte: new Date(query.end_date)
          }
        } : {})
      },
      orderBy: { attendance_date: 'desc' }
    });

    const empMap = new Map(employees.map(e => [e.id, e]));
    return records.map(r => ({
      ...r,
      employee_name: empMap.get(r.employee_id)?.name,
      employee_no: empMap.get(r.employee_id)?.employee_no,
    }));
  }

  /**
   * 获取考勤统计报表
   */
  async getStatistics(userId: string, query: { month: string; dept_id?: string; platform_id?: string }) {
    const scope = await this.scopeService.resolveAccess(userId);
    const [year, month] = query.month.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const employeeWhere: any = this.scopeService.applyScope(
      scope,
      { is_deleted: 0 },
      { platform: 'platform_id', department: 'department_id' }
    );
    if (query.dept_id) employeeWhere.department_id = query.dept_id;

    const employees = await this.prisma.hr_employee.findMany({
      where: employeeWhere,
      select: { id: true, name: true, employee_no: true, department_id: true }
    });

    const records = await this.prisma.attendance_record.findMany({
      where: {
        is_deleted: 0,
        employee_id: { in: employees.map(e => e.id) },
        attendance_date: { gte: startDate, lte: endDate }
      }
    });

    // 分组统计
    const statsMap = new Map();
    employees.forEach(e => {
      statsMap.set(e.id, {
        employee_name: e.name,
        employee_no: e.employee_no,
        normal_days: 0,
        late_count: 0,
        early_count: 0,
        absent_days: 0,
        miss_count: 0,
        total_records: 0
      });
    });

    records.forEach(r => {
      const s = statsMap.get(r.employee_id);
      if (!s) return;
      s.total_records++;
      if (r.on_duty_status === 1 && r.off_duty_status === 1) s.normal_days++;
      if (r.on_duty_status === 2) s.late_count++;
      if (r.off_duty_status === 3) s.early_count++;
      if (r.on_duty_status === 4 || r.off_duty_status === 4) s.absent_days++;
      if (r.on_duty_status === 5 || r.off_duty_status === 5) s.miss_count++;
    });

    return Array.from(statsMap.values());
  }

  /**
   * 手动重新计算考勤状态 (纠偏)
   */
  async reCalculate(id: string) {
    const record = await this.prisma.attendance_record.findUnique({
      where: { id }
    });

    if (!record) throw new NotFoundException('记录不存在');

    // 查找排班和规则
    const schedule = await this.prisma.attendance_schedule.findFirst({
      where: {
        employee_id: record.employee_id,
        schedule_date: record.attendance_date,
        is_deleted: 0
      }
    });

    if (!schedule) return record;

    const rule = await this.prisma.attendance_rule.findFirst({
      where: {
        name: schedule.shift_name,
        is_deleted: 0
      }
    });

    if (!rule) return record;

    const onStatus = this.calculateStatus(
      record.actual_on_duty_time,
      rule.on_duty_time,
      rule.late_threshold,
      'on'
    );

    const offStatus = this.calculateStatus(
      record.actual_off_duty_time,
      rule.off_duty_time,
      rule.early_threshold,
      'off'
    );

    let exceptionType = '';
    if (onStatus !== 1) exceptionType += (onStatus === 2 ? '迟到' : onStatus === 4 ? '旷工' : '漏打卡');
    if (offStatus !== 1) exceptionType += (exceptionType ? ' / ' : '') + (offStatus === 3 ? '早退' : '漏打卡');

    return this.prisma.attendance_record.update({
      where: { id },
      data: {
        on_duty_status: onStatus,
        off_duty_status: offStatus,
        exception_type: exceptionType || null,
        scheduled_on_duty_time: rule.on_duty_time,
        scheduled_off_duty_time: rule.off_duty_time,
        shift_name: rule.name
      }
    });
  }
}
