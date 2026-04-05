import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { SystemModule } from './modules/system/system.module';
import { PersonnelModule } from './modules/personnel/personnel.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ApprovalModule } from './modules/approval/approval.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    PrismaModule,
    AuthModule,
    SystemModule,
    PersonnelModule,
    AttendanceModule,
    ApprovalModule
  ]
})
export class AppModule {}
