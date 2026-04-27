import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from './redis.service';

/**
 * 登录日志服务 (V5.0)
 * 功能：
 * 1. 记录所有登录尝试（成功/失败）
 * 2. 记录登录IP、设备、浏览器
 * 3. 异步记录，不影响登录流程
 * 4. Redis故障兜底
 */

export interface LoginLogData {
  user_id?: string;
  username: string;
  login_ip?: string;
  user_agent?: string;
  login_status: number; // 1: 成功, 0: 失败
  login_message?: string;
  platform_id?: string;
  dept_id?: string;
  shop_id?: string;
  login_method?: string; // password, sms, wechat
  device_type?: string; // pc, mobile, tablet
}

@Injectable()
export class LoginLogService {
  private readonly logger = new Logger(LoginLogService.name);
  private readonly LOG_QUEUE_KEY = 'login_log:queue';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 记录登录日志
   * 异步记录，不阻塞登录流程
   */
  async logLogin(data: LoginLogData): Promise<void> {
    try {
      // 提取设备信息
      const deviceInfo = this.extractDeviceInfo(data.user_agent);

      const logData = {
        ...data,
        login_method: data.login_method || 'password',
        device_type: data.device_type || deviceInfo.deviceType,
        user_agent: data.user_agent || deviceInfo.userAgent,
      };

      // 异步记录（不阻塞）
      this.asyncLogLogin(logData);
    } catch (error) {
      this.logger.error(`登录日志记录失败: ${(error as Error).message}`);
    }
  }

  /**
   * 异步记录登录日志
   * 优先使用数据库，失败时使用Redis队列兜底
   */
  private async asyncLogLogin(data: LoginLogData): Promise<void> {
    try {
      // 尝试直接写入数据库
      await this.prisma.sys_login_log.create({
        data: {
          user_id: data.user_id,
          username: data.username,
          login_ip: data.login_ip,
          user_agent: data.user_agent,
          login_status: data.login_status,
          login_message: data.login_message,
          platform_id: data.platform_id,
          dept_id: data.dept_id,
          shop_id: data.shop_id,
          login_method: data.login_method,
          device_type: data.device_type,
        },
      });

      this.logger.log(`登录日志记录成功: ${data.username} - ${data.login_status === 1 ? '成功' : '失败'}`);
    } catch (error) {
      this.logger.warn(`数据库写入失败，使用Redis队列兜底: ${(error as Error).message}`);

      try {
        // Redis故障兜底：将日志推入队列
        await this.redisService.rpush(this.LOG_QUEUE_KEY, JSON.stringify(data));
      } catch (redisError) {
        this.logger.error(`Redis队列写入也失败: ${(redisError as Error).message}`);
      }
    }
  }

  /**
   * 提取设备信息
   * 从User-Agent中提取设备类型和浏览器信息
   */
  private extractDeviceInfo(userAgent?: string): { deviceType: string; userAgent: string } {
    if (!userAgent) {
      return { deviceType: 'unknown', userAgent: 'unknown' };
    }

    let deviceType = 'pc';

    // 检测移动设备
    if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
      if (/ipad|tablet/i.test(userAgent)) {
        deviceType = 'tablet';
      } else {
        deviceType = 'mobile';
      }
    }

    return {
      deviceType,
      userAgent: userAgent.substring(0, 500), // 限制长度
    };
  }

  /**
   * 查询登录日志
   * 支持多条件筛选和分页
   */
  async queryLoginLogs(params: {
    username?: string;
    login_status?: number;
    start_time?: Date;
    end_time?: Date;
    platform_id?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: any[]; total: number }> {
    const { username, login_status, start_time, end_time, platform_id, page = 1, pageSize = 20 } = params;

    const where: any = {
      is_deleted: 0,
    };

    if (username) {
      where.username = { contains: username };
    }

    if (login_status !== undefined) {
      where.login_status = login_status;
    }

    if (start_time || end_time) {
      where.create_time = {};
      if (start_time) where.create_time.gte = start_time;
      if (end_time) where.create_time.lte = end_time;
    }

    if (platform_id) {
      where.platform_id = platform_id;
    }

    const [data, total] = await Promise.all([
      this.prisma.sys_login_log.findMany({
        where,
        orderBy: { create_time: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.sys_login_log.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * 导出登录日志
   * 返回所有符合条件的日志（用于Excel导出）
   */
  async exportLoginLogs(params: {
    username?: string;
    login_status?: number;
    start_time?: Date;
    end_time?: Date;
    platform_id?: string;
  }): Promise<any[]> {
    const { username, login_status, start_time, end_time, platform_id } = params;

    const where: any = {
      is_deleted: 0,
    };

    if (username) {
      where.username = { contains: username };
    }

    if (login_status !== undefined) {
      where.login_status = login_status;
    }

    if (start_time || end_time) {
      where.create_time = {};
      if (start_time) where.create_time.gte = start_time;
      if (end_time) where.create_time.lte = end_time;
    }

    if (platform_id) {
      where.platform_id = platform_id;
    }

    return await this.prisma.sys_login_log.findMany({
      where,
      orderBy: { create_time: 'desc' },
      take: 10000, // 限制最多导出10000条
    });
  }

  /**
   * 处理Redis队列中的日志
   * 定时任务调用，将队列中的日志批量写入数据库
   */
  async processLogQueue(): Promise<void> {
    try {
      const queueLength = await this.redisService.llen(this.LOG_QUEUE_KEY);
      if (queueLength === 0) {
        return;
      }

      this.logger.log(`开始处理登录日志队列，共 ${queueLength} 条`);

      // 批量处理（每次最多100条）
      const batchSize = 100;
      const logsToProcess = Math.min(queueLength, batchSize);

      for (let i = 0; i < logsToProcess; i++) {
        const logStr = await this.redisService.lpop(this.LOG_QUEUE_KEY);
        if (!logStr) continue;

        try {
          const logData = JSON.parse(logStr as string);
          await this.prisma.sys_login_log.create({ data: logData });
        } catch (error) {
          this.logger.error(`处理队列日志失败: ${(error as Error).message}`);
          // 失败的日志重新推回队列
          await this.redisService.rpush(this.LOG_QUEUE_KEY, logStr as string);
        }
      }

      this.logger.log(`登录日志队列处理完成，处理了 ${logsToProcess} 条`);
    } catch (error) {
      this.logger.error(`处理登录日志队列失败: ${(error as Error).message}`);
    }
  }
}
