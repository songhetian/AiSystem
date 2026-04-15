import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { MappingService, IntegrationErrorCode } from '../services/mapping.service';
import { IntegrationMonitorService } from '../services/integration-monitor.service';
import { PlatformIntegrationAdapterService } from '../services/platform-integration-adapter.service';
import * as dayjs from 'dayjs';
import * as parser from 'cron-parser';

@Injectable()
export class SystemCronWorker {
  private readonly logger = new Logger(SystemCronWorker.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mappingService: MappingService,
    private readonly monitorService: IntegrationMonitorService,
    private readonly integrationAdapter: PlatformIntegrationAdapterService,
  ) {}

  /**
   * 核心扫描器：每分钟执行一次，精准控制任务起止 (Section 5.3)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleIntegrationTick() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      // 获取待执行任务：next_run_time 已到且重试次数未达上限 (Section 5.3)
      const pendingJobs = await (this.prisma as any).sys_cron_job.findMany({
        where: {
          status: 1,
          is_deleted: 0,
          OR: [
            { next_run_time: { lte: now } },
            { next_run_time: null }
          ],
          // 只抓取重试次数未用尽的任务
          current_retry: { lt: (this.prisma as any).sys_cron_job.retry_count }
        }
      });

      for (const job of pendingJobs) {
        await this.runJob(job);
      }

      // 每小时整点触发一次集成日志聚合 (Section 3.3)
      if (now.getMinutes() === 0) {
        await this.monitorService.aggregateLogsToStats();
      }
    } catch (error) {
      this.logger.error(`Integration cron tick failed: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 每日维护：凌晨 2 点清理集成日志，凌晨 3 点清理已删除 30 天的消息 (PRD 2.3.2)
   */
  @Cron('0 0 2 * * *')
  async handleLogCleanup() {
    this.logger.log('Starting daily maintenance: Cleaning legacy integration logs...');
    try {
      const boundaryDate = dayjs().subtract(90, 'day').toDate();
      const result = await (this.prisma as any).sys_integration_log.deleteMany({
        where: { create_time: { lt: boundaryDate } }
      });
      this.logger.log(`Cleanup completed. Removed ${result.count} legacy log entries.`);
    } catch (error) {
      this.logger.error(`Maintenance failed: ${error.message}`);
    }
  }

  @Cron('0 0 3 * * *')
  async handleMessageRetention() {
    this.logger.log('Starting daily maintenance: Purging 30-day deleted messages...');
    try {
      const boundaryDate = dayjs().subtract(30, 'day').toDate();
      const result = await (this.prisma as any).sys_message.deleteMany({
        where: {
          is_deleted: 1,
          delete_time: { lt: boundaryDate }
        }
      });
      this.logger.log(`Message purge completed. Removed ${result.count} expired messages.`);
    } catch (error) {
      this.logger.error(`Message retention cleanup failed: ${error.message}`);
    }
  }

  private async runJob(job: any) {
    const startTime = Date.now();
    
    // V7.0 实战化：分布式锁实现（利用数据库事务原子性）
    // 逻辑：尝试将任务状态标记为“处理中 (status=2)”，仅成功者可执行
    const isLocked = await (this.prisma as any).sys_cron_job.updateMany({
      where: { id: job.id, status: 1, next_run_time: { lte: new Date() } },
      data: { status: 2 }
    });

    if (isLocked.count === 0) return;

    this.logger.log(`[V7.0 Advanced Scheduler] Executing: ${job.name} (ID: ${job.id})`);

    try {
      // 1. 获取关联配置
      const config = await (this.prisma as any).sys_platform_config.findUnique({
        where: { id: job.assoc_config_id }
      });

      if (!config || !config.template_id) {
        throw new Error('Config invalid: Missing template_id mapping');
      }

      // 2. 数据处理流... (此处保留原有 Mapping 逻辑)
      const rawData = await this.integrationAdapter.fetchData(job.job_type, config);
      const mappedData = await this.mappingService.transform(config.template_id, rawData);

      if (job.job_type === 'fetch_orders') {
        await this.mappingService.upsertOrders(config.platform_id, config.shop_id, config.dept_id, mappedData);
      } else if (job.job_type === 'fetch_products') {
        await this.mappingService.upsertProducts(config.platform_id, config.shop_id, config.dept_id, mappedData);
      }

      // 3. 执行成功：恢复状态并计算下次执行时间 (cron-parser)
      await (this.prisma as any).sys_cron_job.update({
        where: { id: job.id },
        data: {
          status: 1, // 恢复就绪
          last_run_time: new Date(),
          next_run_time: this.parseNextOccurrence(job.cron_expression),
          current_retry: 0,
          last_error: null
        }
      });

      await this.logAuditor(config, job.job_type, 'INFO', `Synced ${mappedData.length} entries successfully`, startTime);

    } catch (error) {
      this.logger.error(`Job [${job.name}] failure: ${error.message}`);
      
      const nextRetry = job.current_retry + 1;
      const willRetainRetry = nextRetry < job.retry_count;

      // 错误处理：状态恢复并安排重试
      await (this.prisma as any).sys_cron_job.update({
        where: { id: job.id },
        data: {
          status: 1,
          current_retry: nextRetry,
          last_error: error.message,
          next_run_time: willRetainRetry 
             ? dayjs().add(job.retry_interval, 'minute').toDate() 
             : this.parseNextOccurrence(job.cron_expression)
        }
      });

      await this.logAuditor(
        { platform_id: 'cron', dept_id: 'system' }, 
        job.job_type, 
        'ERROR', 
        error.message, 
        startTime, 
        this.classifyError(error)
      );
    }
  }

  private parseNextOccurrence(cron: string): Date {
    try {
      const interval = parser.parseExpression(cron);
      return interval.next().toDate();
    } catch (err) {
      this.logger.error(`Invalid Cron Expression [${cron}]: ${err.message}`);
      // 容错：默认为 1 小时后
      return dayjs().add(1, 'hour').toDate();
    }
  }

  private classifyError(error: any): IntegrationErrorCode {
    if (error?.integrationCode) return error.integrationCode;
    if (error.message.includes('mapping')) return IntegrationErrorCode.MAPPING_ERROR;
    if (error.message.includes('auth')) return IntegrationErrorCode.PERMISSION_DENIED;
    if (error.message.includes('Connection')) return IntegrationErrorCode.API_CALL_ERROR;
    return IntegrationErrorCode.STORAGE_ERROR;
  }

  private async logAuditor(config: any, type: string, level: string, msg: string, start: number, code?: string) {
    await (this.prisma as any).sys_integration_log.create({
      data: {
        platform_id: config?.platform_id || 'system',
        dept_id: config?.dept_id || 'system',
        shop_id: config?.shop_id,
        biz_type: type,
        log_level: level,
        message: msg,
        duration_ms: Date.now() - start,
        error_code: code
      }
    });
  }
}
