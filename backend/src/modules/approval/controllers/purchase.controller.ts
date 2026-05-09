import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CurrentUser, CurrentUserPayload } from "../../../common/current-user.decorator";
import { Permission } from "../../../common/permission.decorator";
import { RateLimit, RateLimitType } from "../../../common/decorators/rate-limiter.decorator";
import { PurchaseService } from "../services/purchase.service";
import { CreatePurchaseDto } from "../dto/create-purchase.dto";
import { UpdatePurchaseDto } from "../dto/update-purchase.dto";
import { QueryPurchaseDto } from "../dto/query-purchase.dto";

@ApiTags("采购管理")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("approval/purchases")
export class PurchaseController {
  private readonly logger = new Logger(PurchaseController.name);

  constructor(private readonly purchaseService: PurchaseService) {}

  @Post()
  @ApiOperation({ summary: "创建采购申请" })
  @ApiResponse({ status: HttpStatus.CREATED, description: "创建成功" })
  @Permission("approval:purchase:create")
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreatePurchaseDto) {
    return this.purchaseService.create(dto, user.id!);
  }

  @Get()
  @ApiOperation({ summary: "获取采购申请列表" })
  @ApiResponse({ status: 200, description: "成功返回采购列表" })
  @Permission("approval:purchase:list")
  findMany(@Query() query: QueryPurchaseDto) {
    const serviceQuery: any = {
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };
    return this.purchaseService.findMany(serviceQuery);
  }

  @Get("stats")
  @ApiOperation({ summary: "获取采购统计数据" })
  @Permission("approval:purchase:stats")
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  getStats(
    @Query("platformId") platformId?: string,
    @Query("deptId") deptId?: string,
    @Query("applicantId") applicantId?: string,
  ) {
    return this.purchaseService.getStats(platformId, deptId, applicantId);
  }

  @Get("export")
  @ApiOperation({ summary: "导出采购记录" })
  @Permission("approval:purchase:export")
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  async exportPurchases(@Query() query: QueryPurchaseDto, @Res() res: Response) {
    const serviceQuery: any = {
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };
    const buffer = await this.purchaseService.exportPurchases(serviceQuery);
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=purchases.xlsx",
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取采购申请详情" })
  @Permission("approval:purchase:detail")
  findById(@Param("id") id: string) {
    return this.purchaseService.findById(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新采购申请" })
  @Permission("approval:purchase:update")
  update(
    @Param("id") id: string,
    @Body() dto: UpdatePurchaseDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.purchaseService.update(id, dto, user.id!);
  }

  @Delete(":id")
  @ApiOperation({ summary: "取消采购申请" })
  @Permission("approval:purchase:cancel")
  cancel(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.purchaseService.cancel(id, user.id!);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "更新采购状态" })
  @Permission("approval:purchase:audit")
  updateStatus(
    @Param("id") id: string,
    @Body("status") status: number,
    @Body("supplierInfo") supplierInfo: string,
    @Body("actualAmount") actualAmount: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.purchaseService.updateStatus(id, status, user.id!, supplierInfo, actualAmount);
  }
}
