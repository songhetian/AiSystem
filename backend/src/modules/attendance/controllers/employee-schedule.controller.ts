import { Controller, Get, Post, Delete, Body, Query, Param } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { EmployeeScheduleService } from '../services/employee-schedule.service';

@Controller('attendance/employee-schedule')
export class EmployeeScheduleController {
  constructor(private readonly service: EmployeeScheduleService) {}

  // 个人排班查看
  @Get('my-schedule')
  getMySchedule(
    @CurrentUser() user: CurrentUserPayload,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    return this.service.getMySchedule(user.sub, startDate, endDate);
  }

  // 排班偏好
  @Get('preference')
  getPreference(@Query('employee_id') empId: string) {
    return this.service.getPreference(empId);
  }

  @Post('preference')
  savePreference(
    @CurrentUser() user: CurrentUserPayload,
    @Body('employee_id') employeeId: string,
    @Body('preference') preference: any,
  ) {
    return this.service.savePreference(employeeId, preference);
  }

  // 调班申请
  @Post('swap-request')
  submitSwapRequest(@CurrentUser() user: CurrentUserPayload, @Body() body: any) {
    return this.service.submitSwapRequest(user.sub, body);
  }

  @Get('swap-requests')
  listSwapRequests(@CurrentUser() user: CurrentUserPayload) {
    return this.service.listMySwapRequests(user.sub);
  }

  // 排班反馈
  @Post('feedback')
  submitFeedback(@CurrentUser() user: CurrentUserPayload, @Body() body: any) {
    return this.service.submitFeedback(user.sub, body);
  }

  // 参数模板
  @Get('templates')
  listTemplates(@CurrentUser() user: CurrentUserPayload) {
    return this.service.listTemplates(user.sub);
  }

  @Post('templates')
  saveTemplate(@CurrentUser() user: CurrentUserPayload, @Body() body: { name: string; params: Record<string, any> }) {
    return this.service.saveTemplate(user.sub, body);
  }

  @Delete('templates/:id')
  deleteTemplate(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.service.deleteTemplate(user.sub, id);
  }

  // 管理端调班审批
  @Get('all-swap-requests')
  listAllSwapRequests(@CurrentUser() user: CurrentUserPayload) {
    return this.service.listAllSwapRequests(user.sub);
  }

  @Post('approve-swap-request')
  approveSwapRequest(@CurrentUser() user: CurrentUserPayload, @Body('id') id: string) {
    return this.service.approveSwapRequest(user.sub, id);
  }

  @Post('reject-swap-request')
  rejectSwapRequest(@CurrentUser() user: CurrentUserPayload, @Body('id') id: string) {
    return this.service.rejectSwapRequest(user.sub, id);
  }
}
