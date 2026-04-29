import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * 日志自动备份服务
 *
 * 职责：
 * - 每日自动备份当天日志到归档表 (Requirements 21.1)
 * - 保留备份数据 1 年 (Requirements 21.2)
 * - 将超过 1 年的数据从主表移至归档表 (Requirements 21.3)
 * - 支持从归档表恢复日志数据 (Requirements 21.3)
 */
@Injectable()
export class LogBackupService {
  private readonly logger = new Logger(LogBackupService.name);

  /** 备份保留期限：1 年（天） */
  private readonly RETENTION_DAYS = 365;

  /** 每次批量处理的记录数，避免单次事务过大 */
  private readonly BATCH_SIZE = 5000;

  /** 上次备份状态缓存 */
  private lastBackupStatus: {
    lastRunAt: Date | null;
    lastRunSuccess: boolean;
    lastRunMessage: string;
    archivedOperationLogs: number;
    archivedLoginLogs: number;
  } = {
    lastRunAt: null,
    lastRunSuccess: false,
    lastRunMessage: '尚未执行备份',
    archivedOperationLogs: 0,
    archivedLoginLogs: 0,
  };

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // 定时任务
  // ---------------------------------------------------------------------------

  /**
   * 每日凌晨 2:00 执行完整备份流程
   * Requirements: 21.1
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDailyBackup(): Promise<void> {
    this.logger.log('[LogBackup] 开始执行每日自动备份任务...');

    try {
      // 1. 将超过 1 年的主表数据归档
      const { operationCount, loginCount } = await this.archiveOldLogs();

      // 2. 备份当天日志（将今天的日志复制到归档表，保留主表数据）
      await this.performDailyBackup();

      // 3. 清理归档表中超过 1 年的旧备份
      await this.enforceRetentionPolicy();

      this.lastBackupStatus = {
        lastRunAt: new Date(),
        lastRunSuccess: true,
        lastRunMessage: `备份成功：归档操作日志 ${operationCount} 条，登录日志 ${loginCount} 条`,
        archivedOperationLogs: operationCount,
        archivedLoginLogs: loginCount,
      };

      this.logger.log(`[LogBackup] 每日备份任务完成。${this.lastBackupStatus.lastRunMessage}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : '';

      this.lastBackupStatus = {
        ...this.lastBackupStatus,
        lastRunAt: new Date(),
        lastRunSuccess: false,
        lastRunMessage: `备份失败：${message}`,
      };

      this.logger.error(`[LogBackup] 每日备份任务失败: ${message}`, stack);
    }
  }

  // ---------------------------------------------------------------------------
  // 核心业务方法
  // ---------------------------------------------------------------------------

  /**
   * 备份当天的日志到归档表（不删除主表数据）
   * 用于保留当天快照，防止主表数据意外丢失
   * Requirements: 21.1
   */
  async performDailyBackup(): Promise<{ operationCount: number; loginCount: number }> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    let operationCount = 0;
    let loginCount = 0;

