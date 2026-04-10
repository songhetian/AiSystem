import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ApprovalModule } from '../approval/approval.module';
import { FinanceController } from './controllers/finance.controller';
import { FinanceService } from './services/finance.service';

@Module({
  imports: [PrismaModule, CommonModule, ApprovalModule],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService]
})
export class FinanceModule {}
