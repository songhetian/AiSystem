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
import {
  RateLimit,
  RateLimitType,
} from "../../../common/decorators/rate-limiter.decorator";
import { FinancialRecordService } from "../services/financial-record.service";
import { CreateFinancialRecordDto } from "../dto/create-financial-record.dto";
import { UpdateFinancialRecordDto } from "../dto/update-financial-record.dto";
import { QueryFinancialRecordDto } from "../dto/query-financial-record.dto";
import { Response } from "express";

@ApiTags("收支记录管理")
@ApiBearerAuth()
@Controller("approval/financial-records")
export class FinancialRecordController {
  constructor(private readonly financialRecordService: FinancialRecordService) {}

  @Post("income")
  @ApiOperation({
    summary: "创建收入记录",
    description: "手动创建收入记录",
  })
  @ApiResponse({ status: 201, description: "收入记录创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @Permission("approval:financial:income:create")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  createIncomeRecord(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateFinancialRecordDto,
  ) {
    return this.financialRecordService.createIncomeRecord(dto, user.sub);
  }

  @Get()
  @ApiOperation({
    summary: "获取收支记录列表",
    description: "查询收支记录列表，支持筛选和分页",
  })
  @ApiResponse({ status: 200, description: "成功返回收支记录列表" })
  @Permission("approval:financial:list")
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  findMany(@Query() query: QueryFinancialRecordDto) {
    return this.financialRecordService.findMany(query);
  }

  @Get("summary")
  @ApiOperation({
    summary: "获取财务汇总",
    description: "获取收支汇总统计信息",
  })
  @ApiResponse({ status: 200, description: "成功返回财务汇总" })
  @Permission("approval:financial:summary")
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  getSummary(
    @Query("platformId") platformId?: string,
    @Query("departmentId") departmentId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.financialRecordService.getSummary(platformId, departmentId, start, end);
  }

  @Get("monthly")
  @ApiOperation({
    summary: "获取月度财务数据",
    description: "获取按月统计的财务数据",
  })
  @ApiResponse({ status: 200, description: "成功返回月度财务数据" })
  @Permission("approval:financial:monthly")
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  getMonthlyData(
    @Query("platformId") platformId?: string,
    @Query("departmentId") departmentId?: string,
    @Query("months") months?: number,
  ) {
    return this.financialRecordService.getMonthlyData(platformId, departmentId, months);
  }

  @Get("category-stats")
  @ApiOperation({
    summary: "获取分类统计",
    description: "获取收入或支出的分类统计",
  })
  @ApiResponse({ status: 200, description: "成功返回分类统计" })
  @Permission("approval:financial:stats")
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  getCategoryStats(
    @Query("type") type: "income" | "expense",
    @Query("platformId") platformId?: string,
    @Query("departmentId") departmentId?: string,
  ) {
    return this.financialRecordService.getCategoryStats(type, platformId, departmentId);
  }

  @Get("export")
  @ApiOperation({
    summary: "导出收支记录",
    description: "导出收支记录为Excel文件",
  })
  @ApiResponse({ status: 200, description: "成功导出收支记录" })
  @Permission("approval:financial:export")
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 60 })
  async exportRecords(
    @Query() query: QueryFinancialRecordDto,
    @Res() res: Response,
  ) {
    const buffer = await this.financialRecordService.exportRecords(query);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=financial_records_${Date.now()}.xlsx`,
    );
    res.end(buffer);
  }

  @Get(":id")
  @ApiOperation({
    summary: "获取收支记录详情",
    description: "根据ID获取收支记录详细信息",
  })
  @ApiResponse({ status: 200, description: "成功返回收支记录详情" })
  @ApiResponse({ status: 404, description: "收支记录不存在" })
  @Permission("approval:financial:detail")
  @RateLimit({ type: RateLimitType.USER, limit: 50, window: 60 })
  findById(@Param("id") id: string) {
    return this.financialRecordService.findById(id);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "更新收支记录",
    description: "更新收支记录信息（仅手动创建的记录可修改）",
  })
  @ApiResponse({ status: 200, description: "收支记录更新成功" })
  @ApiResponse({ status: 400, description: "只能修改手动创建的记录" })
  @Permission("approval:financial:update")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: UpdateFinancialRecordDto,
  ) {
    return this.financialRecordService.update(id, dto, user.sub);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "删除收支记录",
    description: "删除收支记录（仅手动创建的记录可删除）",
  })
  @ApiResponse({ status: 200, description: "收支记录删除成功" })
  @ApiResponse({ status: 400, description: "只能删除手动创建的记录" })
  @Permission("approval:financial:delete")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  delete(@Param("id") id: string) {
    return this.financialRecordService.delete(id);
  }
}
