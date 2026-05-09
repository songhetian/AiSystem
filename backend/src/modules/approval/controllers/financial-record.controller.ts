import {
  Controller,
  Get,
  Post,
  Put,
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
import { FinancialRecordService } from "../services/financial-record.service";
import { CreateFinancialRecordDto } from "../dto/create-financial-record.dto";
import { UpdateFinancialRecordDto } from "../dto/update-financial-record.dto";
import { QueryFinancialRecordDto } from "../dto/query-financial-record.dto";

@ApiTags("财务收支记录")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("approval/financial")
export class FinancialRecordController {
  private readonly logger = new Logger(FinancialRecordController.name);

  constructor(
    private readonly financialRecordService: FinancialRecordService,
  ) {}

  @Post()
  @ApiOperation({
    summary: "创建财务记录",
    description: "手动创建一条财务记录（通常为收入）",
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: "创建成功" })
  @Permission("approval:financial:create")
  createIncomeRecord(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateFinancialRecordDto,
  ) {
    return this.financialRecordService.createIncomeRecord(dto, user.id!);
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
    const serviceQuery: any = {
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };
    return this.financialRecordService.findMany(serviceQuery);
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
    return this.financialRecordService.getSummary(
      platformId,
      departmentId,
      start,
      end,
    );
  }

  @Get("export")
  @ApiOperation({
    summary: "导出收支记录",
    description: "导出收支记录列表到Excel文件",
  })
  @ApiResponse({ status: 200, description: "成功返回Excel文件流" })
  @Permission("approval:financial:export")
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  async exportRecords(
    @Query() query: QueryFinancialRecordDto,
    @Res() res: Response,
  ) {
    const serviceQuery: any = {
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };
    const buffer = await this.financialRecordService.exportRecords(serviceQuery);
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=financial-records.xlsx",
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取财务记录详情" })
  @ApiParam({ name: "id", description: "记录ID" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @Permission("approval:financial:detail")
  findById(@Param("id") id: string) {
    return this.financialRecordService.findById(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新财务记录" })
  @ApiParam({ name: "id", description: "记录ID" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @Permission("approval:financial:update")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateFinancialRecordDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.financialRecordService.update(id, dto, user.id!);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除财务记录" })
  @ApiParam({ name: "id", description: "记录ID" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @Permission("approval:financial:delete")
  delete(@Param("id") id: string) {
    return this.financialRecordService.delete(id);
  }
}
