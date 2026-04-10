import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScopeService } from '../../../common/services/scope.service';
import { RedisService } from '../../../common/services/redis.service';
import { BusinessLockService } from '../../../common/services/business-lock.service';
import { QueryAttendanceRecordsDto } from '../dto/query-attendance-records.dto';

@Injectable()
export class AttendanceRecordsService {
  private readonly logger = new Logger(AttendanceRecordsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly redisService: RedisService,
    private readonly businessLockService: BusinessLockService,
    @InjectQueue('attendance-queue') private readonly attendanceQueue: Queue,
  ) {}

  async clockIn(userId: string, data: { type: 'on' | 'off'; location?: string }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lockKey = `attendance:lock:${userId}:${today.getTime()}:${data.type}`;

    return this.businessLockService.runExclusive(lockKey, 5, async () => {
      let employeeId = await this.redisService.get(`user:employee:${userId}`);
      let employee: any;
      if (!employeeId) {
        employee = await this.prisma.hr_employee.findUnique({ where: { user_id: userId } });
        if (!employee) throw new NotFoundException('员工档案不存在');
        employeeId = employee.id;
        await this.redisService.set(`user:employee:${userId}`, employeeId as string, 3600);
      } else {
        employee = await this.prisma.hr_employee.findUnique({ where: { id: employeeId as string } });
      }

      let record = await this.prisma.attendance_record.findFirst({
        where: { employee_id: employee.id, attendance_date: today, is_deleted: 0 }
      });

      if (!record) {
        record = await this.prisma.attendance_record.create({
          data: {
            employee_id: employee.id,
            attendance_date: today,
            platform_id: employee.platform_id,
            dept_id: employee.department_id,
          }
        });
      }

      const updateData: any = {};
      if (data.type === 'on') {
        if (record.actual_on_duty_time) throw new BadRequestException('今日上班已打卡');
        updateData.actual_on_duty_time = new Date();
        updateData.on_duty_location = data.location;
      } else {
        updateData.actual_off_duty_time = new Date();
        updateData.off_duty_location = data.location;
      }
const updated = await this.prisma.attendance_record.update({
  where: { id: record.id },
  data: updateData
});

// 5. 异步队列化计算
await this.attendanceQueue.add('recalculate', { recordId: updated.id });

// 6. 修正统计缓存键 (YYYY-MM)
const monthKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
await this.redisService.del(`attendance:stats:${employee.platform_id}:${monthKey}`);

return updated;
});
}
  async findAll(userId: string, query: QueryAttendanceRecordsDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const { current = 1, pageSize = 20 } = query;
    const skip = (current - 1) * pageSize;

    const baseWhere: any = { is_deleted: 0 };
    if (query.start_date && query.end_date) {
        baseWhere.attendance_date = { gte: new Date(query.start_date), lte: new Date(query.end_date) };
    }
    if (query.keyword) {
        baseWhere.OR = [
              { hr_employee: { name: { contains: query.keyword } } },
              { hr_employee: { employee_no: { contains: query.keyword } } }
        ];
    }

    const where = this.scopeService.applyScope(
      scope,
      baseWhere,
      { platform: 'platform_id', department: 'dept_id' }
    );

    const [data, total] = await Promise.all([
      this.prisma.attendance_record.findMany({
        where: where as any,
        orderBy: { attendance_date: 'desc' },
        skip,
        take: pageSize
      }),
      this.prisma.attendance_record.count({ where: where as any })
    ]);

    return { data, total, current, pageSize };
  }

  async getStatistics(userId: string, query: { month: string; dept_id?: string; platform_id?: string }) {
    const scope = await this.scopeService.resolveAccess(userId);
    const cacheKey = `attendance:stats:${scope.platform_id}:${query.month}:${query.dept_id || 'all'}`;
    
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached as string);

    const [year, month] = query.month.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const employees = await this.prisma.hr_employee.findMany({
      where: this.scopeService.applyScope(
        scope, 
        { is_deleted: 0, department_id: query.dept_id } as any, 
        { platform: 'platform_id', department: 'department_id' }
      ),
      select: { id: true, name: true, employee_no: true }
    });

    const records = await this.prisma.attendance_record.findMany({
      where: {
        is_deleted: 0,
        employee_id: { in: employees.map(e => e.id) },
        attendance_date: { gte: startDate, lte: endDate }
      }
    });

    const stats = employees.map(e => {
      const empRecords = records.filter(r => r.employee_id === e.id);
      return {
        employee_name: e.name,
        employee_no: e.employee_no,
        normal_days: empRecords.filter(r => r.on_duty_status === 1 && r.off_duty_status === 1).length,
        late_count: empRecords.filter(r => r.on_duty_status === 2).length,
        early_count: empRecords.filter(r => r.off_duty_status === 3).length,
        absent_days: empRecords.filter(r => r.on_duty_status === 4 || r.off_duty_status === 4).length,
        miss_count: empRecords.filter(r => r.on_duty_status === 5 || r.off_duty_status === 5).length
      };
    });

    await this.redisService.set(cacheKey, JSON.stringify(stats), 600);
    return stats;
  }

  async reCalculate(id: string) {
    const record = await this.prisma.attendance_record.findUnique({ where: { id } });
    if (!record) return;

    const schedule = await this.prisma.attendance_schedule.findFirst({
      where: { employee_id: record.employee_id, schedule_date: record.attendance_date, is_deleted: 0 }
    });
    if (!schedule) return;

    const rule = await this.prisma.attendance_rule.findFirst({
      where: { name: schedule.shift_name, is_deleted: 0 }
    });
    if (!rule) return;

    const onStatus = this.calculateStatus(record.actual_on_duty_time, rule.on_duty_time, rule.late_threshold, rule.absenteeism_threshold, 'on');
    const offStatus = this.calculateStatus(record.actual_off_duty_time, rule.off_duty_time, rule.early_threshold, rule.absenteeism_threshold, 'off');

    let ex = '';
    if (onStatus !== 1) ex += (onStatus === 2 ? '迟到' : onStatus === 4 ? '旷工' : '漏打卡');
    if (offStatus !== 1) ex += (ex ? ' / ' : '') + (offStatus === 3 ? '早退' : '漏打卡');

    await this.prisma.attendance_record.update({
      where: { id },
      data: {
        on_duty_status: onStatus,
        off_duty_status: offStatus,
        exception_type: ex || null,
        scheduled_on_duty_time: rule.on_duty_time,
        scheduled_off_duty_time: rule.off_duty_time,
        shift_name: rule.name
      }
    });
  }

  private calculateStatus(actual: Date | null, planned: string, threshold: number, absenteeismThreshold: number, type: 'on' | 'off'): number {
    if (!actual) return 5;
    const [h, m] = planned.split(':').map(Number);
    const pDate = new Date(actual);
    pDate.setHours(h, m, 0, 0);
    const diff = (actual.getTime() - pDate.getTime()) / 60000;
    
    if (type === 'on') {
      if (diff <= threshold) return 1; // 正常
      if (diff <= absenteeismThreshold) return 2; // 迟到
      return 4; // 旷工
    } else {
      if (diff >= -threshold) return 1; // 正常
      return 3; // 早退
    }
  }
}