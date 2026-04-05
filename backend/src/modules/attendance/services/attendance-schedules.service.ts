import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ScopeService } from '../../../common/services/scope.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { ImportSchedulesDto } from '../dto/import-schedules.dto';
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

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function csvEscape(value: string | number | null | undefined) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

@Injectable()
export class AttendanceSchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService
  ) {}

  async listShifts(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.attendance_rule.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id', department: 'dept_id' }),
      orderBy: [{ status: 'desc' }, { on_duty_time: 'asc' }, { create_time: 'desc' }]
    });
  }

  async createShift(userId: string, dto: CreateShiftDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const platformId = dto.platform_id ?? scope.platform_id ?? undefined;
    const deptId = dto.dept_id ?? scope.dept_id ?? undefined;
    this.scopeService.assertPlatformAccess(scope, platformId);
    this.scopeService.assertDepartmentAccess(scope, deptId);

    return this.prisma.attendance_rule.create({
      data: {
        ...dto,
        platform_id: platformId,
        dept_id: deptId,
        status: dto.status ?? 1,
        late_threshold: dto.late_threshold ?? 0,
        early_threshold: dto.early_threshold ?? 0,
        absenteeism_threshold: dto.absenteeism_threshold ?? 0
      }
    });
  }

  async updateShift(userId: string, id: string, dto: UpdateShiftDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.attendance_rule.findUnique({ where: { id } });
    if (!current || current.is_deleted) {
      throw new NotFoundException('班次不存在');
    }

    const platformId = dto.platform_id ?? current.platform_id ?? undefined;
    const deptId = dto.dept_id ?? current.dept_id ?? undefined;
    this.scopeService.assertPlatformAccess(scope, current.platform_id);
    this.scopeService.assertDepartmentAccess(scope, current.dept_id);
    this.scopeService.assertPlatformAccess(scope, platformId);
    this.scopeService.assertDepartmentAccess(scope, deptId);

    return this.prisma.attendance_rule.update({
      where: { id },
      data: {
        ...dto,
        platform_id: platformId,
        dept_id: deptId
      }
    });
  }

  async removeShift(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.attendance_rule.findUnique({ where: { id } });
    if (!current || current.is_deleted) {
      throw new NotFoundException('班次不存在');
    }

    this.scopeService.assertPlatformAccess(scope, current.platform_id);
    this.scopeService.assertDepartmentAccess(scope, current.dept_id);

    return this.prisma.attendance_rule.update({
      where: { id },
      data: { is_deleted: 1, status: 0 }
    });
  }

  async getDashboard(userId: string, query: QuerySchedulesDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const startDate = normalizeDate(query.start_date ?? new Date());
    const endDate = normalizeDate(query.end_date ?? addDays(startDate, 6));

    if (endDate < startDate) {
      throw new BadRequestException('结束日期必须晚于开始日期');
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
                { job_no: { contains: query.keyword } }
              ]
            }
          : {})
      },
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

    const [employees, departments, shifts, schedules] = await Promise.all([
      this.prisma.hr_employee.findMany({
        where: employeeWhere,
        orderBy: [{ department_id: 'asc' }, { employee_no: 'asc' }, { create_time: 'asc' }]
      }),
      this.prisma.biz_department.findMany({
        where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id', department: 'id' })
      }),
      this.listShifts(userId),
      this.prisma.attendance_schedule.findMany({
        where: this.scopeService.applyScope(
          scope,
          { is_deleted: 0, schedule_date: { gte: startDate, lte: endDate } },
          { platform: 'platform_id', department: 'dept_id' }
        ),
        orderBy: [{ schedule_date: 'asc' }, { create_time: 'asc' }]
      })
    ]);

    const employeeIds = new Set<string>(employees.map((item) => item.id));
    const departmentMap = new Map<string, string>(departments.map((item) => [item.id, item.name]));
    const shiftMap = new Map<string, any>(shifts.map((item) => [item.name, item]));
    const scheduleMap = new Map<string, any>();

    for (const schedule of schedules) {
      if (employeeIds.has(schedule.employee_id)) {
        scheduleMap.set(`${schedule.employee_id}:${formatDate(schedule.schedule_date)}`, schedule);
      }
    }

    const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days: Array<{ key: string; label: string; weekday: string }> = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      days.push({
        key: formatDate(cursor),
        label: `${cursor.getMonth() + 1}/${cursor.getDate()}`,
        weekday: weekdayLabels[cursor.getDay()]
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const rows = employees.map((employee) => ({
      employee_id: employee.id,
      employee_name: employee.name,
      employee_no: employee.employee_no,
      department_id: employee.department_id,
      department_name: employee.department_id ? departmentMap.get(employee.department_id) ?? 'Unassigned' : 'Unassigned',
      platform_id: employee.platform_id,
      schedules: days.map((day) => {
        const schedule = scheduleMap.get(`${employee.id}:${day.key}`);
        const shift = schedule ? shiftMap.get(schedule.shift_name) : undefined;
        return {
          date: day.key,
          schedule_id: schedule?.id,
          shift_name: schedule?.shift_name ?? null,
          shift_id: shift?.id ?? null,
          on_duty_time: shift?.on_duty_time ?? null,
          off_duty_time: shift?.off_duty_time ?? null
        };
      })
    }));

    return {
      range: { start_date: formatDate(startDate), end_date: formatDate(endDate) },
      summary: {
        employee_count: rows.length,
        shift_count: shifts.length,
        scheduled_count: Array.from(scheduleMap.values()).length,
        rest_count: rows.length * days.length - Array.from(scheduleMap.values()).length
      },
      shifts: shifts.map((item) => ({
        ...item,
        usage_count: schedules.filter((schedule) => schedule.shift_name === item.name).length
      })),
      days,
      rows
    };
  }

  async saveSchedule(userId: string, dto: SaveScheduleDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    if (dto.items.length === 0) {
      throw new BadRequestException('未提供排班数据');
    }

    let shift: Awaited<ReturnType<typeof this.prisma.attendance_rule.findUnique>> | null = null;
    if (dto.shift_id) {
      shift = await this.prisma.attendance_rule.findUnique({ where: { id: dto.shift_id } });
      if (!shift || shift.is_deleted) {
        throw new NotFoundException('班次不存在');
      }
      this.scopeService.assertPlatformAccess(scope, shift.platform_id);
      this.scopeService.assertDepartmentAccess(scope, shift.dept_id);
    }

    const employeeIds = [...new Set(dto.items.map((item) => item.employee_id))];
    const employees = await this.prisma.hr_employee.findMany({
      where: { id: { in: employeeIds }, is_deleted: 0 }
    });

    if (employees.length !== employeeIds.length) {
      throw new BadRequestException('部分员工不存在');
    }

    const employeeMap = new Map<string, any>(employees.map((item) => [item.id, item]));
    const results: any[] = [];
    for (const item of dto.items) {
      const employee = employeeMap.get(item.employee_id);
      if (!employee) continue;

      this.scopeService.assertPlatformAccess(scope, employee.platform_id);
      this.scopeService.assertDepartmentAccess(scope, employee.department_id);

      const scheduleDate = normalizeDate(item.schedule_date);
      const existing = await this.prisma.attendance_schedule.findFirst({
        where: { is_deleted: 0, employee_id: employee.id, schedule_date: scheduleDate }
      });

      if (!shift) {
        if (existing) {
          results.push(await this.prisma.attendance_schedule.update({ where: { id: existing.id }, data: { is_deleted: 1 } }));
        }
        continue;
      }

      if (existing) {
        results.push(
          await this.prisma.attendance_schedule.update({
            where: { id: existing.id },
            data: { shift_name: shift.name, platform_id: employee.platform_id, dept_id: employee.department_id, is_deleted: 0 }
          })
        );
        continue;
      }

      results.push(
        await this.prisma.attendance_schedule.create({
          data: {
            employee_id: employee.id,
            schedule_date: scheduleDate,
            shift_name: shift.name,
            platform_id: employee.platform_id,
            dept_id: employee.department_id
          }
        })
      );
    }

    return { success: true, affected: results.length };
  }

  async removeSchedule(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.attendance_schedule.findUnique({ where: { id } });
    if (!current || current.is_deleted) {
      throw new NotFoundException('排班记录不存在');
    }

    this.scopeService.assertPlatformAccess(scope, current.platform_id);
    this.scopeService.assertDepartmentAccess(scope, current.dept_id);

    return this.prisma.attendance_schedule.update({
      where: { id },
      data: { is_deleted: 1 }
    });
  }

  async importSchedules(userId: string, dto: ImportSchedulesDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const shifts = await this.listShifts(userId);
    const shiftMap = new Map<string, any>(shifts.map((item) => [item.name.trim(), item]));
    const employees = await this.prisma.hr_employee.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id', department: 'department_id' })
    });
    const departments = await this.prisma.biz_department.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id', department: 'id' })
    });

    const departmentMap = new Map<string, string>(departments.map((item) => [item.id, item.name]));
    const employeeByNo = new Map<string, any>(employees.filter((item) => item.employee_no).map((item) => [item.employee_no!, item]));
    const employeeByName = new Map<string, any>(
      employees.map((item) => [`${item.name}:${departmentMap.get(item.department_id ?? '') ?? ''}`, item])
    );

    const errors: string[] = [];
    let successCount = 0;
    for (const [index, row] of dto.rows.entries()) {
      const shift = shiftMap.get(row.shift_name.trim());
      if (!shift) {
        errors.push(`Row ${index + 1}: shift not found -> ${row.shift_name}`);
        continue;
      }

      const employee =
        (row.employee_no ? employeeByNo.get(row.employee_no.trim()) : undefined) ??
        (row.employee_name ? employeeByName.get(`${row.employee_name.trim()}:${row.department_name?.trim() ?? ''}`) : undefined);

      if (!employee) {
        errors.push(`Row ${index + 1}: employee not found`);
        continue;
      }

      const scheduleDate = normalizeDate(row.schedule_date);
      const existing = await this.prisma.attendance_schedule.findFirst({
        where: { is_deleted: 0, employee_id: employee.id, schedule_date: scheduleDate }
      });

      if (existing) {
        await this.prisma.attendance_schedule.update({
          where: { id: existing.id },
          data: { shift_name: shift.name, platform_id: employee.platform_id, dept_id: employee.department_id }
        });
      } else {
        await this.prisma.attendance_schedule.create({
          data: {
            employee_id: employee.id,
            schedule_date: scheduleDate,
            shift_name: shift.name,
            platform_id: employee.platform_id,
            dept_id: employee.department_id
          }
        });
      }

      successCount += 1;
    }

    return { success: errors.length === 0, imported: successCount, failed: errors.length, errors };
  }

  async exportSchedules(userId: string, query: QuerySchedulesDto) {
    const dashboard = await this.getDashboard(userId, query);
    const shiftMap = new Map<string, any>(dashboard.shifts.map((item) => [item.name, item]));
    const lines = [['date', 'employee_no', 'employee_name', 'department', 'shift_name', 'on_duty', 'off_duty'].map(csvEscape).join(',')];

    for (const row of dashboard.rows) {
      for (const schedule of row.schedules) {
        if (!schedule.shift_name) continue;
        const shift = shiftMap.get(schedule.shift_name);
        lines.push(
          [schedule.date, row.employee_no ?? '', row.employee_name, row.department_name, schedule.shift_name, shift?.on_duty_time ?? '', shift?.off_duty_time ?? '']
            .map(csvEscape)
            .join(',')
        );
      }
    }

    return {
      filename: `attendance-schedules-${dashboard.range.start_date}-${dashboard.range.end_date}.csv`,
      content: lines.join('\n')
    };
  }

  getImportTemplate() {
    return {
      filename: 'attendance-schedules-template.csv',
      content: ['employee_no,employee_name,department_name,schedule_date,shift_name', 'EMP001,Alex,Support,2026-04-06,Morning Shift'].join('\n')
    };
  }
}