    try {
      // 备份当天操作日志
      const operationLogs = await this.prisma.sys_operation_log.findMany({
        where: {
          create_time: { gte: startOfDay, lte: endOfDay },
          is_deleted: 0,
        },
      });

      if (operationLogs.length > 0) {
        // 查找已存在于归档表的 ID，避免重复插入
        const existingIds = await this.prisma.sys_operation_log_archive.findMany({
          where: { id: { in: operationLogs.map((l) => l.id) } },
          select: { id: true },
        });
        const existingIdSet = new Set(existingIds.map((r) => r.id));

        const newLogs = operationLogs
          .filter((l) => !existingIdSet.has(l.id))
          .map((log) => ({
            id: log.id,
            create_time: log.create_time,
            update_time: log.update_time,
            is_deleted: log.is_deleted,
            user_id: log.user_id,
            username: log.username,
            request_method: log.request_method,
            api_path: log.api_path,
            api_name: log.api_name,
            operation_module: log.operation_module,
            request_ip: log.request_ip,
            user_agent: log.user_agent,
            operation_status: log.operation_status,
            operation_message: log.operation_message,
            request_params: log.request_params as any,
            response_summary: log.response_summary as any,
            platform_id: log.platform_id,
            dept_id: log.dept_id,
            shop_id: log.shop_id,
          }));

        if (newLogs.length > 0) {
          await this.prisma.sys_operation_log_archive.createMany({ data: newLogs });
          operationCount = newLogs.length;
        }
      }

      // 备份当天登录日志
      const loginLogs = await this.prisma.sys_login_log.findMany({
        where: {
          create_time: { gte: startOfDay, lte: endOfDay },
          is_deleted: 0,
        },
      });

      if (loginLogs.length > 0) {
        const existingIds = await this.prisma.sys_login_log_archive.findMany({
          where: { id: { in: loginLogs.map((l) => l.id) } },
          select: { id: true },
        });
        const existingIdSet = new Set(existingIds.map((r) => r.id));

        const newLogs = loginLogs
          .filter((l) => !existingIdSet.has(l.id))
          .map((log) => ({
            id: log.id,
            create_time: log.create_time,
            update_time: log.update_time,
            is_deleted: log.is_deleted,
            user_id: log.user_id,
            username: log.username,
            login_ip: log.login_ip,
            user_agent: log.user_agent,
            login_status: log.login_status,
            login_message: log.login_message,
            platform_id: log.platform_id,
            dept_id: log.dept_id,
            shop_id: log.shop_id,
          }));

        if (newLogs.length > 0) {
          await this.prisma.sys_login_log_archive.createMany({ data: newLogs });
          loginCount = newLogs.length;
        }
      }

      this.logger.log(
        `[LogBackup] 当天日志备份完成：操作日志 ${operationCount} 条，登录日志 ${loginCount} 条`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[LogBackup] 当天日志备份失败: ${message}`);
      throw error;
    }

    return { operationCount, loginCount };
  }

  /**
   * 将主表中超过 1 年的历史数据移至归档表
   * Requirements: 21.2, 21.3
   */
  async archiveOldLogs(): Promise<{ operationCount: number; loginCount: number }> {
    const archiveThreshold = new Date();
    archiveThreshold.setDate(archiveThreshold.getDate() - this.RETENTION_DAYS);

    let totalOperationCount = 0;
    let totalLoginCount = 0;

    try {
      // 分批归档操作日志
      let hasMore = true;
      while (hasMore) {
        const batch = await this.prisma.sys_operation_log.findMany({
          where: {
            create_time: { lt: archiveThreshold },
            is_deleted: 0,
          },
          take: this.BATCH_SIZE,
        });

        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        await this.prisma.$transaction(async (tx) => {
          // 查找已存在于归档表的 ID
          const existingIds = await tx.sys_operation_log_archive.findMany({
            where: { id: { in: batch.map((l) => l.id) } },
            select: { id: true },
          });
          const existingIdSet = new Set(existingIds.map((r) => r.id));

          const newArchiveData = batch
            .filter((l) => !existingIdSet.has(l.id))
            .map((log) => ({
              id: log.id,
              create_time: log.create_time,
              update_time: log.update_time,
              is_deleted: log.is_deleted,
              user_id: log.user_id,
              username: log.username,
              request_method: log.request_method,
              api_path: log.api_path,
              api_name: log.api_name,
              operation_module: log.operation_module,
              request_ip: log.request_ip,
              user_agent: log.user_agent,
              operation_status: log.operation_status,
              operation_message: log.operation_message,
              request_params: log.request_params as any,
              response_summary: log.response_summary as any,
              platform_id: log.platform_id,
              dept_id: log.dept_id,
              shop_id: log.shop_id,
            }));

          if (newArchiveData.length > 0) {
            await tx.sys_operation_log_archive.createMany({ data: newArchiveData });
          }

          // 从主表删除已归档的记录
          await tx.sys_operation_log.deleteMany({
            where: { id: { in: batch.map((l) => l.id) } },
          });

          totalOperationCount += batch.length;
        }, { timeout: 60000 });

        this.logger.log(`[LogBackup] 已归档操作日志 ${totalOperationCount} 条（本批 ${batch.length} 条）`);

        // 如果本批不足 BATCH_SIZE，说明已处理完毕
        if (batch.length < this.BATCH_SIZE) {
          hasMore = false;
        }
      }

      // 分批归档登录日志
      hasMore = true;
      while (hasMore) {
        const batch = await this.prisma.sys_login_log.findMany({
          where: {
            create_time: { lt: archiveThreshold },
            is_deleted: 0,
          },
          take: this.BATCH_SIZE,
        });

        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        await this.prisma.$transaction(async (tx) => {
          const existingIds = await tx.sys_login_log_archive.findMany({
            where: { id: { in: batch.map((l) => l.id) } },
            select: { id: true },
          });
          const existingIdSet = new Set(existingIds.map((r) => r.id));

          const newArchiveData = batch
            .filter((l) => !existingIdSet.has(l.id))
            .map((log) => ({
              id: log.id,
              create_time: log.create_time,
              update_time: log.update_time,
              is_deleted: log.is_deleted,
              user_id: log.user_id,
              username: log.username,
              login_ip: log.login_ip,
              user_agent: log.user_agent,
              login_status: log.login_status,
              login_message: log.login_message,
              platform_id: log.platform_id,
              dept_id: log.dept_id,
              shop_id: log.shop_id,
            }));

          if (newArchiveData.length > 0) {
            await tx.sys_login_log_archive.createMany({ data: newArchiveData });
          }

          await tx.sys_login_log.deleteMany({
            where: { id: { in: batch.map((l) => l.id) } },
          });

          totalLoginCount += batch.length;
        }, { timeout: 60000 });

        this.logger.log(`[LogBackup] 已归档登录日志 ${totalLoginCount} 条（本批 ${batch.length} 条）`);

        if (batch.length < this.BATCH_SIZE) {
          hasMore = false;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[LogBackup] 历史日志归档失败: ${message}`);
      throw error;
    }

