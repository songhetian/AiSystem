import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../../../common/current-user.decorator";
import { Permission } from "../../../common/permission.decorator";
import { FinanceService } from "../services/finance.service";
import { CreateReimbursementDto } from "../dto/finance.dto";
import { Idempotent } from "../../../common/decorators/idempotent.decorator";

@Controller("finance")
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get("expense-types")
  @Permission("finance:expense-type:list")
  listExpenseTypes(@CurrentUser() user: CurrentUserPayload) {
    return this.financeService.listExpenseTypes(user.sub);
  }

  @Get("reimbursements")
  @Permission("finance:reimbursement:list")
  listReimbursements(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: any,
  ) {
    return this.financeService.listReimbursements(user.sub, query);
  }

  @Post("reimbursements")
  @Permission("finance:reimbursement:create")
  @Idempotent({ mode: "active", ttl: 1800 })
  createReimbursement(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateReimbursementDto,
  ) {
    return this.financeService.createReimbursement(user.sub, dto);
  }

  @Get("purchases")
  @Permission("finance:purchase:list")
  listPurchases(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    return this.financeService.listPurchases(user.sub, query);
  }

  @Post("purchases")
  @Permission("finance:purchase:create")
  @Idempotent({ mode: "active", ttl: 1800 })
  createPurchase(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.financeService.createPurchase(user.sub, dto);
  }

  @Get("cash-records")
  @Permission("finance:cash-record:list")
  listCashRecords(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: any,
  ) {
    return this.financeService.listCashRecords(user.sub, query);
  }

  // ✅ 新增：报销申请撤回（PRD 2.6.3.2）
  @Post("reimbursements/:id/withdraw")
  @Permission("finance:reimbursement:create")
  withdrawReimbursement(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.financeService.withdrawReimbursement(user.sub, id);
  }

  // ✅ 新增：报销打款（PRD 2.6.3.1）
  @Post("reimbursements/:id/pay")
  @Permission("finance:reimbursement:pay")
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

  // ✅ 新增：采购完成（PRD 2.7.2.2）
  @Post("purchases/:id/complete")
  @Permission("finance:purchase:manage")
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

  // ✅ 新增：采购取消（PRD 2.7.3）
  @Post("purchases/:id/cancel")
  @Permission("finance:purchase:manage")
  cancelPurchase(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() body: { reason: string },
  ) {
    return this.financeService.cancelPurchase(user.sub, id, body.reason);
  }

  // ✅ 新增：收支记录新增（PRD 2.8.1/2.8.2）
  @Post("cash-records")
  @Permission("finance:cash-record:create")
  createCashRecord(@CurrentUser() user: CurrentUserPayload, @Body() body: any) {
    return this.financeService.createCashRecord(user.sub, body);
  }

  @Get("dashboard/stats")
  @Permission("finance:cash-record:list")
  getDashboardStats(
    @CurrentUser() user: CurrentUserPayload,
    @Query("platform_id") platformId: string,
  ) {
    return this.financeService.getDashboardStats(user.sub, platformId);
  }

  // ✅ 新增：报销统计（PRD 2.9.1）
  @Get("reimbursements/stats")
  @Permission("finance:reimbursement:list")
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

  // ✅ 新增：采购统计（PRD 2.9.2）
  @Get("purchases/stats")
  @Permission("finance:purchase:list")
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

  // ✅ 新增：收支统计（PRD 2.9.3）
  @Get("cash-records/stats")
  @Permission("finance:cash-record:list")
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
}
