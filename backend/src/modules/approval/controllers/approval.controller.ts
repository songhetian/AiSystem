import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../../../common/current-user.decorator";
import { Permission } from "../../../common/permission.decorator";
import { AntiShake } from "../../../common/decorators/antishake.decorator";
import { Idempotent } from "../../../common/decorators/idempotent.decorator";
import {
  RateLimit,
  RateLimitType,
} from "../../../common/decorators/rate-limiter.decorator";
import { ApprovalActionDto } from "../dto/approval-action.dto";
import { QueryApprovalRequestsDto } from "../dto/query-approval-requests.dto";
import { SaveApprovalTemplateDto } from "../dto/save-approval-template.dto";
import { ApprovalService } from "../services/approval.service";
import { Response } from "express";

@ApiTags("审批管理")
@ApiBearerAuth()
@Controller("approval")
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Get("templates")
  @ApiOperation({
    summary: "获取审批模板列表",
    description: "查询所有可用的审批流程模板",
  })
  @ApiResponse({ status: 200, description: "成功返回审批模板列表" })
  @Permission("approval:process:list")
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  listTemplates(@CurrentUser() user: CurrentUserPayload) {
    return this.approvalService.listTemplates(user?.sub);
  }

  @Get("templates/:id")
  @ApiOperation({
    summary: "获取审批模板详情",
    description: "根据ID获取审批模板的详细配置",
  })
  @ApiResponse({ status: 200, description: "成功返回审批模板详情" })
  @ApiResponse({ status: 404, description: "审批模板不存在" })
  @Permission("approval:process:list")
  @RateLimit({ type: RateLimitType.USER, limit: 50, window: 60 })
  getTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.approvalService.getTemplate(user?.sub, id);
  }

  @Post("templates")
  @ApiOperation({
    summary: "创建审批模板",
    description: "创建新的审批流程模板",
  })
  @ApiResponse({ status: 201, description: "审批模板创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @Permission("approval:process:update")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  createTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SaveApprovalTemplateDto,
  ) {
    return this.approvalService.createTemplate(user?.sub, dto);
  }

  @Patch("templates/:id")
  @Permission("approval:process:update")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  saveTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: SaveApprovalTemplateDto,
  ) {
    return this.approvalService.saveTemplate(user?.sub, id, dto);
  }

  @Delete("templates/:id")
  @Permission("approval:process:update")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  deleteTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.approvalService.deleteTemplate(user?.sub, id);
  }

  @Post("templates/:id/duplicate")
  @Permission("approval:process:update")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  duplicateTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.approvalService.duplicateTemplate(user?.sub, id);
  }

  @Get("people")
  @Permission("approval:request:list")
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  listPeople(@CurrentUser() user: CurrentUserPayload) {
    return this.approvalService.listPeople(user?.sub);
  }

  @Get("requests")
  @Permission("approval:request:list")
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  listRequests(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryApprovalRequestsDto,
  ) {
    return this.approvalService.listRequests(user?.sub, query);
  }

  @Get("requests/stats")
  @Permission("approval:request:list")
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  stats(@CurrentUser() user: CurrentUserPayload) {
    return this.approvalService.stats(user?.sub);
  }

  @Get("requests/export")
  @Permission("approval:request:export")
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 60 })
  async exportRequests(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryApprovalRequestsDto,
    @Res() res: Response,
  ) {
    const buffer = await this.approvalService.exportRequests(user?.sub, query);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=approval_requests_${Date.now()}.xlsx`,
    );
    res.end(buffer);
  }

  @Get("requests/:id")
  @Permission("approval:request:detail")
  @RateLimit({ type: RateLimitType.USER, limit: 50, window: 60 })
  getRequest(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.approvalService.getRequest(user?.sub, id);
  }

  @Post("requests/:id/approve")
  @Permission("approval:request:approve")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  approveRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: ApprovalActionDto,
  ) {
    return this.approvalService.approveRequest(user?.sub, id, dto);
  }

  @Post("requests/:id/reject")
  @Permission("approval:request:reject")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  rejectRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: ApprovalActionDto,
  ) {
    return this.approvalService.rejectRequest(user?.sub, id, dto);
  }

  @Post("requests/:id/transfer")
  @Permission("approval:request:transfer")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  transferRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: ApprovalActionDto,
  ) {
    return this.approvalService.transferRequest(user?.sub, id, dto);
  }

  @Post("requests/batch/approve")
  @Permission("approval:request:approve")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 60 })
  batchApprove(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { ids: string[]; comment?: string },
  ) {
    return this.approvalService.batchApprove(user?.sub, dto.ids, dto.comment);
  }

  @Post("requests/batch/reject")
  @Permission("approval:request:reject")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 60 })
  batchReject(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { ids: string[]; comment?: string },
  ) {
    return this.approvalService.batchReject(user?.sub, dto.ids, dto.comment);
  }


}
