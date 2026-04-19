import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../../../common/current-user.decorator";
import { Permission } from "../../../common/permission.decorator";
import { RateLimit, RateLimitType } from "../../../common/decorators/rate-limiter.decorator";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { AntiShake } from "../../../common/decorators/antishake.decorator";
import { Idempotent } from "../../../common/decorators/idempotent.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";
import { CreateShiftDto } from "../dto/create-shift.dto";
import { ImportSchedulesDto } from "../dto/import-schedules.dto";
import { QuerySchedulesDto } from "../dto/query-schedules.dto";
import { SaveScheduleDto } from "../dto/save-schedule.dto";
import { UpdateShiftDto } from "../dto/update-shift.dto";
import { AttendanceSchedulesService } from "../services/attendance-schedules.service";

@Controller("attendance")
export class AttendanceSchedulesController {
  constructor(
    private readonly attendanceSchedulesService: AttendanceSchedulesService,
  ) {}

  @Get("shifts")
  @Permission("attendance:shift:list")
  @RateLimit({ limit: 30, window: 60, type: RateLimitType.USER })
  @Cache({ prefix: "attendance:shifts:list", ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  listShifts(@CurrentUser() user: CurrentUserPayload) {
    return this.attendanceSchedulesService.listShifts(user.sub);
  }

  @Post("shifts")
  @Permission("attendance:shift:create")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["attendance:shifts:*", "attendance:schedules:*"] })
  createShift(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateShiftDto,
  ) {
    return this.attendanceSchedulesService.createShift(user.sub, dto);
  }

  @Patch("shifts/:id")
  @Permission("attendance:shift:update")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["attendance:shifts:*", "attendance:schedules:*"] })
  updateShift(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: UpdateShiftDto,
  ) {
    return this.attendanceSchedulesService.updateShift(user.sub, id, dto);
  }

  @Delete("shifts/:id")
  @Permission("attendance:shift:delete")
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["attendance:shifts:*", "attendance:schedules:*"] })
  removeShift(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.attendanceSchedulesService.removeShift(user.sub, id);
  }

  @Get("schedules")
  @Permission("attendance:schedule:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "attendance:schedules:list", ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 300, timeout: 5000 })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QuerySchedulesDto,
  ) {
    return this.attendanceSchedulesService.getDashboard(user.sub, query);
  }

  @Post("schedules")
  @Permission("attendance:schedule:assign")
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["attendance:schedules:*", "attendance:records:*"] })
  saveSchedule(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SaveScheduleDto,
  ) {
    return this.attendanceSchedulesService.saveSchedule(user.sub, dto);
  }

  @Delete("schedules/:id")
  @Permission("attendance:schedule:assign")
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["attendance:schedules:*", "attendance:records:*"] })
  removeSchedule(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.attendanceSchedulesService.removeSchedule(user.sub, id);
  }

  @Post("schedules/import")
  @Permission("attendance:schedule:import")
  @AntiShake(2000)
  @RateLimit({ limit: 3, window: 60 })
  @CacheEvict({ keys: ["attendance:schedules:*", "attendance:records:*"] })
  importSchedules(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ImportSchedulesDto,
  ) {
    return this.attendanceSchedulesService.importSchedules(user.sub, dto);
  }

  @Get("schedules/export")
  @Permission("attendance:schedule:export")
  @RateLimit({ limit: 5, window: 60 })
  exportSchedules(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QuerySchedulesDto,
  ) {
    return this.attendanceSchedulesService.exportSchedules(user.sub, query);
  }

  @Get("schedules/template")
  @Permission("attendance:schedule:import")
  @RateLimit({ limit: 10, window: 60 })
  downloadTemplate() {
    return this.attendanceSchedulesService.getImportTemplate();
  }

  @Post("schedules/preferences")
  @Permission("attendance:schedule:list")
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  savePreferences(@CurrentUser() user: CurrentUserPayload, @Body() body: any) {
    return this.attendanceSchedulesService.saveEmployeePreferences(
      user.sub,
      body,
    );
  }

  @Get("schedules/preferences")
  @Permission("attendance:schedule:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "attendance:preferences", ttl: 300 })
  getPreferences(@CurrentUser() user: CurrentUserPayload) {
    return this.attendanceSchedulesService.getEmployeePreferences(user.sub);
  }

  @Post("schedules/change-requests")
  @Permission("attendance:schedule:list")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["attendance:schedules:*"] })
  createChangeRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: any,
  ) {
    return this.attendanceSchedulesService.createChangeRequest(user.sub, body);
  }

  @Get("schedules/change-requests")
  @Permission("attendance:schedule:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "attendance:change-requests", ttl: 300 })
  listChangeRequests(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: any,
  ) {
    return this.attendanceSchedulesService.listChangeRequests(user.sub, query);
  }

  @Get("rules/config")
  @Permission("attendance:shift:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "attendance:rules:config", ttl: 600 })
  getAttendanceConfig(@CurrentUser() user: CurrentUserPayload) {
    return this.attendanceSchedulesService.getAttendanceConfig(user.sub);
  }

  @Post("rules/config")
  @Permission("attendance:shift:create")
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["attendance:rules:*", "attendance:schedules:*"] })
  saveAttendanceConfig(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: any,
  ) {
    return this.attendanceSchedulesService.saveAttendanceConfig(user.sub, body);
  }
}
