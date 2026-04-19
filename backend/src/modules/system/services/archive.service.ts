import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * 数据生命周期归档服务 (V5.0)
 * 职责：定期将旧日志迁移至 Archive 归档表，保持主表高性能。
 */
@Injectable()
export class ArchiveService {
  private readonly logger = new Logger(ArchiveService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 每天凌晨 2:00 执行归档任务
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleLogArchiving() {
    this.logger.log('[V5.0 Archive] 开始执行自动化日志归档任务...');

    // 设定归档界限：30 天前
    const archiveThreshold = new Date();
    archiveThreshold.setDate(archiveThreshold.getDate() - 30);

    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. 归档操作日志 (sys_operation_log)
        const opLogs = await tx.sys_operation_log.findMany({
          where: { create_time: { lt: archiveThreshold }, is_deleted: 0 },
          take: 5000 // 每次迁移 5000 条，避免事务过大
        });

        if (opLogs.length > 0) {
          const archiveData = opLogs.map(log => ({
            ...log,
            request_params: log.request_params as any,
            response_summary: log.response_summary as any
          }));

          await tx.sys_operation_log_archive.createMany({
            data: archiveData
          });

          await tx.sys_operation_log.deleteMany({
            where: { id: { in: opLogs.map(l => l.id) } }
          });

          this.logger.log(`[V5.0 Archive] 已成功归档 ${opLogs.length} 条操作日志`);
        }

        // 2. 归档登录日志 (sys_login_log)
        const loginLogs = await tx.sys_login_log.findMany({
          where: { create_time: { lt: archiveThreshold }, is_deleted: 0 },
          take: 5000
        });

        if (loginLogs.length > 0) {
          await tx.sys_login_log_archive.createMany({
            data: loginLogs
          });

          await tx.sys_login_log.deleteMany({
            where: { id: { in: loginLogs.map(l => l.id) } }
          });

          this.logger.log(`[V5.0 Archive] 已成功归档 ${loginLogs.length} 条登录日志`);
        }
      }, { timeout: 30000 }); // 增加事务超时时间

      this.logger.log('[V5.0 Archive] 日志归档任务执行完毕');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : '';
      this.logger.error(`[V5.0 Archive] 归档任务失败: ${message}`, stack);
    }
  }
}
