import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { LogAlertService, AlertLevel, LogAlertType } from './log-alert.service';
import { getProductionConfig } from '../../../config/production.config';

/**
 * 日志系统监控服务
 * Requirements: 22.1, 22.2, 22.4
 *
 * 职责：
 * 1. 监控日志系统性能指标
 * 2. 监控异常日志数量
 * 3. 监控备份任务执行状态
 * 4. 触发性能告警和异常告警
 */
@Injectable()
export class LogMonitoringService {
  private readonly logger = new Logger(LogMonitoringService.name);
  private readonly config = getProductionConfig();

  /** 监控统计数据 */
  private stats = {
    lastCheckTime: new Date(),
    operationLogCount: 0,
    loginLogCount: 0,
    errorLogCount: 0,
    slowQueryCount: 0,
    alertCount: 0,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertService: LogAlertService,
  ) {}

  /**
   * 每 5 分钟执行一次性能监控
   * Requirements: 22.1
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorPerformance(): Promise<void> {
    if (!this.config.monitoring.enabled) {
      return;
    }

    this.logger.debug('[LogMonitoring] 开始执行性能监控...');

    try {
      // 1. 检查日志写入速率
      await this.checkLogWriteRate();

      // 2. 检查数据库查询性能
      await this.checkDatabasePerformance();

      // 3. 检查缓存命中率
      await this.checkCachePerformance();

      // 4. 更新统计数据
      this.stats.lastCheckTime = new Date();

      this.logger.debug('[LogMonitoring] 性能监控完成');
    } catch (error) {
      this.logger.error(
        `[LogMonitoring] 性能监控失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * 每 10 分钟执行一次异常监控
   * Requirements: 22.2
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async monitorExceptions(): Promise<void> {
    if (!this.config.alert.enabled) {
      return;
    }

    this.logger.debug('[LogMonitoring] 开始执行异常监控...');

    try {
      // 1. 检查错误日志数量
      await this.checkErrorLogCount();

      // 2. 检查告警数量
      await this.checkAlertCount();

      // 3. 检查无效 ID 数量
      await this.checkInvalidIdCount();

      this.logger.debug('[LogMonitoring] 异常监控完成');
    } catch (error) {
      this.logger.error(
        `[LogMonitoring] 异常监控失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * 每小时执行一次备份任务监控
   * Requirements: 22.4
   */
  @Cron(CronExpression.EVERY_HOUR)
  async monitorBackupTasks(): Promise<void> {
    if (!this.config.backup.enabled) {
      return;
    }

    this.logger.debug('[LogMonitoring] 开始执行备份任务监控...');

    try {
      // 检查最近 24 小时内是否有备份任务执行
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);

      // 查询归档表的最新记录时间
      const latestArchiveLog = await this.prisma.sys_operation_log_archive.findFirst({
        orderBy: { create_time: 'desc' },
        select: { create_time: true },
      });

      if (!latestArchiveLog) {
        // 如果归档表为空，可能是首次运行或备份任务未执行
        this.logger.warn('[LogMonitoring] 归档表为空，可能备份任务未执行');
        return;
      }

      // 检查归档日志是否是最近 24 小时内的
      const archiveAge = Date.now() - latestArchiveLog.create_time.getTime();
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;

      if (archiveAge > twentyFourHoursMs * 2) {
        // 如果归档日志超过 48 小时，触发告警
        await this.alertService.triggerAlert({
          type: LogAlertType.LOG_RECORDING_ERROR,
          level: AlertLevel.WARNING,
          title: '备份任务可能未执行',
          message: `最新归档日志时间为 ${latestArchiveLog.create_time.toLocaleString('zh-CN')}，距今已超过 48 小时`,
          details: {
            latestArchiveTime: latestArchiveLog.create_time,
            ageHours: Math.floor(archiveAge / (60 * 60 * 1000)),
          },
        });
      }

      this.logger.debug('[LogMonitoring] 备份任务监控完成');
    } catch (error) {
      this.logger.error(
        `[LogMonitoring] 备份任务监控失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * 检查日志写入速率
   * Requirements: 22.1
   */
  private async checkLogWriteRate(): Promise<void> {
    try {
      // 统计最近 5 分钟的日志数量
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

      const [operationLogCount, loginLogCount] = await Promise.all([
        this.prisma.sys_operation_log.count({
          where: {
            create_time: { gte: fiveMinutesAgo },
          },
        }),
        this.prisma.sys_login_log.count({
          where: {
            create_time: { gte: fiveMinutesAgo },
          },
        }),
      ]);

      this.stats.operationLogCount = operationLogCount;
      this.stats.loginLogCount = loginLogCount;

      // 计算每分钟写入速率
      const operationLogRate = operationLogCount / 5;
      const loginLogRate = loginLogCount / 5;

      this.logger.debug(
        `[LogMonitoring] 日志写入速率: 操作日志 ${operationLogRate.toFixed(2)}/分钟, 登录日志 ${loginLogRate.toFixed(2)}/分钟`,
      );

      // 如果写入速率异常高，触发告警
      const HIGH_RATE_THRESHOLD = 1000; // 每分钟超过 1000 条视为异常
      if (operationLogRate > HIGH_RATE_THRESHOLD) {
        await this.alertService.triggerAlert({
          type: LogAlertType.LOG_RECORDING_ERROR,
          level: AlertLevel.WARNING,
          title: '操作日志写入速率异常',
          message: `操作日志写入速率过高: ${operationLogRate.toFixed(2)}/分钟`,
          details: {
            rate: operationLogRate,
            threshold: HIGH_RATE_THRESHOLD,
            count: operationLogCount,
            timeWindow: '5分钟',
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `[LogMonitoring] 检查日志写入速率失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 检查数据库查询性能
   * Requirements: 22.1
   */
  private async checkDatabasePerformance(): Promise<void> {
    try {
      // 执行简单查询并测量响应时间
      const startTime = Date.now();
      await this.prisma.sys_operation_log.count();
      const queryTime = Date.now() - startTime;

      if (queryTime > this.config.monitoring.slowQueryThreshold) {
        this.stats.slowQueryCount++;
        this.logger.warn(
          `[LogMonitoring] 检测到慢查询: ${queryTime}ms (阈值: ${this.config.monitoring.slowQueryThreshold}ms)`,
        );

        // 如果连续多次慢查询，触发告警
        if (this.stats.slowQueryCount >= 3) {
          await this.alertService.triggerAlert({
            type: LogAlertType.LOG_QUERY_ERROR,
            level: AlertLevel.WARNING,
            title: '数据库查询性能下降',
            message: `检测到连续 ${this.stats.slowQueryCount} 次慢查询`,
            details: {
              queryTime,
              threshold: this.config.monitoring.slowQueryThreshold,
              slowQueryCount: this.stats.slowQueryCount,
            },
          });
          // 重置计数器
          this.stats.slowQueryCount = 0;
        }
      } else {
        // 查询正常，重置计数器
        this.stats.slowQueryCount = 0;
      }
    } catch (error) {
      this.logger.error(
        `[LogMonitoring] 检查数据库性能失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 检查缓存性能
   * Requirements: 22.1
   */
  private async checkCachePerformance(): Promise<void> {
    // 缓存性能监控可以通过 Redis 监控工具实现
    // 这里仅记录日志
    this.logger.debug('[LogMonitoring] 缓存性能检查（待实现）');
  }

  /**
   * 检查错误日志数量
   * Requirements: 22.2
   */
  private async checkErrorLogCount(): Promise<void> {
    try {
      // 统计最近 10 分钟的错误日志数量
      const tenMinutesAgo = new Date();
      tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

      const errorLogCount = await this.prisma.sys_operation_log.count({
        where: {
          create_time: { gte: tenMinutesAgo },
          operation_status: 0, // 0 表示失败
        },
      });

      this.stats.errorLogCount = errorLogCount;

      // 如果错误日志数量异常高，触发告警
      const ERROR_THRESHOLD = 50; // 10 分钟内超过 50 条错误日志视为异常
      if (errorLogCount > ERROR_THRESHOLD) {
        await this.alertService.triggerAlert({
          type: LogAlertType.LOG_RECORDING_ERROR,
          level: AlertLevel.ERROR,
          title: '错误日志数量异常',
          message: `最近 10 分钟内检测到 ${errorLogCount} 条错误日志`,
          details: {
            errorLogCount,
            threshold: ERROR_THRESHOLD,
            timeWindow: '10分钟',
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `[LogMonitoring] 检查错误日志数量失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 检查告警数量
   * Requirements: 22.2
   */
  private async checkAlertCount(): Promise<void> {
    try {
      // 统计最近 10 分钟的告警数量
      const tenMinutesAgo = new Date();
      tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

      const alertCount = await this.prisma.sys_log_alert.count({
        where: {
          create_time: { gte: tenMinutesAgo },
        },
      });

      this.stats.alertCount = alertCount;

      // 如果告警数量异常高，触发高级别告警
      const ALERT_THRESHOLD = 20; // 10 分钟内超过 20 条告警视为异常
      if (alertCount > ALERT_THRESHOLD) {
        await this.alertService.triggerAlert({
          type: LogAlertType.LOG_RECORDING_ERROR,
          level: AlertLevel.CRITICAL,
          title: '告警数量异常',
          message: `最近 10 分钟内触发了 ${alertCount} 条告警，系统可能存在严重问题`,
          details: {
            alertCount,
            threshold: ALERT_THRESHOLD,
            timeWindow: '10分钟',
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `[LogMonitoring] 检查告警数量失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 检查无效 ID 数量
   * Requirements: 22.4
   */
  private async checkInvalidIdCount(): Promise<void> {
    try {
      // 统计最近 10 分钟的无效 ID 告警数量
      const tenMinutesAgo = new Date();
      tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

      const invalidIdAlertCount = await this.prisma.sys_log_alert.count({
        where: {
          create_time: { gte: tenMinutesAgo },
          alert_type: LogAlertType.INVALID_ID_WARNING,
        },
      });

      // 如果无效 ID 告警数量异常高，触发告警
      const INVALID_ID_THRESHOLD = 10; // 10 分钟内超过 10 条无效 ID 告警视为异常
      if (invalidIdAlertCount > INVALID_ID_THRESHOLD) {
        await this.alertService.triggerAlert({
          type: LogAlertType.INVALID_ID_WARNING,
          level: AlertLevel.WARNING,
          title: '无效ID告警数量异常',
          message: `最近 10 分钟内检测到 ${invalidIdAlertCount} 条无效 ID 告警，可能存在数据一致性问题`,
          details: {
            invalidIdAlertCount,
            threshold: INVALID_ID_THRESHOLD,
            timeWindow: '10分钟',
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `[LogMonitoring] 检查无效 ID 数量失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 获取监控统计数据
   * Requirements: 22.1, 22.2
   */
  async getMonitoringStats(): Promise<{
    lastCheckTime: Date;
    operationLogCount: number;
    loginLogCount: number;
    errorLogCount: number;
    slowQueryCount: number;
    alertCount: number;
    monitoringEnabled: boolean;
    alertEnabled: boolean;
  }> {
    return {
      ...this.stats,
      monitoringEnabled: this.config.monitoring.enabled,
      alertEnabled: this.config.alert.enabled,
    };
  }

  /**
   * 手动触发性能监控
   * Requirements: 22.1
   */
  async triggerPerformanceMonitoring(): Promise<void> {
    this.logger.log('[LogMonitoring] 手动触发性能监控');
    await this.monitorPerformance();
  }

  /**
   * 手动触发异常监控
   * Requirements: 22.2
   */
  async triggerExceptionMonitoring(): Promise<void> {
    this.logger.log('[LogMonitoring] 手动触发异常监控');
    await this.monitorExceptions();
  }

  /**
   * 手动触发备份任务监控
   * Requirements: 22.4
   */
  async triggerBackupMonitoring(): Promise<void> {
    this.logger.log('[LogMonitoring] 手动触发备份任务监控');
    await this.monitorBackupTasks();
  }
}
