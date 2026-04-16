import { Body, Controller, Get, Param, Post, Query, Res } from "@nestjs/common";
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
import { FinanceService } from "../services/finance.service";
import { CreateReimbursementDto } from "../dto/finance.dto";
import { Response } from "express";

@Controller("finance")
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get("expense-types")
  @Permission("finance:expense-type:list")
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  listExpenseTypes(@CurrentUser() user: CurrentUserPayload) {
    return this.financeService.listExpenseTypes(user.sub);
  }

  @Get("reimbursements")
  @Permission("finance:reimbursement:list")
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  listReimbursements(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: any,
  ) {
    return this.financeService.listReimbursements(user.sub, query);
  }

  @Get("reimbursements/:id")
  @Permission("finance:reimbursement:detail")
  @RateLimit({ type: RateLimitType.USER, limit: 50, window: 60 })
  getReimbursement(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.financeService.getReimbursement(user.sub, id);
  }

  @Post("reimbursements")
  @Permission("finance:reimbursement:create")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 1800 })
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  createReimbursement(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateReimbursementDto,
  ) {
    return this.financeService.createReimbursement(user.sub, dto);
  }

  @Post("reimbursements/:id/withdraw")
  @Permission("finance:reimbursement:create")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  withdrawReimbursement(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.financeService.withdrawReimbursement(user.sub, id);
  }

  @Post("reimbursements/:id/pay")
  @Permission("finance:reimbursement:pay")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  completePayment(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() body: { pay_method: string; remark?: string },
  ) {
    return this.financeService.completePayment(
      user.sub,
      id,
      body.pay_method,
      body.remark,
    );
  }

  @Get("purchases")
  @Permission("finance:purchase:list")
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  listPurchases(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    return this.financeService.listPurchases(user.sub, query);
  }

  @Get("purchases/:id")
  @Permission("finance:purchase:detail")
  @RateLimit({ type: RateLimitType.USER, limit: 50, window: 60 })
  getPurchase(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.financeService.getPurchase(user.sub, id);
  }

  @Post("purchases")
  @Permission("finance:purchase:create")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 1800 })
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  createPurchase(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.financeService.createPurchase(user.sub, dto);
  }

  @Post("purchases/:id/complete")
  @Permission("finance:purchase:manage")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  completePurchase(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() body: { actual_amount: number; supplier_info: string },
  ) {
    return this.financeService.completePurchase(
      user.sub,
      id,
      body.actual_amount,
      body.supplier_info,
    );
  }

  @Post("purchases/:id/cancel")
  @Permission("finance:purchase:manage")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  cancelPurchase(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() body: { reason: string },
  ) {
    return this.financeService.cancelPurchase(user.sub, id, body.reason);
  }

  @Get("cash-records")
  @Permission("finance:cash-record:list")
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  listCashRecords(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: any,
  ) {
    return this.financeService.listCashRecords(user.sub, query);
  }

  @Post("cash-records")
  @Permission("finance:cash-record:create")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  createCashRecord(@CurrentUser() user: CurrentUserPayload, @Body() body: any) {
    return this.financeService.createCashRecord(user.sub, body);
  }

  @Get("dashboard/stats")
  @Permission("finance:cash-record:list")
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  getDashboardStats(
    @CurrentUser() user: CurrentUserPayload,
    @Query("platform_id") platformId: string,
  ) {
    return this.financeService.getDashboardStats(user.sub, platformId);
  }

  @Get("reimbursements/stats")
  @Permission("finance:reimbursement:list")
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  getReimbursementStats(
    @CurrentUser() user: CurrentUserPayload,
    @Query("platform_id") platformId: string,
    @Query("start_date") startDate?: string,
    @Query("end_date") endDate?: string,
    @Query("dept_id") deptId?: string,
  ) {
    return this.financeService.getReimbursementStats(user.sub, {
      platformId,
      startDate,
      endDate,
      deptId,
    });
  }

  @Get("purchases/stats")
  @Permission("finance:purchase:list")
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  getPurchaseStats(
    @CurrentUser() user: CurrentUserPayload,
    @Query("platform_id") platformId: string,
    @Query("start_date") startDate?: string,
    @Query("end_date") endDate?: string,
    @Query("dept_id") deptId?: string,
  ) {
    return this.financeService.getPurchaseStats(user.sub, {
      platformId,
      startDate,
      endDate,
      deptId,
    });
  }

  @Get("cash-records/stats")
  @Permission("finance:cash-record:list")
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  getCashRecordStats(
    @CurrentUser() user: CurrentUserPayload,
    @Query("platform_id") platformId: string,
    @Query("start_date") startDate?: string,
    @Query("end_date") endDate?: string,
    @Query("type") type?: string,
  ) {
    return this.financeService.getCashRecordStats(user.sub, {
      platformId,
      startDate,
      endDate,
      type,
    });
  }

  @Get("reimbursements/export")
  @Permission("finance:reimbursement:export")
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 60 })
  async exportReimbursements(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: any,
    @Res() res: Response,
  ) {
    const buffer = await this.financeService.exportReimbursements(
      user.sub,
      query,
    );
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

  @Get("purchases/export")
  @Permission("finance:purchase:export")
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 60 })
  async exportPurchases(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: any,
    @Res() res: Response,
  ) {
    const buffer = await this.financeService.exportPurchases(user.sub, query);
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

  @Get("cash-records/export")
  @Permission("finance:cash-record:export")
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 60 })
  async exportCashRecords(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: any,
    @Res() res: Response,
  ) {
    const buffer = await this.financeService.exportCashRecords(user.sub, query);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=cash_records_${Date.now()}.xlsx`,
    );
    res.end(buffer);
  }
}
