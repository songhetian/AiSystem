import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('ai-analysis-queue')
export class AiAnalysisWorker extends WorkerHost {
  private readonly logger = new Logger(AiAnalysisWorker.name);

  async process(job: Job): Promise<void> {
    this.logger.debug(`skip ai-analysis job ${job.name}`);
  }
}
