import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RedisService } from "../services/redis.service";
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
  RateLimitType,
} from "../decorators/rate-limiter.decorator";

/**
 * 限流守卫
 * 实现令牌桶算法和滑动窗口算法
 */
@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly logger = new Logger(RateLimiterGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const key = this.generateKey(request, options.type || RateLimitType.IP);

    try {
      const allowed = await this.checkRateLimit(key, options);

      if (!allowed) {
        this.logger.warn(
          `Rate limit exceeded for ${options.type}: ${key}, limit: ${options.limit}/${options.window}s`,
        );

        throw new HttpException(
          {
            code: HttpStatus.TOO_MANY_REQUESTS,
            message: options.message || "请求过于频繁，请稍后再试",
            data: null,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Rate limiter error: ${errorMessage}`);
      // Redis故障时降级，允许请求通过
      return true;
    }
  }

  /**
   * 生成限流Key
   */
  private generateKey(request: any, type: RateLimitType): string {
    const prefix = "rate_limit";

    switch (type) {
      case RateLimitType.IP:
        const ip = request.ip || request.connection.remoteAddress;
        return `${prefix}:ip:${ip}`;

      case RateLimitType.USER:
        const userId = request.user?.id || "anonymous";
        return `${prefix}:user:${userId}`;

      case RateLimitType.API:
        const path = request.route?.path || request.url;
        return `${prefix}:api:${path}`;

      case RateLimitType.GLOBAL:
        return `${prefix}:global`;

      default:
        return `${prefix}:unknown`;
    }
  }

  /**
   * 检查限流（滑动窗口算法）
   */
  private async checkRateLimit(
    key: string,
    options: RateLimitOptions,
  ): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - options.window * 1000;

    // 使用Redis的eval脚本实现滑动窗口
    const script = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local windowStart = tonumber(ARGV[2])
      local limit = tonumber(ARGV[3])
      local window = tonumber(ARGV[4])

      -- 移除窗口外的记录
      redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)

      -- 获取当前窗口内的请求数
      local count = redis.call('ZCARD', key)

      if count < limit then
        -- 添加当前请求
        redis.call('ZADD', key, now, now .. '-' .. math.random())
        -- 设置过期时间
        redis.call('EXPIRE', key, window)
        return 1
      else
        return 0
      end
    `;

    const result = await this.redisService.eval(script, [key], [
      String(now),
      String(windowStart),
      String(options.limit),
      String(options.window),
    ]);

    return result === 1;
  }
}
