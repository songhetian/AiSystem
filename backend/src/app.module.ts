import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { SystemModule } from './modules/system/system.module';
import { PersonnelModule } from './modules/personnel/personnel.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ApprovalModule } from './modules/approval/approval.module';
import { ServiceModule } from './modules/service/service.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { ShopModule } from './modules/shop/shop.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ExamModule } from './modules/exam/exam.module';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';
// ...
@Module({
  imports: [
    // ...
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
  ],
})
export class AppModule {}
