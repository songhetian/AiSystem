import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CommonModule } from '../../common/common.module';
import { ExamController } from './controllers/exam.controller';
import { ExamService } from './services/exam.service';
import { ExamCronService } from './services/exam-cron.service';
import { ExamWorker } from './workers/exam.worker';

@Module({
  imports: [
    CommonModule,
    BullModule.registerQueue({
      name: 'exam-queue',
    }),
  ],
  controllers: [ExamController],
  providers: [ExamService, ExamCronService, ExamWorker]
})
export class ExamModule {}
