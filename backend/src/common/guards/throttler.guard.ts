import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../services/redis.service';

@Injectable()
export class ThrottlerGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
    
    const request = context.switchToHttp().getRequest();
    const ip = request.headers['x-forwarded-for']?.split(',')[0] || request.ip || request.socket.remoteAddress;
    const path = request.originalUrl.split('?')[0];
    
    // 基础限流规则：1 分钟 100 次。如果是 Public 接口，限制更严：1 分钟 30 次
    const limit = isPublic ? 30 : 100;
    const ttl = 60;
    
    const key = `throttler:${ip}:${path}`;
    const current = await this.redisService.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= limit) {
      throw new HttpException({
        status: HttpStatus.TOO_MANY_REQUESTS,
        error: '操作过于频繁，请稍后再试',
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    // 原子自增模拟 (由于 RedisService 暂无 incr，先用 set 实现，生产环境应补全 INCR)
    await this.redisService.set(key, (count + 1).toString(), ttl);
    return true;
  }
}
