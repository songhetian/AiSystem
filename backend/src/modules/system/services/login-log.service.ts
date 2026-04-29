import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../common/services/redis.service';
import { MessageService } from '../../../common/services/message.service';
import { ConfigCacheService } from '../../../common/services/config-cache.service';

interface LoginLogPayload {
  user_id?: string | null;
  username: string;
  login_ip?: string | null;
  user_agent?: string | null;
  login_status: number;
  login_message?: string | null;
  platform_id?: string | null;
  dept_id?: string | null;
  shop_id?: string | null;
}

interface ParsedDeviceInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: string;
}

@Injectable()
export class LoginLogService {
  private readonly logger = new Logger(LoginLogService.name);
  private readonly FALLBACK_LOGIN_KEY = 'audit:fallback:login';
  private readonly LOGIN_FAILURE_PREFIX = 'login:failure:';
  private readonly ACCOUNT_LOCK_PREFIX = 'login:lock:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly messageService: MessageService,
    private readonly configCacheService: ConfigCacheService,
  ) {}

  /**
   * 解析 User-Agent 字符串,提取设备和浏览器信息
   * Requirements: 9.1, 9.2, 9.3, 9.4
   */
  parseUserAgent(userAgent?: string | null): ParsedDeviceInfo {
    if (!userAgent) {
      return {
        browser: '未知浏览器',
        browserVersion: '',
        os: '未知系统',
        osVersion: '',
        deviceType: 'unknown',
      };
    }

    const ua = userAgent.toLowerCase();
    let browser = '未知浏览器';
    let browserVersion = '';
    let os = '未知系统';
    let osVersion = '';
    let deviceType = 'pc';

    // 检测设备类型
    if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
      deviceType = 'mobile';
      if (/ipad/i.test(ua)) {
        deviceType = 'tablet';
      }
    } else if (/tablet/i.test(ua)) {
      deviceType = 'tablet';
    }

    // 检测浏览器
    if (ua.includes('edg/')) {
      browser = 'Edge';
      const match = ua.match(/edg\/([\d.]+)/);
      browserVersion = match ? match[1] : '';
    } else if (ua.includes('chrome/') && !ua.includes('edg/')) {
      browser = 'Chrome';
      const match = ua.match(/chrome\/([\d.]+)/);
      browserVersion = match ? match[1] : '';
    } else if (ua.includes('firefox/')) {
      browser = 'Firefox';
      const match = ua.match(/firefox\/([\d.]+)/);
      browserVersion = match ? match[1] : '';
    } else if (ua.includes('safari/') && !ua.includes('chrome')) {
      browser = 'Safari';
      const match = ua.match(/version\/([\d.]+)/);
      browserVersion = match ? match[1] : '';
    } else if (ua.includes('msie') || ua.includes('trident/')) {
      browser = 'IE';
      const match = ua.match(/(?:msie |rv:)([\d.]+)/);
      browserVersion = match ? match[1] : '';
    }

    // 检测操作系统
    if (ua.includes('windows nt')) {
      os = 'Windows';
      const match = ua.match(/windows nt ([\d.]+)/);
      if (match) {
        const version = match[1];
        if (version === '10.0') osVersion = '10/11';
        else if (version === '6.3') osVersion = '8.1';
        else if (version === '6.2') osVersion = '8';
        else if (version === '6.1') osVersion = '7';
        else osVersion = version;
      }
    } else if (ua.includes('mac os x')) {
      os = 'macOS';
      const match = ua.match(/mac os x ([\d_]+)/);
      osVersion = match ? match[1].replace(/_/g, '.') : '';
    } else if (ua.includes('android')) {
      os = 'Android';
      const match = ua.match(/android ([\d.]+)/);
      osVersion = match ? match[1] : '';
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      os = 'iOS';
      const match = ua.match(/os ([\d_]+)/);
      osVersion = match ? match[1].replace(/_/g, '.') : '';
    } else if (ua.includes('linux')) {
      os = 'Linux';
    }

    return {
      browser,
      browserVersion,
      os,
      osVersion,
      deviceType,
    };
  }

  /**
   * 格式化设备信息为显示字符串
   * Requirements: 9.2
   */
  formatDeviceInfo(deviceInfo: ParsedDeviceInfo): string {
    const parts: string[] = [];

    if (deviceInfo.browser !== '未知浏览器') {
      const browserStr = deviceInfo.browserVersion
        ? `${deviceInfo.browser} ${deviceInfo.browserVersion.split('.')[0]}`
        : deviceInfo.browser;
      parts.push(browserStr);
    }

    if (deviceInfo.os !== '未知系统') {
      const osStr = deviceInfo.osVersion
        ? `${deviceInfo.os} ${deviceInfo.osVersion}`
        : deviceInfo.os;
      parts.push(osStr);
    }

    return parts.length > 0 ? parts.join(', ') : '未知设备';
  }

  /**
   * 获取客户端IP地址
   * Requirements: 10.1, 10.2, 10.3
   */
  getClientIp(ip?: string | null): string {
    if (!ip || ip === '::1' || ip === '127.0.0.1') {
      return 'IP获取失败';
    }
    return ip;
  }

  /**
   * 记录登录日志
   * Requirements: 6.1, 6.2, 6.3, 6.4
   */
  async recordLoginLog(payload: LoginLogPayload): Promise<void> {
    try {
      // 解析设备信息
      const deviceInfo = this.parseUserAgent(payload.user_agent);
      const formattedDevice = this.formatDeviceInfo(deviceInfo);

      // 处理IP地址
      const clientIp = this.getClientIp(payload.login_ip);

      // 如果登录失败,在设备信息末尾补充失败原因
      let finalUserAgent = formattedDevice;
      if (payload.login_status === 0 && payload.login_message) {
        finalUserAgent = `${formattedDevice} (失败原因: ${payload.login_message})`;
      }

      // 记录到数据库
      await this.prisma.sys_login_log.create({
        data: {
          user_id: payload.user_id ?? undefined,
          username: payload.username,
          login_ip: clientIp,
          user_agent: finalUserAgent,
          login_status: payload.login_status,
          login_message: this.trimMessage(payload.login_message, 190),
          platform_id: payload.platform_id ?? undefined,
          dept_id: payload.dept_id ?? undefined,
          shop_id: payload.shop_id ?? undefined,
          device_type: deviceInfo.deviceType,
        },
      });

      // 写入成功后,尝试同步 Redis 中的兜底缓存
      void this.flushFallbackLogs();
    } catch (e) {
      // 故障兜底:数据库写入失败时,缓存到 Redis
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.logger.error(`recordLoginLog DB write failed, caching to Redis: ${errorMessage}`);

      try {
        await this.redisService.lpush(
          this.FALLBACK_LOGIN_KEY,
          JSON.stringify({ ...payload, _cached_at: Date.now() }),
        );
      } catch (redisErr) {
        const redisErrorMessage = redisErr instanceof Error ? redisErr.message : String(redisErr);
        this.logger.error(`recordLoginLog Redis fallback also failed: ${redisErrorMessage}`);
      }
    }

    // 检查是否有异常需要告警
    if (payload.username === '未知账号' || (payload.user_id && !payload.platform_id)) {
      void this.alarmAdmins(
        '高危登录尝试',
        `检测到异常登录记录: 用户名[${payload.username}], 来源IP[${payload.login_ip || '未知'}]`,
        { ...payload },
      );
    }
  }

  /**
   * 检测连续登录失败次数
   * Requirements: 11.1
   */
  async getLoginFailureCount(username: string): Promise<number> {
    const key = `${this.LOGIN_FAILURE_PREFIX}${username}`;
    const count = await this.redisService.get(key);
    return count ? parseInt(count as string, 10) : 0;
  }

  /**
   * 记录登录失败
   * Requirements: 11.1, 11.3
   */
  async recordLoginFailure(username: string): Promise<number> {
    const key = `${this.LOGIN_FAILURE_PREFIX}${username}`;
    const count = await this.redisService.incr(key);

    // 设置1小时过期时间
    await this.redisService.expire(key, 3600);

    return typeof count === 'number' ? count : parseInt(String(count), 10) || 0;
  }

  /**
   * 清除登录失败记录
   */
  async clearLoginFailures(username: string): Promise<void> {
    const key = `${this.LOGIN_FAILURE_PREFIX}${username}`;
    await this.redisService.del(key);
  }

  /**
   * 检查账号是否被锁定
   * Requirements: 11.1, 11.2
   */
  async isAccountLocked(username: string): Promise<boolean> {
    const key = `${this.ACCOUNT_LOCK_PREFIX}${username}`;
    const locked = await this.redisService.get(key);
    return !!locked;
  }

  /**
   * 锁定账号
   * Requirements: 11.2, 11.3
   */
  async lockAccount(username: string, durationSeconds: number = 900): Promise<void> {
    const key = `${this.ACCOUNT_LOCK_PREFIX}${username}`;
    await this.redisService.set(key, '1', durationSeconds);

    // 记录锁定事件到登录日志
    await this.recordLoginLog({
      username,
      login_status: 0,
      login_message: `账号因连续登录失败已被锁定 ${Math.ceil(durationSeconds / 60)} 分钟`,
      login_ip: null,
      user_agent: null,
    });
  }

  /**
   * 发送告警给管理员
   * Requirements: 11.2
   */
  private async alarmAdmins(
    title: string,
    content: string,
    payload?: Record<string, any>,
  ): Promise<void> {
    try {
      // 查找活跃的管理员用户
      const admins = await this.prisma.sys_user.findMany({
        where: {
          is_deleted: 0,
          status: 1,
          roles: {
            some: {
              role: {
                role_code: {
                  in: ['admin', 'SUPER_ADMIN', 'ADMIN'],
                },
              },
            },
          },
        },
      });

      // 异步发送告警,不阻塞主流程
      for (const admin of admins) {
        void this.messageService.send({
          recipientId: admin.id,
          title: `[系统告警] ${title}`,
          content,
          messageType: 'system-alarm',
          bizType: 'login-alarm',
          payload,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send alarm to admins: ${error}`);
    }
  }

  /**
   * 截断消息内容
   */
  private trimMessage(value?: string | null, max = 500): string | undefined {
    if (!value) {
      return undefined;
    }
    if (value.length > max) {
      return value.slice(0, max) + '（内容已截取）';
    }
    return value;
  }

  /**
   * 故障恢复:将 Redis 兜底缓存中的日志同步写入数据库
   * Requirements: 19.1, 19.2, 19.3
   */
  private async flushFallbackLogs(): Promise<void> {
    try {
      while (true) {
        const raw = await this.redisService.rpop(this.FALLBACK_LOGIN_KEY);
        if (!raw) break;

        const payload: LoginLogPayload & { _cached_at?: number } = JSON.parse(raw as string);
        delete payload._cached_at;

        // 解析设备信息
        const deviceInfo = this.parseUserAgent(payload.user_agent);
        const formattedDevice = this.formatDeviceInfo(deviceInfo);
        const clientIp = this.getClientIp(payload.login_ip);

        let finalUserAgent = formattedDevice;
        if (payload.login_status === 0 && payload.login_message) {
          finalUserAgent = `${formattedDevice} (失败原因: ${payload.login_message})`;
        }

        await this.prisma.sys_login_log.create({
          data: {
            user_id: payload.user_id ?? undefined,
            username: payload.username,
            login_ip: clientIp,
            user_agent: finalUserAgent,
            login_status: payload.login_status,
            login_message: this.trimMessage(payload.login_message, 190),
            platform_id: payload.platform_id ?? undefined,
            dept_id: payload.dept_id ?? undefined,
            shop_id: payload.shop_id ?? undefined,
            device_type: deviceInfo.deviceType,
          },
        });
      }
    } catch (error) {
      // 同步失败不影响主流程
      this.logger.error(`Failed to flush fallback logs: ${error}`);
    }
  }

  /**
   * 验证时间戳有效性并自动修正
   * Requirements: 7.1, 7.2, 7.3
   */
  validateAndCorrectTimestamp(timestamp?: Date | null): { timestamp: Date; corrected: boolean } {
    const now = new Date();

    if (!timestamp) {
      return { timestamp: now, corrected: true };
    }

    // 检查时间戳是否有效
    const timestampTime = new Date(timestamp).getTime();
    if (isNaN(timestampTime)) {
      return { timestamp: now, corrected: true };
    }

    // 检查时间戳是否早于系统当前时间
    if (timestampTime < now.getTime()) {
      return { timestamp: now, corrected: true };
    }

    return { timestamp: new Date(timestamp), corrected: false };
  }
}
