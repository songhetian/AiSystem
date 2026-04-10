import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CommonModule } from '../../common/common.module';
import { ApprovalModule } from '../approval/approval.module';
import { AttendanceSchedulesController } from './controllers/attendance-schedules.controller';
import { AttendanceWorkflowsController } from './controllers/attendance-workflows.controller';
import { ShiftsController } from './controllers/shifts.controller';
import { AttendanceRecordsController } from './controllers/attendance-records.controller';
import { AttendanceSchedulesService } from './services/attendance-schedules.service';
import { AttendanceWorkflowsService } from './services/attendance-workflows.service';
import { ShiftsService } from './services/shifts.service';
import { AttendanceRecordsService } from './services/attendance-records.service';
import { AttendanceWorker } from './workers/attendance.worker';

@Module({
  imports: [
    CommonModule,
    ApprovalModule,
    BullModule.registerQueue({
      name: 'attendance-queue',
    }),
  ],
  controllers: [
    AttendanceSchedulesController,
    AttendanceWorkflowsController,
    ShiftsController,
    AttendanceRecordsController,
  ],
  providers: [
    AttendanceSchedulesService,
    AttendanceWorkflowsService,
    ShiftsService,
    AttendanceRecordsService,
    AttendanceWorker,
  ],
})
export class AttendanceModule {}
