import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CommonModule } from '../../common/common.module';
import { ServiceController } from './controllers/service.controller';
import { QualityPromptController } from './controllers/quality-prompt.controller';
import { ServiceService } from './services/service.service';
import { QualityPromptService } from './services/quality-prompt.service';
import { ConflictValidatorService } from './services/conflict-validator.service';
import { VersionManagerService } from './services/version-manager.service';
import { TemplateLibraryService } from './services/template-library.service';
import { QualityInspectionHelperService } from './services/quality-inspection-helper.service';
import { AiAnalysisWorker } from './workers/ai-analysis.worker';

@Module({
  imports: [
    CommonModule,
    BullModule.registerQueue({
      name: 'ai-analysis-queue',
      // Task 3.3: 配置并发限制（每平台100个）
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
  ],
  controllers: [ServiceController, QualityPromptController],
  providers: [
    ServiceService,
    QualityPromptService,
    ConflictValidatorService,
    VersionManagerService,
    TemplateLibraryService,
    QualityInspectionHelperService,
    AiAnalysisWorker,
  ],
  exports: [
    QualityPromptService,
    ConflictValidatorService,
    VersionManagerService,
    TemplateLibraryService,
    QualityInspectionHelperService,
  ],
})
export class ServiceModule {}
