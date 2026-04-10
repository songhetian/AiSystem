import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { Permission } from '../../../common/permission.decorator';
import { FinanceService } from '../services/finance.service';
import { CreateReimbursementDto } from '../dto/finance.dto';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('expense-types')
  @Permission('finance:expense-type:list')
  listExpenseTypes(@CurrentUser() user: CurrentUserPayload) {
    return this.financeService.listExpenseTypes(user.sub);
  }

  @Get('reimbursements')
  @Permission('finance:reimbursement:list')
  listReimbursements(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    return this.financeService.listReimbursements(user.sub, query);
  }

  @Post('reimbursements')
  @Permission('finance:reimbursement:create')
  createReimbursement(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateReimbursementDto) {
    return this.financeService.createReimbursement(user.sub, dto);
  }

  @Get('purchases')
  @Permission('finance:purchase:list')
  listPurchases(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    return this.financeService.listPurchases(user.sub, query);
  }

  @Post('purchases')
  @Permission('finance:purchase:create')
  createPurchase(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.financeService.createPurchase(user.sub, dto);
  }

  @Get('cash-records')
  @Permission('finance:cash-record:list')
  listCashRecords(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    return this.financeService.listCashRecords(user.sub, query);
  }

  @Get('dashboard/stats')
  @Permission('finance:cash-record:list')
  getDashboardStats(@CurrentUser() user: CurrentUserPayload, @Query('platform_id') platformId: string) {
    return this.financeService.getDashboardStats(user.sub, platformId);
  }
}
