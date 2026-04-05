import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { ApprovalModule } from '../approval/approval.module';
import { AttendanceSchedulesController } from './controllers/attendance-schedules.controller';
import { AttendanceWorkflowsController } from './controllers/attendance-workflows.controller';
import { AttendanceSchedulesService } from './services/attendance-schedules.service';
import { AttendanceWorkflowsService } from './services/attendance-workflows.service';

@Module({
  imports: [CommonModule, ApprovalModule],
  controllers: [AttendanceSchedulesController, AttendanceWorkflowsController],
  providers: [AttendanceSchedulesService, AttendanceWorkflowsService]
})
export class AttendanceModule {}
