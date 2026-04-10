import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CommonModule } from '../../common/common.module';
import { ApprovalController } from './controllers/approval.controller';
import { ApprovalService } from './services/approval.service';
import { ApprovalWorker } from './workers/approval.worker';

@Module({
  imports: [
    CommonModule,
    BullModule.registerQueue({
      name: 'approval-queue',
    }),
  ],
  controllers: [ApprovalController],
  providers: [ApprovalService, ApprovalWorker],
  exports: [ApprovalService],
})
export class ApprovalModule {}
