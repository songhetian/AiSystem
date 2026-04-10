import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ScopeService } from '../../../common/services/scope.service';
import { RedisService } from '../../../common/services/redis.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { QuerySchedulesDto } from '../dto/query-schedules.dto';
import { SaveScheduleDto } from '../dto/save-schedule.dto';
import { UpdateShiftDto } from '../dto/update-shift.dto';

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function normalizeDate(value: string | Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export interface IAttendanceSchedulesService {
  getDashboard(userId: string, query: QuerySchedulesDto): Promise<any>;
  saveSchedule(userId: string, dto: SaveScheduleDto): Promise<any>;
  removeSchedule(userId: string, id: string): Promise<any>;
  importSchedules(userId: string, dto: any): Promise<any>;
  exportSchedules(userId: string, query: any): Promise<any>;
  getImportTemplate(): Promise<any>;
}

@Injectable()
export class AttendanceSchedulesService implements IAttendanceSchedulesService {
  private readonly logger = new Logger(AttendanceSchedulesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly redisService: RedisService
  ) {}

  async getDashboard(userId: string, query: QuerySchedulesDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const startDate = normalizeDate(query.start_date ?? new Date());
    const endDate = normalizeDate(query.end_date ?? new Date(startDate.getTime() + 6 * 86400000));
    const page = Number(query.current || 1);
    const pageSize = Number(query.pageSize || 50);

    const cacheKey = `attendance:dashboard:${scope.platform_id}:${query.dept_id || 'all'}:${formatDate(startDate)}:${formatDate(endDate)}:p${page}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached as string);

    const employeeWhere: any = this.scopeService.applyScope(scope, {
      is_deleted: 0,
      ...(query.keyword ? { OR: [{ name: { contains: query.keyword } }, { employee_no: { contains: query.keyword } }] } : {})
    }, { platform: 'platform_id', department: 'department_id' });

    if (query.dept_id) employeeWhere.department_id = query.dept_id;

    const [employees, total] = await Promise.all([
      this.prisma.hr_employee.findMany({
        where: employeeWhere,
        orderBy: [{ department_id: 'asc' }, { employee_no: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.hr_employee.count({ where: employeeWhere })
    ]);

    if (employees.length === 0) return { days: [], rows: [], summary: { employee_count: 0 } };

    const employeeIds = employees.map(e => e.id);
    const [shifts, schedules, departments] = await Promise.all([
      this.listShifts(userId),
      this.prisma.attendance_schedule.findMany({
        where: { is_deleted: 0, employee_id: { in: employeeIds }, schedule_date: { gte: startDate, lte: endDate } }
      }),
      this.prisma.biz_department.findMany({
        where: { id: { in: employees.map(e => e.department_id!).filter(Boolean) } }
      })
    ]);

    const deptMap = new Map(departments.map(d => [d.id, d.name]));
    const shiftMap = new Map(shifts.map(s => [s.name, s]));
    const scheduleMap = new Map(schedules.map(s => [`${s.employee_id}:${formatDate(s.schedule_date)}`, s]));

    const days = [];
    const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const d = new Date(cursor);
      days.push({ key: formatDate(d), label: `${d.getMonth() + 1}/${d.getDate()}`, weekday: weekdayLabels[d.getDay()] });
      cursor.setDate(cursor.getDate() + 1);
    }

    const rows = employees.map(e => ({
      employee_id: e.id,
      employee_name: e.name,
      employee_no: e.employee_no,
      department_name: deptMap.get(e.department_id!) || '未分配',
      schedules: days.map(d => {
        const sch = scheduleMap.get(`${e.id}:${d.key}`);
        const sh = sch ? shiftMap.get(sch.shift_name) : null;
        return {
          date: d.key,
          schedule_id: sch?.id,
          shift_name: sch?.shift_name || null,
          shift_id: sh?.id || null,
          on_duty_time: sh?.on_duty_time || null,
          off_duty_time: sh?.off_duty_time || null
        };
      })
    }));

    const result = {
      days,
      rows,
      pagination: { total, page, pageSize },
      summary: { employee_count: total, scheduled_count: schedules.length },
      shifts
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  async saveSchedule(userId: string, dto: SaveScheduleDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    let shift: any = null;
    if (dto.shift_id) {
      shift = await this.prisma.attendance_rule.findUnique({ where: { id: dto.shift_id } });
      if (!shift) throw new NotFoundException('班次不存在');
    }

    const results = await this.prisma.$transaction(
      dto.items.map(item => {
        const d = normalizeDate(item.schedule_date);
        return this.prisma.attendance_schedule.deleteMany({ where: { employee_id: item.employee_id, schedule_date: d } })
          .then(() => {
            if (shift) {
              return this.prisma.attendance_schedule.create({
                data: {
                  employee_id: item.employee_id,
                  schedule_date: d,
                  shift_name: shift.name,
                  platform_id: scope.platform_id,
                  dept_id: scope.dept_id
                }
              });
            }
          });
      })
    );
    return { success: true, affected: results.length };
  }

  async removeSchedule(userId: string, id: string) {
    return this.prisma.attendance_schedule.update({ where: { id }, data: { is_deleted: 1 } });
  }

  async importSchedules(userId: string, dto: any) {
    return this.prisma.attendance_schedule.createMany({ data: dto.rows });
  }

  async exportSchedules(userId: string, query: any) {
    return this.prisma.attendance_schedule.findMany({ where: { is_deleted: 0 } });
  }

  async getImportTemplate() {
    return { columns: ['employee_no', 'employee_name', 'department_name', 'schedule_date', 'shift_name'] };
  }

  async listShifts(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.attendance_rule.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id', department: 'dept_id' }),
      orderBy: { on_duty_time: 'asc' }
    });
  }
}
