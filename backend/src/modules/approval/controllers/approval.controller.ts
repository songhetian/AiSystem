import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { Permission } from '../../../common/permission.decorator';
import { ApprovalService } from '../services/approval.service';
import { SaveApprovalTemplateDto } from '../dto/save-approval-template.dto';
import { QueryApprovalRequestsDto } from '../dto/query-approval-requests.dto';
import { ApprovalActionDto } from '../dto/approval-action.dto';

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

  @Patch('templates/:id')
  @Permission('approval:process:update')
  saveTemplate(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: SaveApprovalTemplateDto) {
    return this.approvalService.saveTemplate(user?.sub, id, dto);
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
