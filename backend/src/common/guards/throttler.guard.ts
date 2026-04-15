import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../services/redis.service';
import { THROTTLE_LIMIT_KEY, THROTTLE_TTL_KEY } from '../decorators/throttle.decorator';
import { IS_PUBLIC_KEY } from '../public.decorator';

/**
 * 工业级全局限流守卫 (V3.0)
 * 支持全局默认策略、Public 接口策略以及自定义 @Throttle 装饰器重载。
 */
@Injectable()
export class ThrottlerGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const controller = context.getClass();

    // 1. 获取配额配置 (优先级：装饰器 > Public > 全局)
    const decoratorLimit = this.reflector.getAllAndOverride<number>(THROTTLE_LIMIT_KEY, [handler, controller]);
    const decoratorTtl = this.reflector.getAllAndOverride<number>(THROTTLE_TTL_KEY, [handler, controller]);
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [handler, controller]);

    const limit = decoratorLimit ?? (isPublic ? 30 : 100);
    const ttl = decoratorTtl ?? 60;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const ip = request.headers['x-forwarded-for']?.split(',')[0] || request.ip || request.socket.remoteAddress;
    const path = request.originalUrl.split('?')[0];

    // 2. 生成限流 Key (优先基于 UserID，无法获取则基于 IP)
    const identifier = user?.sub || ip;
    const key = `throttler:${identifier}:${path}`;

    // 3. 原子自增逻辑 (解决竞态条件)
    const current = await this.redisService.incr(key);
    
    // 如果是第一次请求，设置过期时间
    if (current && current === 1) {
      await this.redisService.expire(key, ttl);
    }

    if (current && current > limit) {
      throw new HttpException({
        status: HttpStatus.TOO_MANY_REQUESTS,
        error: `请求过于频繁，当前配额为 ${ttl}秒/${limit}次，请稍后再试`,
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
