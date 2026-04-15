import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../services/redis.service';
import { ANTISHAKE_KEY } from '../decorators/antishake.decorator';

/**
 * 后端强制防抖守卫 (V3.0)
 * 防止极短时间内的重复请求（如用户连击）。
 */
@Injectable()
export class AntiShakeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const controller = context.getClass();

    const ms = this.reflector.getAllAndOverride<number>(ANTISHAKE_KEY, [handler, controller]);
    if (!ms) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const ip = request.headers['x-forwarded-for']?.split(',')[0] || request.ip || request.socket.remoteAddress;
    const path = request.originalUrl.split('?')[0];

    const identifier = user?.sub || ip;
    const key = `antishake:${identifier}:${path}`;

    // 使用 setNx 原子锁，过期时间设为防抖时长
    const acquired = await this.redisService.setNx(key, '1', ms / 1000);
    
    if (acquired !== 'OK') {
      throw new HttpException({
        status: HttpStatus.TOO_MANY_REQUESTS,
        error: '操作过快，请稍后再试',
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