    return { operationCount: totalOperationCount, loginCount: totalLoginCount };
  }

  /**
   * 执行保留策略：删除归档表中超过 1 年的旧备份
   * Requirements: 21.2
   */
  async enforceRetentionPolicy(): Promise<{ deletedOperationLogs: number; deletedLoginLogs: number }> {
    const retentionThreshold = new Date();
    retentionThreshold.setDate(retentionThreshold.getDate() - this.RETENTION_DAYS);

    let deletedOperationLogs = 0;
    let deletedLoginLogs = 0;

    try {
      // 删除归档表中超过 1 年的操作日志
      const opResult = await this.prisma.sys_operation_log_archive.deleteMany({
        where: { create_time: { lt: retentionThreshold } },
      });
      deletedOperationLogs = opResult.count;

      // 删除归档表中超过 1 年的登录日志
      const loginResult = await this.prisma.sys_login_log_archive.deleteMany({
        where: { create_time: { lt: retentionThreshold } },
      });
      deletedLoginLogs = loginResult.count;

      if (deletedOperationLogs > 0 || deletedLoginLogs > 0) {
        this.logger.log(
          `[LogBackup] 保留策略执行完成：删除过期操作日志归档 ${deletedOperationLogs} 条，登录日志归档 ${deletedLoginLogs} 条`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[LogBackup] 保留策略执行失败: ${message}`);
      throw error;
    }

    return { deletedOperationLogs, deletedLoginLogs };
  }

  /**
   * 从归档表恢复指定日期范围内的日志到主表
   * Requirements: 21.3
   *
   * @param startDate 恢复起始日期（含）
   * @param endDate   恢复结束日期（含）
   * @param logType   日志类型：'operation' | 'login'
   * @returns 恢复的记录数
   */
  async restoreFromBackup(
    startDate: Date,
    endDate: Date,
    logType: 'operation' | 'login',
  ): Promise<{ restoredCount: number }> {
    if (startDate > endDate) {
      throw new Error('起始日期不能晚于结束日期');
    }

    let restoredCount = 0;

    try {
      if (logType === 'operation') {
        restoredCount = await this.restoreOperationLogs(startDate, endDate);
      } else {
        restoredCount = await this.restoreLoginLogs(startDate, endDate);
      }

      this.logger.log(
        `[LogBackup] 日志恢复完成：类型=${logType}，时间范围=${startDate.toISOString()} ~ ${endDate.toISOString()}，恢复 ${restoredCount} 条`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[LogBackup] 日志恢复失败: ${message}`);
      throw error;
    }

    return { restoredCount };
  }

  /**
   * 获取备份状态信息
   * Requirements: 21.1, 21.2
   */
  async getBackupStatus(): Promise<{
    lastRunAt: Date | null;
    lastRunSuccess: boolean;
    lastRunMessage: string;
    archivedOperationLogs: number;
    archivedLoginLogs: number;
    archiveOperationLogTotal: number;
    archiveLoginLogTotal: number;
    retentionDays: number;
  }> {
    try {
      const [archiveOperationLogTotal, archiveLoginLogTotal] = await Promise.all([
        this.prisma.sys_operation_log_archive.count(),
        this.prisma.sys_login_log_archive.count(),
      ]);

      return {
        ...this.lastBackupStatus,
        archiveOperationLogTotal,
        archiveLoginLogTotal,
        retentionDays: this.RETENTION_DAYS,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[LogBackup] 获取备份状态失败: ${message}`);
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // 私有辅助方法
  // ---------------------------------------------------------------------------

  private async restoreOperationLogs(startDate: Date, endDate: Date): Promise<number> {
    let totalRestored = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.prisma.sys_operation_log_archive.findMany({
        where: {
          create_time: { gte: startDate, lte: endDate },
        },
        take: this.BATCH_SIZE,
        skip: totalRestored,
      });

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      await this.prisma.$transaction(async (tx) => {
        // 查找主表中已存在的 ID，避免重复插入
        const existingIds = await tx.sys_operation_log.findMany({
          where: { id: { in: batch.map((l) => l.id) } },
          select: { id: true },
        });
        const existingIdSet = new Set(existingIds.map((r) => r.id));

        const newData = batch
          .filter((l) => !existingIdSet.has(l.id))
          .map((log) => ({
            id: log.id,
            create_time: log.create_time,
            update_time: log.update_time,
            is_deleted: log.is_deleted,
            user_id: log.user_id,
            username: log.username,
            request_method: log.request_method,
            api_path: log.api_path,
            api_name: log.api_name,
            operation_module: log.operation_module,
            request_ip: log.request_ip,
            user_agent: log.user_agent,
            operation_status: log.operation_status,
            operation_message: log.operation_message,
            request_params: log.request_params as any,
            response_summary: log.response_summary as any,
            platform_id: log.platform_id,
            dept_id: log.dept_id,
            shop_id: log.shop_id,
          }));

        if (newData.length > 0) {
          await tx.sys_operation_log.createMany({ data: newData });
          totalRestored += newData.length;
        }
      }, { timeout: 60000 });

      if (batch.length < this.BATCH_SIZE) {
        hasMore = false;
      }
    }

    return totalRestored;
  }

  private async restoreLoginLogs(startDate: Date, endDate: Date): Promise<number> {
    let totalRestored = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.prisma.sys_login_log_archive.findMany({
        where: {
          create_time: { gte: startDate, lte: endDate },
        },
        take: this.BATCH_SIZE,
        skip: totalRestored,
      });

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      await this.prisma.$transaction(async (tx) => {
        const existingIds = await tx.sys_login_log.findMany({
          where: { id: { in: batch.map((l) => l.id) } },
          select: { id: true },
        });
        const existingIdSet = new Set(existingIds.map((r) => r.id));

        const newData = batch
          .filter((l) => !existingIdSet.has(l.id))
          .map((log) => ({
            id: log.id,
            create_time: log.create_time,
            update_time: log.update_time,
            is_deleted: log.is_deleted,
            user_id: log.user_id,
            username: log.username,
            login_ip: log.login_ip,
            user_agent: log.user_agent,
            login_status: log.login_status,
            login_message: log.login_message,
            platform_id: log.platform_id,
            dept_id: log.dept_id,
            shop_id: log.shop_id,
          }));

        if (newData.length > 0) {
          await tx.sys_login_log.createMany({ data: newData });
          totalRestored += newData.length;
        }
      }, { timeout: 60000 });

      if (batch.length < this.BATCH_SIZE) {
        hasMore = false;
      }
    }

    return totalRestored;
  }
}
