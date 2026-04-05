import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { Permission } from '../../../common/permission.decorator';
import { QueryAttendanceRecordsDto } from '../dto/query-attendance-records.dto';
import { QueryAttendanceWorkflowsDto } from '../dto/query-attendance-workflows.dto';
import { UpsertAttendanceLeaveDto } from '../dto/upsert-attendance-leave.dto';
import { UpsertAttendanceOvertimeDto } from '../dto/upsert-attendance-overtime.dto';
import { UpsertAttendancePatchCardDto } from '../dto/upsert-attendance-patch-card.dto';
import { UpsertAttendanceScheduleChangeDto } from '../dto/upsert-attendance-schedule-change.dto';
import { AttendanceWorkflowsService } from '../services/attendance-workflows.service';

@Controller('attendance')
export class AttendanceWorkflowsController {
  constructor(private readonly attendanceWorkflowsService: AttendanceWorkflowsService) {}

  @Get('records')
  @Permission('attendance:record:list')
  listRecords(@CurrentUser() user: CurrentUserPayload, @Query() query: QueryAttendanceRecordsDto) {
    return this.attendanceWorkflowsService.listRecords(user.sub, query);
  }

  @Get('leaves')
  @Permission('attendance:leave:list')
  listLeaves(@CurrentUser() user: CurrentUserPayload, @Query() query: QueryAttendanceWorkflowsDto) {
    return this.attendanceWorkflowsService.listWorkflow('leave', user.sub, query);
  }

  @Post('leaves')
  @Permission('attendance:leave:create')
  createLeave(@CurrentUser() user: CurrentUserPayload, @Body() dto: UpsertAttendanceLeaveDto) {
    return this.attendanceWorkflowsService.createLeave(user.sub, dto);
  }

  @Patch('leaves/:id')
  @Permission('attendance:leave:update')
  updateLeave(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpsertAttendanceLeaveDto) {
    return this.attendanceWorkflowsService.updateLeave(user.sub, id, dto);
  }

  @Delete('leaves/:id')
  @Permission('attendance:leave:delete')
  removeLeave(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.attendanceWorkflowsService.removeLeave(user.sub, id);
  }

  @Get('overtimes')
  @Permission('attendance:overtime:list')
  listOvertimes(@CurrentUser() user: CurrentUserPayload, @Query() query: QueryAttendanceWorkflowsDto) {
    return this.attendanceWorkflowsService.listWorkflow('overtime', user.sub, query);
  }

  @Post('overtimes')
  @Permission('attendance:overtime:create')
  createOvertime(@CurrentUser() user: CurrentUserPayload, @Body() dto: UpsertAttendanceOvertimeDto) {
    return this.attendanceWorkflowsService.createOvertime(user.sub, dto);
  }

  @Patch('overtimes/:id')
  @Permission('attendance:overtime:update')
  updateOvertime(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpsertAttendanceOvertimeDto) {
    return this.attendanceWorkflowsService.updateOvertime(user.sub, id, dto);
  }

  @Delete('overtimes/:id')
  @Permission('attendance:overtime:delete')
  removeOvertime(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.attendanceWorkflowsService.removeOvertime(user.sub, id);
  }

  @Get('patch-cards')
  @Permission('attendance:patch-card:list')
  listPatchCards(@CurrentUser() user: CurrentUserPayload, @Query() query: QueryAttendanceWorkflowsDto) {
    return this.attendanceWorkflowsService.listWorkflow('patch-card', user.sub, query);
  }

  @Post('patch-cards')
  @Permission('attendance:patch-card:create')
  createPatchCard(@CurrentUser() user: CurrentUserPayload, @Body() dto: UpsertAttendancePatchCardDto) {
    return this.attendanceWorkflowsService.createPatchCard(user.sub, dto);
  }

  @Patch('patch-cards/:id')
  @Permission('attendance:patch-card:update')
  updatePatchCard(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpsertAttendancePatchCardDto) {
    return this.attendanceWorkflowsService.updatePatchCard(user.sub, id, dto);
  }

  @Delete('patch-cards/:id')
  @Permission('attendance:patch-card:delete')
  removePatchCard(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.attendanceWorkflowsService.removePatchCard(user.sub, id);
  }

  @Get('schedule-changes')
  @Permission('attendance:schedule-change:list')
  listScheduleChanges(@CurrentUser() user: CurrentUserPayload, @Query() query: QueryAttendanceWorkflowsDto) {
    return this.attendanceWorkflowsService.listWorkflow('schedule-change', user.sub, query);
  }

  @Post('schedule-changes')
  @Permission('attendance:schedule-change:create')
  createScheduleChange(@CurrentUser() user: CurrentUserPayload, @Body() dto: UpsertAttendanceScheduleChangeDto) {
    return this.attendanceWorkflowsService.createScheduleChange(user.sub, dto);
  }

  @Patch('schedule-changes/:id')
  @Permission('attendance:schedule-change:update')
  updateScheduleChange(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpsertAttendanceScheduleChangeDto
  ) {
    return this.attendanceWorkflowsService.updateScheduleChange(user.sub, id, dto);
  }

  @Delete('schedule-changes/:id')
  @Permission('attendance:schedule-change:delete')
  removeScheduleChange(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.attendanceWorkflowsService.removeScheduleChange(user.sub, id);
  }
}
