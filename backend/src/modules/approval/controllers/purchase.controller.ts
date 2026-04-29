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
import { PurchaseService } from "../services/purchase.service";
import { CreatePurchaseDto } from "../dto/create-purchase.dto";
import { UpdatePurchaseDto } from "../dto/update-purchase.dto";
import { QueryPurchaseDto } from "../dto/query-purchase.dto";
import { Response } from "express";

@ApiTags("采购管理")
@ApiBearerAuth()
@Controller("approval/purchases")
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post()
  @ApiOperation({
    summary: "创建采购申请",
    description: "提交新的采购申请",
  })
  @ApiResponse({ status: 201, description: "采购申请创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @Permission("approval:purchase:create")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePurchaseDto,
  ) {
    return this.purchaseService.create(dto, user.sub);
  }

  @Get()
  @ApiOperation({
    summary: "获取采购申请列表",
    description: "查询采购申请列表，支持筛选和分页",
  })
  @ApiResponse({ status: 200, description: "成功返回采购申请列表" })
  @Permission("approval:purchase:list")
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  findMany(@Query() query: QueryPurchaseDto) {
    return this.purchaseService.findMany(query);
  }

  @Get("stats")
  @ApiOperation({
    summary: "获取采购统计",
    description: "获取采购申请的统计信息",
  })
  @ApiResponse({ status: 200, description: "成功返回统计信息" })
  @Permission("approval:purchase:stats")
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  getStats(
    @Query("platformId") platformId?: string,
    @Query("deptId") deptId?: string,
    @Query("applicantId") applicantId?: string,
  ) {
    return this.purchaseService.getStats(platformId, deptId, applicantId);
  }

  @Get("export")
  @ApiOperation({
    summary: "导出采购记录",
    description: "导出采购记录为Excel文件",
  })
  @ApiResponse({ status: 200, description: "成功导出采购记录" })
  @Permission("approval:purchase:export")
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 60 })
  async exportPurchases(
    @Query() query: QueryPurchaseDto,
    @Res() res: Response,
  ) {
    const buffer = await this.purchaseService.exportPurchases(query);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=purchases_${Date.now()}.xlsx`,
    );
    res.end(buffer);
  }

  @Get(":id")
  @ApiOperation({
    summary: "获取采购申请详情",
    description: "根据ID获取采购申请详细信息",
  })
  @ApiResponse({ status: 200, description: "成功返回采购申请详情" })
  @ApiResponse({ status: 404, description: "采购申请不存在" })
  @Permission("approval:purchase:detail")
  @RateLimit({ type: RateLimitType.USER, limit: 50, window: 60 })
  findById(@Param("id") id: string) {
    return this.purchaseService.findById(id);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "更新采购申请",
    description: "更新采购申请信息（仅申请人可操作）",
  })
  @ApiResponse({ status: 200, description: "采购申请更新成功" })
  @ApiResponse({ status: 403, description: "无权限操作" })
  @Permission("approval:purchase:update")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: UpdatePurchaseDto,
  ) {
    return this.purchaseService.update(id, dto, user.sub);
  }

  @Patch(":id/cancel")
  @ApiOperation({
    summary: "取消采购申请",
    description: "取消审批中或待采购的申请",
  })
  @ApiResponse({ status: 200, description: "采购申请取消成功" })
  @ApiResponse({ status: 400, description: "当前状态不允许取消" })
  @Permission("approval:purchase:cancel")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  cancel(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.purchaseService.cancel(id, user.sub);
  }

  @Patch(":id/status")
  @ApiOperation({
    summary: "更新采购状态",
    description: "更新采购申请状态（采购人员操作）",
  })
  @ApiResponse({ status: 200, description: "状态更新成功" })
  @ApiResponse({ status: 400, description: "状态转换无效" })
  @Permission("approval:purchase:procurement")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  updateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: {
      status: number;
      supplierInfo?: string;
      actualAmount?: number;
    },
  ) {
    return this.purchaseService.updateStatus(
      id,
      dto.status,
      user.sub,
      dto.supplierInfo,
      dto.actualAmount,
    );
  }

  @Post("batch/status")
  @ApiOperation({
    summary: "批量更新采购状态",
    description: "批量更新多个采购申请的状态",
  })
  @ApiResponse({ status: 200, description: "批量更新完成" })
  @Permission("approval:purchase:batch")
  @AntiShake(2000)
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 60 })
  batchUpdateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: {
      ids: string[];
      status: number;
    },
  ) {
    return this.purchaseService.batchUpdateStatus(dto.ids, dto.status, user.sub);
  }
}
