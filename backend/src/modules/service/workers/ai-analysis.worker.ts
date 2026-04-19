import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

/**
 * AI分析队列Worker
 * Task 3.3: 实现异步质检任务队列
 * - 使用Bull队列处理质检任务
 * - 限制并发任务数(每平台100个)
 */
@Processor('ai-analysis-queue', {
  // Task 3.3: 配置并发限制为100
  concurrency: 100,
})
export class AiAnalysisWorker extends WorkerHost {
  private readonly logger = new Logger(AiAnalysisWorker.name);

  async process(job: Job): Promise<void> {
    this.logger.debug(`Processing ai-analysis job ${job.id} with name ${job.name}`);

    try {
      // 根据job类型处理不同的任务
      switch (job.name) {
        case 'quality-inspection':
          await this.processQualityInspection(job);
          break;
        case 'cache-rebuild':
          await this.processCacheRebuild(job);
          break;
        default:
          this.logger.warn(`Unknown job type: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process job ${job.id}:`, error);
      throw error; // 重新抛出错误以触发重试机制
    }
  }

  /**
   * 处理质检任务
   */
  private async processQualityInspection(job: Job): Promise<void> {
    const { sessionId, platformId, deptId } = job.data;
    this.logger.debug(`Quality inspection for session ${sessionId}, platform ${platformId}, dept ${deptId}`);

    // 实际的质检逻辑将由ServiceService.analyzeSession处理
    // 这里只是队列处理的占位符
    // 在实际应用中，可以在这里调用ServiceService.analyzeSession
  }

  /**
   * 处理缓存重建任务
   * Task 3.2: Prompt更新时触发缓存重建
   */
  private async processCacheRebuild(job: Job): Promise<void> {
    const { platformId, deptId } = job.data;
    this.logger.debug(`Cache rebuild for platform ${platformId}, dept ${deptId || 'all'}`);

    // 缓存重建逻辑已在QualityPromptService.invalidateCache中实现
    // 这里可以添加额外的缓存预热逻辑
  }
}
