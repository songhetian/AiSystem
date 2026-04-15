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
  listShifts(@CurrentUser() user: CurrentUserPayload) {
    return this.attendanceSchedulesService.listShifts(user.sub);
  }

  @Post("shifts")
  @Permission("attendance:shift:create")
  createShift(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateShiftDto,
  ) {
    return this.attendanceSchedulesService.createShift(user.sub, dto);
  }

  @Patch("shifts/:id")
  @Permission("attendance:shift:update")
  updateShift(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: UpdateShiftDto,
  ) {
    return this.attendanceSchedulesService.updateShift(user.sub, id, dto);
  }

  @Delete("shifts/:id")
  @Permission("attendance:shift:delete")
  removeShift(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.attendanceSchedulesService.removeShift(user.sub, id);
  }

  @Get("schedules")
  @Permission("attendance:schedule:list")
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QuerySchedulesDto,
  ) {
    return this.attendanceSchedulesService.getDashboard(user.sub, query);
  }

  @Post("schedules")
  @Permission("attendance:schedule:assign")
  saveSchedule(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SaveScheduleDto,
  ) {
    return this.attendanceSchedulesService.saveSchedule(user.sub, dto);
  }

  @Delete("schedules/:id")
  @Permission("attendance:schedule:assign")
  removeSchedule(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.attendanceSchedulesService.removeSchedule(user.sub, id);
  }

  @Post("schedules/import")
  @Permission("attendance:schedule:import")
  importSchedules(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ImportSchedulesDto,
  ) {
    return this.attendanceSchedulesService.importSchedules(user.sub, dto);
  }

  @Get("schedules/export")
  @Permission("attendance:schedule:export")
  exportSchedules(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QuerySchedulesDto,
  ) {
    return this.attendanceSchedulesService.exportSchedules(user.sub, query);
  }

  @Get("schedules/template")
  @Permission("attendance:schedule:import")
  downloadTemplate() {
    return this.attendanceSchedulesService.getImportTemplate();
  }

  // ✅ 新增：员工偏好提交（排班.md 3.7）
  @Post("schedules/preferences")
  @Permission("attendance:schedule:list")
  savePreferences(@CurrentUser() user: CurrentUserPayload, @Body() body: any) {
    return this.attendanceSchedulesService.saveEmployeePreferences(
      user.sub,
      body,
    );
  }

  @Get("schedules/preferences")
  @Permission("attendance:schedule:list")
  getPreferences(@CurrentUser() user: CurrentUserPayload) {
    return this.attendanceSchedulesService.getEmployeePreferences(user.sub);
  }

  // ✅ 新增：调班申请（排班.md 3.7）
  @Post("schedules/change-requests")
  @Permission("attendance:schedule:list")
  createChangeRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: any,
  ) {
    return this.attendanceSchedulesService.createChangeRequest(user.sub, body);
  }

  @Get("schedules/change-requests")
  @Permission("attendance:schedule:list")
  listChangeRequests(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: any,
  ) {
    return this.attendanceSchedulesService.listChangeRequests(user.sub, query);
  }

  // ✅ 新增：考勤规则配置（补充文档.md 模块3）
  @Get("rules/config")
  @Permission("attendance:shift:list")
  getAttendanceConfig(@CurrentUser() user: CurrentUserPayload) {
    return this.attendanceSchedulesService.getAttendanceConfig(user.sub);
  }

  @Post("rules/config")
  @Permission("attendance:shift:create")
  saveAttendanceConfig(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: any,
  ) {
    return this.attendanceSchedulesService.saveAttendanceConfig(user.sub, body);
  }
}
