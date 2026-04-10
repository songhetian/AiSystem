import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { Permission } from '../../../common/permission.decorator';
import { ApprovalActionDto } from '../dto/approval-action.dto';
import { QueryApprovalRequestsDto } from '../dto/query-approval-requests.dto';
import { SaveApprovalTemplateDto } from '../dto/save-approval-template.dto';
import { ApprovalService } from '../services/approval.service';

@Controller('approval')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Get('templates')
  @Permission('approval:process:list')
  listTemplates(@CurrentUser() user: CurrentUserPayload) {
    return this.approvalService.listTemplates(user?.sub);
  }

  @Get('templates/:id')
  @Permission('approval:process:list')
  getTemplate(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.approvalService.getTemplate(user?.sub, id);
  }

  @Post('templates')
  @Permission('approval:process:update')
  createTemplate(@CurrentUser() user: CurrentUserPayload, @Body() dto: SaveApprovalTemplateDto) {
    return this.approvalService.createTemplate(user?.sub, dto);
  }

  @Patch('templates/:id')
  @Permission('approval:process:update')
  saveTemplate(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: SaveApprovalTemplateDto) {
    return this.approvalService.saveTemplate(user?.sub, id, dto);
  }

  @Delete('templates/:id')
  @Permission('approval:process:update')
  deleteTemplate(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.approvalService.deleteTemplate(user?.sub, id);
  }

  @Get('people')
  @Permission('approval:request:list')
  listPeople(@CurrentUser() user: CurrentUserPayload) {
    return this.approvalService.listPeople(user?.sub);
  }

  @Get('requests')
  @Permission('approval:request:list')
  listRequests(@CurrentUser() user: CurrentUserPayload, @Query() query: QueryApprovalRequestsDto) {
    return this.approvalService.listRequests(user?.sub, query);
  }

  @Get('requests/stats')
  @Permission('approval:request:list')
  stats(@CurrentUser() user: CurrentUserPayload) {
    return this.approvalService.stats(user?.sub);
  }

  @Post('requests/:id/approve')
  @Permission('approval:request:approve')
  approveRequest(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: ApprovalActionDto) {
    return this.approvalService.approveRequest(user?.sub, id, dto);
  }

  @Post('requests/:id/reject')
  @Permission('approval:request:reject')
  rejectRequest(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: ApprovalActionDto) {
    return this.approvalService.rejectRequest(user?.sub, id, dto);
  }

  @Post('requests/:id/transfer')
  @Permission('approval:request:transfer')
  transferRequest(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: ApprovalActionDto) {
    return this.approvalService.transferRequest(user?.sub, id, dto);
  }
}
