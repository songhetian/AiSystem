import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { ScopeService } from "../../../common/services/scope.service";
import { CheckCoverageDto } from "../dto/coverage.dto";

type TimeRange = {
  startMinute: number;
  endMinute: number;
  employeeId: string;
  shiftName: string;
};

function toMinuteOfDay(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function toFixedHours(minutes: number) {
  return (minutes / 60).toFixed(2);
}

function formatMinute(minute: number) {
  const normalized = ((minute % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (normalized % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function buildSegments(minutes: number[], kind: "missing" | "overlap") {
  if (minutes.length === 0) {
    return [];
  }

  const segments: Array<Record<string, unknown>> = [];
  let segmentStart = minutes[0];
  let previous = minutes[0];

  for (let index = 1; index <= minutes.length; index += 1) {
    const current = minutes[index];
    if (current !== previous + 1) {
      segments.push({
        start_time: formatMinute(segmentStart),
        end_time: formatMinute(previous + 1),
        duration_hours: toFixedHours(previous - segmentStart + 1),
        type: kind,
      });
      segmentStart = current;
    }
    previous = current;
  }

  return segments;
}

@Injectable()
export class CoverageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  private get scheduleDelegate() {
    return this.prisma[
      "attendance_schedule" as keyof typeof this.prisma
    ] as any;
  }

  async checkCoverage(userId: string, dto: CheckCoverageDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const shifts = await this.prisma.attendance_rule.findMany({
      where: {
        id: { in: dto.shift_ids },
        ...(scope.platform_id ? { platform_id: scope.platform_id } : {}),
        is_deleted: 0,
        status: 1,
      },
    });

    const shiftNames = shifts.map((s) => s.name);
    const windowStart = new Date(dto.start_time);
    const windowEnd = new Date(dto.end_time);
    const checkDate = new Date(dto.check_date);

    const windowStartMinute =
      windowStart.getHours() * 60 + windowStart.getMinutes();
    let windowEndMinute = windowEnd.getHours() * 60 + windowEnd.getMinutes();
    if (windowEnd <= windowStart) {
      windowEndMinute += 1440;
    }

    const totalMinutes = Math.max(0, windowEndMinute - windowStartMinute);
    const coverageCounter = new Array<number>(totalMinutes).fill(0);

    const scheduleWhere = this.scopeService.applyScope(
      scope,
      {
        is_deleted: 0,
        schedule_date: checkDate,
        shift_name: { in: shiftNames },
      },
      { platform: "platform_id", department: "dept_id" },
    );

    const schedules = await this.scheduleDelegate().findMany({
      where: scheduleWhere,
      select: {
        employee_id: true,
        shift_name: true,
      },
    });

    const shiftMap = new Map(
      shifts.map((shift) => [
        shift.name,
        {
          startMinute: toMinuteOfDay(shift.on_duty_time),
          endMinute: toMinuteOfDay(shift.off_duty_time),
        },
      ]),
    );

    const effectiveRanges: TimeRange[] = [];
    for (const schedule of schedules) {
      const shiftWindow = shiftMap.get(schedule.shift_name);
      if (!shiftWindow) {
        continue;
      }

      let shiftStartMinute = shiftWindow.startMinute;
      let shiftEndMinute = shiftWindow.endMinute;
      if (shiftEndMinute <= shiftStartMinute) {
        shiftEndMinute += 1440;
      }

      const overlapStart = Math.max(windowStartMinute, shiftStartMinute);
      const overlapEnd = Math.min(windowEndMinute, shiftEndMinute);
      if (overlapEnd <= overlapStart) {
        continue;
      }

      effectiveRanges.push({
        startMinute: overlapStart,
        endMinute: overlapEnd,
        employeeId: schedule.employee_id,
        shiftName: schedule.shift_name,
      });

      for (let minute = overlapStart; minute < overlapEnd; minute += 1) {
        coverageCounter[minute - windowStartMinute] += 1;
      }
    }

    const missingMinutes: number[] = [];
    const overlapMinutes: number[] = [];

    coverageCounter.forEach((count, offset) => {
      if (count === 0) {
        missingMinutes.push(windowStartMinute + offset);
      } else if (count > 1) {
        overlapMinutes.push(windowStartMinute + offset);
      }
    });

    const coveredMinutes = coverageCounter.filter((count) => count > 0).length;
    const overlapExtraMinutes = coverageCounter.reduce(
      (sum, count) => sum + Math.max(0, count - 1),
      0,
    );

    const missingDetails = buildSegments(missingMinutes, "missing");
    const overlappingDetails = buildSegments(overlapMinutes, "overlap");

    const record = await this.prisma.attendance_coverage_check.create({
      data: {
        check_date: checkDate,
        start_time: windowStart,
        end_time: windowEnd,
        checked_shift_ids: dto.shift_ids,
        checked_shift_names: shiftNames,
        total_coverage_hours: toFixedHours(coveredMinutes),
        missing_coverage_hours: toFixedHours(totalMinutes - coveredMinutes),
        overlapping_hours: toFixedHours(overlapExtraMinutes),
        missing_details: {
          windows: missingDetails,
          total_minutes: totalMinutes - coveredMinutes,
        } as any,
        overlapping_details: {
          windows: overlappingDetails,
          total_minutes: overlapExtraMinutes,
          matched_schedules: effectiveRanges,
        } as any,
        platform_id: scope.platform_id as string,
        dept_id: scope.dept_id as string,
      },
    });

    return record;
  }

  async getCoverageReports(
    userId: string,
    query: { start_date?: string; end_date?: string },
  ) {
    const scope = await this.scopeService.resolveAccess(userId);
    const where: any = this.scopeService.applyScope(
      scope,
      { is_deleted: 0 },
      { platform: "platform_id", department: "dept_id" },
    );

    if (query.start_date && query.end_date) {
      where.check_date = {
        gte: new Date(query.start_date),
        lte: new Date(query.end_date),
      };
    }

    return this.prisma.attendance_coverage_check.findMany({
      where,
      orderBy: { create_time: "desc" },
    });
  }
}
