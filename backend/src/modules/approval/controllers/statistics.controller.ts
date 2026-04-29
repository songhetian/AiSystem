import {
  Controller,
  Get,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { Permission } from "../../../common/permission.decorator";
import {
  RateLimit,
  RateLimitType,
} from "../../../common/decorators/rate-limiter.decorator";
import { StatisticsService } from "../services/statistics.service";

@ApiTags("数据统计分析")
@ApiBearerAuth()
@Controller("approval/statistics")
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get("dashboard")
  @ApiOperation({
    summary: "获取仪表板数据",
    description: "获取审批系统仪表板统计数据",
  })
  @ApiResponse({ status: 200, description: "成功返回仪表板数据" })
  @Permission("approval:statistics:dashboard")
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  getDashboard(
    @Query("platformId") platformId?: string,
    @Query("departmentId") departmentId?: string,
  ) {
    return this.statisticsService.getDashboardStats(platformId, departmentId);
  }

  @Get("reimbursement")
  @ApiOperation({
    summary: "获取报销统计",
    description: "获取报销申请的统计分析数据",
  })
  @ApiResponse({ status: 200, description: "成功返回报销统计" })
  @Permission("approval:statistics:reimbursement")
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  getReimbursementStats(
    @Query("platformId") platformId?: string,
    @Query("departmentId") departmentId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.statisticsService.getReimbursementStats(
      platformId,
      departmentId,
      start,
      end,
    );
  }

  @Get("purchase")
  @ApiOperation({
    summary: "获取采购统计",
    description: "获取采购申请的统计分析数据",
  })
  @ApiResponse({ status: 200, description: "成功返回采购统计" })
  @Permission("approval:statistics:purchase")
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  getPurchaseStats(
    @Query("platformId") platformId?: string,
    @Query("departmentId") departmentId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.statisticsService.getPurchaseStats(
      platformId,
      departmentId,
      start,
      end,
    );
  }

  @Get("approval-efficiency")
  @ApiOperation({
    summary: "获取审批效率统计",
    description: "获取审批流程效率分析数据",
  })
  @ApiResponse({ status: 200, description: "成功返回审批效率统计" })
  @Permission("approval:statistics:efficiency")
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  getApprovalEfficiencyStats(
    @Query("platformId") platformId?: string,
    @Query("departmentId") departmentId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.statisticsService.getApprovalEfficiencyStats(
      platformId,
      departmentId,
      start,
      end,
    );
  }

  @Get("financial-summary")
  @ApiOperation({
    summary: "获取财务汇总",
    description: "获取收支汇总统计数据",
  })
  @ApiResponse({ status: 200, description: "成功返回财务汇总" })
  @Permission("approval:statistics:financial")
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  getFinancialSummary(
    @Query("platformId") platformId?: string,
    @Query("departmentId") departmentId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.statisticsService.getFinancialSummary(
      platformId,
      departmentId,
      start,
      end,
    );
  }
}
