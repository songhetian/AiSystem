import {
  Body,
  Controller,
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
import {
  RateLimit,
  RateLimitType,
} from "../../../common/decorators/rate-limiter.decorator";
import { ReimbursementService } from "../services/reimbursement.service";
import { CreateReimbursementDto } from "../dto/create-reimbursement.dto";
import { UpdateReimbursementDto } from "../dto/update-reimbursement.dto";
import { QueryReimbursementDto } from "../dto/query-reimbursement.dto";
import { Response } from "express";

@ApiTags("报销管理")
@ApiBearerAuth()
@Controller("approval/reimbursements")
export class ReimbursementController {
  constructor(private readonly reimbursementService: ReimbursementService) {}

  @Post()
  @ApiOperation({
    summary: "创建报销申请",
    description: "提交新的报销申请",
  })
  @ApiResponse({ status: 201, description: "报销申请创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @Permission("approval:reimbursement:create")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateReimbursementDto,
  ) {
    return this.reimbursementService.create(dto, user.sub);
  }

  @Get()
  @ApiOperation({
    summary: "获取报销申请列表",
    description: "查询报销申请列表，支持筛选和分页",
  })
  @ApiResponse({ status: 200, description: "成功返回报销申请列表" })
  @Permission("approval:reimbursement:list")
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  findMany(@Query() query: QueryReimbursementDto) {
    return this.reimbursementService.findMany(query);
  }

  @Get("stats")
  @ApiOperation({
    summary: "获取报销统计",
    description: "获取报销申请的统计信息",
  })
  @ApiResponse({ status: 200, description: "成功返回统计信息" })
  @Permission("approval:reimbursement:stats")
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  getStats(
    @Query("platformId") platformId?: string,
    @Query("deptId") deptId?: string,
    @Query("applicantId") applicantId?: string,
  ) {
    return this.reimbursementService.getStats(platformId, deptId, applicantId);
  }

  @Get("export")
  @ApiOperation({
    summary: "导出报销记录",
    description: "导出报销记录为Excel文件",
  })
  @ApiResponse({ status: 200, description: "成功导出报销记录" })
  @Permission("approval:reimbursement:export")
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 60 })
  async exportReimbursements(
    @Query() query: QueryReimbursementDto,
    @Res() res: Response,
  ) {
    const buffer = await this.reimbursementService.exportReimbursements(query);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=reimbursements_${Date.now()}.xlsx`,
    );
    res.end(buffer);
  }

  @Get(":id")
  @ApiOperation({
    summary: "获取报销申请详情",
    description: "根据ID获取报销申请详细信息",
  })
  @ApiResponse({ status: 200, description: "成功返回报销申请详情" })
  @ApiResponse({ status: 404, description: "报销申请不存在" })
  @Permission("approval:reimbursement:detail")
  @RateLimit({ type: RateLimitType.USER, limit: 50, window: 60 })
  findById(@Param("id") id: string) {
    return this.reimbursementService.findById(id);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "更新报销申请",
    description: "更新报销申请信息（仅申请人可操作）",
  })
  @ApiResponse({ status: 200, description: "报销申请更新成功" })
  @ApiResponse({ status: 403, description: "无权限操作" })
  @Permission("approval:reimbursement:update")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: UpdateReimbursementDto,
  ) {
    return this.reimbursementService.update(id, dto, user.sub);
  }

  @Patch(":id/withdraw")
  @ApiOperation({
    summary: "撤回报销申请",
    description: "撤回审批中的报销申请",
  })
  @ApiResponse({ status: 200, description: "报销申请撤回成功" })
  @ApiResponse({ status: 400, description: "当前状态不允许撤回" })
  @Permission("approval:reimbursement:withdraw")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  withdraw(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.reimbursementService.withdraw(id, user.sub);
  }

  @Patch(":id/status")
  @ApiOperation({
    summary: "更新报销状态",
    description: "更新报销申请状态（财务人员操作）",
  })
  @ApiResponse({ status: 200, description: "状态更新成功" })
  @ApiResponse({ status: 400, description: "状态转换无效" })
  @Permission("approval:reimbursement:finance")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  updateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: {
      status: number;
      payMethod?: string;
      remark?: string;
    },
  ) {
    return this.reimbursementService.updateStatus(
      id,
      dto.status,
      user.sub,
      dto.payMethod,
      dto.remark,
    );
  }
}
