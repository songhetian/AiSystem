import { Injectable, NotFoundException } from '@nestjs/common';
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

function buildDashboardCacheKey(
  platformId: string | null | undefined,
  departmentId: string | undefined,
  startDate: Date,
  endDate: Date,
  page: number,
) {
  return `attendance:dashboard:${platformId || 'unknown'}:${departmentId || 'all'}:${formatDate(startDate)}:${formatDate(endDate)}:p${page}`;
}

function buildDashboardCachePattern(platformId?: string | null) {
  return `attendance:dashboard:${platformId || 'unknown'}:*`;
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly redisService: RedisService,
  ) {}

  async getDashboard(userId: string, query: QuerySchedulesDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const startDate = normalizeDate(query.start_date ?? new Date());
    const endDate = normalizeDate(query.end_date ?? new Date(startDate.getTime() + 6 * 86400000));
    const page = Number((query as any).current || 1);
    const pageSize = Number((query as any).pageSize || 50);

    const cacheKey = buildDashboardCacheKey(
      scope.platform_id,
      query.dept_id,
      startDate,
      endDate,
      page,
    );
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const employeeWhere: any = this.scopeService.applyScope(
      scope,
      {
        is_deleted: 0,
        ...(query.keyword
          ? {
              OR: [
                { name: { contains: query.keyword } },
                { employee_no: { contains: query.keyword } },
              ],
            }
          : {}),
      },
      { platform: 'platform_id', department: 'department_id' },
    );

    if (query.dept_id) {
      employeeWhere.department_id = query.dept_id;
    }

    const [employees, total] = await Promise.all([
      this.prisma.hr_employee.findMany({
        where: employeeWhere,
        orderBy: [{ department_id: 'asc' }, { employee_no: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.hr_employee.count({ where: employeeWhere }),
    ]);

    if (employees.length === 0) {
      return { days: [], rows: [], summary: { employee_count: 0 } };
    }

    const employeeIds = employees.map((employee) => employee.id);
    const [shifts, schedules, departments] = await Promise.all([
      this.listShifts(userId),
      this.prisma.attendance_schedule.findMany({
        where: {
          is_deleted: 0,
          employee_id: { in: employeeIds },
          schedule_date: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.biz_department.findMany({
        where: { id: { in: employees.map((employee) => employee.department_id!).filter(Boolean) } },
      }),
    ]);

    const departmentMap = new Map(departments.map((department) => [department.id, department.name]));
    const shiftMap = new Map(shifts.map((shift) => [shift.name, shift]));
    const scheduleMap = new Map(
      schedules.map((schedule) => [
        `${schedule.employee_id}:${formatDate(schedule.schedule_date)}`,
        schedule,
      ]),
    );

    const days: Array<{ key: string; label: string; weekday: string }> = [];
    const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const current = new Date(cursor);
      days.push({
        key: formatDate(current),
        label: `${current.getMonth() + 1}/${current.getDate()}`,
        weekday: weekdayLabels[current.getDay()],
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const rows = employees.map((employee) => ({
      employee_id: employee.id,
      employee_name: employee.name,
      employee_no: employee.employee_no,
      department_name: departmentMap.get(employee.department_id!) || 'Unassigned',
      schedules: days.map((day) => {
        const schedule = scheduleMap.get(`${employee.id}:${day.key}`);
        const shift = schedule ? shiftMap.get(schedule.shift_name) : null;
        return {
          date: day.key,
          schedule_id: schedule?.id,
          shift_name: schedule?.shift_name || null,
          shift_id: shift?.id || null,
          on_duty_time: shift?.on_duty_time || null,
          off_duty_time: shift?.off_duty_time || null,
        };
      }),
    }));

    const result = {
      days,
      rows,
      pagination: { total, page, pageSize },
      summary: { employee_count: total, scheduled_count: schedules.length },
      shifts,
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  async saveSchedule(userId: string, dto: SaveScheduleDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    let shift: { id: string; name: string } | null = null;

    if (dto.shift_id) {
      shift = await this.prisma.attendance_rule.findUnique({
        where: { id: dto.shift_id },
        select: { id: true, name: true },
      });
      if (!shift) {
        throw new NotFoundException('Shift not found');
      }
    }

    const employeeIds = [...new Set(dto.items.map((item) => item.employee_id))];
    const employees = await this.prisma.hr_employee.findMany({
      where: {
        id: { in: employeeIds },
        is_deleted: 0,
      },
      select: {
        id: true,
        platform_id: true,
        department_id: true,
      },
    });
    const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));

    let affected = 0;
    for (const item of dto.items) {
      const employee = employeeMap.get(item.employee_id);
      if (!employee) {
        throw new NotFoundException(`Employee ${item.employee_id} not found`);
      }

      this.scopeService.assertPlatformAccess(scope, employee.platform_id);
      this.scopeService.assertDepartmentAccess(scope, employee.department_id);

      const date = normalizeDate(item.schedule_date);
      await this.prisma.attendance_schedule.deleteMany({
        where: {
          employee_id: item.employee_id,
          schedule_date: date,
        },
      });

      if (shift) {
        await this.prisma.attendance_schedule.create({
          data: {
            employee_id: item.employee_id,
            schedule_date: date,
            shift_name: shift.name,
            platform_id: employee.platform_id || scope.platform_id,
            dept_id: employee.department_id || scope.dept_id,
          },
        });
        affected += 1;
      }
    }

    await this.redisService.deleteByPattern(buildDashboardCachePattern(scope.platform_id));
    return { success: true, affected };
  }

  async removeSchedule(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const result = await this.prisma.attendance_schedule.update({
      where: { id },
      data: { is_deleted: 1 },
    });
    await this.redisService.deleteByPattern(buildDashboardCachePattern(scope.platform_id));
    return result;
  }

  async importSchedules(userId: string, dto: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    const result = await this.prisma.attendance_schedule.createMany({ data: dto.rows });
    await this.redisService.deleteByPattern(buildDashboardCachePattern(scope.platform_id));
    return result;
  }

  async exportSchedules(_userId: string, _query: any) {
    const dashboard = await this.getDashboard(_userId, {
      ..._query,
      current: 1,
      pageSize: 5000,
    } as QuerySchedulesDto & { current: number; pageSize: number });

    return dashboard.rows.flatMap((row: any) =>
      (row.schedules || [])
        .filter((schedule: any) => schedule.shift_name)
        .map((schedule: any) => ({
          employee_id: row.employee_id,
          employee_name: row.employee_name,
          employee_no: row.employee_no,
          department_name: row.department_name,
          schedule_date: schedule.date,
          shift_id: schedule.shift_id,
          shift_name: schedule.shift_name,
          on_duty_time: schedule.on_duty_time,
          off_duty_time: schedule.off_duty_time,
        })),
    );
  }

  async getImportTemplate() {
    return { columns: ['employee_no', 'employee_name', 'department_name', 'schedule_date', 'shift_name'] };
  }

  async listShifts(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.attendance_rule.findMany({
      where: this.scopeService.applyScope(
        scope,
        { is_deleted: 0 },
        { platform: 'platform_id', department: 'dept_id' },
      ),
      orderBy: { on_duty_time: 'asc' },
    });
  }

  async createShift(userId: string, dto: CreateShiftDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const result = await this.prisma.attendance_rule.create({
      data: {
        ...dto,
        platform_id: scope.platform_id,
        dept_id: scope.dept_id,
      },
    });
    await this.redisService.deleteByPattern(buildDashboardCachePattern(scope.platform_id));
    return result;
  }

  async updateShift(userId: string, id: string, dto: UpdateShiftDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const result = await this.prisma.attendance_rule.update({
      where: { id },
      data: dto,
    });
    await this.redisService.deleteByPattern(buildDashboardCachePattern(scope.platform_id));
    return result;
  }

  async removeShift(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const result = await this.prisma.attendance_rule.update({
      where: { id },
      data: { is_deleted: 1 },
    });
    await this.redisService.deleteByPattern(buildDashboardCachePattern(scope.platform_id));
    return result;
  }
}
