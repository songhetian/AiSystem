import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CommonModule } from '../../common/common.module';
import { ServiceController } from './controllers/service.controller';
import { ServiceService } from './services/service.service';
import { AiAnalysisWorker } from './workers/ai-analysis.worker';

@Module({
  imports: [
    CommonModule,
    BullModule.registerQueue({
      name: 'ai-analysis-queue',
    }),
  ],
  controllers: [ServiceController],
  providers: [ServiceService, AiAnalysisWorker],
})
export class ServiceModule {}
