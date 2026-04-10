import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { MessageService } from '../../../common/services/message.service';

@Injectable()
export class ApiMonitorService {
  private readonly logger = new Logger(ApiMonitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageService: MessageService
  ) {}

  /**
   * 定时监控任务：每 10 分钟运行一次
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleMonitoring() {
    this.logger.log('Starting API Health Monitoring Task...');
    
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    // 1. 聚合过去 10 分钟内的接口调用情况
    // 注意：此处使用基础的 findMany 模拟聚合，生产环境建议使用 raw query 或专用监控工具
    const recentLogs = await (this.prisma as any).sys_operation_log.findMany({
      where: {
        create_time: { gte: tenMinutesAgo },
        is_deleted: 0
      }
    });

    if (recentLogs.length === 0) {
      this.logger.log('No API activity detected in the last 10 minutes.');
      return;
    }

    // 2. 按 API 路径分组并分析
    const statsMap = new Map<string, { total: number; success: number; platform_id: string; dept_id: string }>();

    recentLogs.forEach((log: any) => {
      const key = `${log.request_method}:${log.api_path}`;
      const current = statsMap.get(key) || { total: 0, success: 0, platform_id: log.platform_id, dept_id: log.dept_id };
      
      current.total += 1;
      if (log.operation_status === 1) current.success += 1;
      
      statsMap.set(key, current);
    });

    // 3. 判定异常并触发报警
    for (const [api, stats] of statsMap.entries()) {
      const successRate = (stats.success / stats.total) * 100;
      
      // 阈值：成功率低于 95% 且调用量超过 5 次
      if (successRate < 95 && stats.total >= 5) {
        await this.triggerAlert(api, successRate, stats);
      }
    }
  }

  private async triggerAlert(api: string, rate: number, stats: any) {
    this.logger.warn(`ALERT: API ${api} success rate dropped to ${rate.toFixed(2)}%`);

    // 寻找该平台/部门的管理员 (简单示例：寻找该部门下具有管理员角色的用户)
    const admins = await this.prisma.sys_user.findMany({
      where: {
        platform_id: stats.platform_id,
        dept_id: stats.dept_id,
        status: 1,
        is_deleted: 0,
        roles: {
          some: {
            role: {
              role_code: { in: ['admin', 'dept_admin', 'super_admin'] }
            }
          }
        }
      }
    });

    // 发送消息
    for (const admin of admins) {
      await this.messageService.send({
        recipientId: admin.id,
        title: '⚠️ 接口运行异常预警',
        content: `检测到接口 [${api}] 调用异常。过去 10 分钟成功率：${rate.toFixed(2)}% (总计 ${stats.total} 次)。请及时检查系统日志。`,
        messageType: 'system_alert',
        bizType: 'api_monitor',
        bizId: api,
        payload: {
          api,
          successRate: rate,
          totalCount: stats.total,
          platform_id: stats.platform_id,
          dept_id: stats.dept_id
        }
      });
    }
  }
}
