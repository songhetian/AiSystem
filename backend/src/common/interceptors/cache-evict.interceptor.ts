import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../services/redis.service';
import { CACHE_EVICT_KEY, CacheEvictOptions } from '../decorators/cache-evict.decorator';

/**
 * 缓存清除拦截器 (V1.0)
 * 
 * 职责：在数据更新时自动清除相关缓存
 */
@Injectable()
export class CacheEvictInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheEvictInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const handler = context.getHandler();
    const controller = context.getClass();

    // 获取缓存清除配置
    const evictOptions = this.reflector.getAllAndOverride<CacheEvictOptions>(CACHE_EVICT_KEY, [
      handler,
      controller,
    ]);

    // 如果没有配置缓存清除，直接执行
    if (!evictOptions) {
      return next.handle();
    }

    // 如果Redis不可用，直接执行
    if (!this.redisService.isReady()) {
      this.logger.warn('Redis not ready, skipping cache eviction');
      return next.handle();
    }

    // 方法执行前清除缓存
    if (evictOptions.beforeInvocation) {
      await this.evictCache(evictOptions.pattern);
    }

    // 方法执行后清除缓存
    return next.handle().pipe(
      tap(async () => {
        if (!evictOptions.beforeInvocation) {
          await this.evictCache(evictOptions.pattern);
        }
      }),
    );
  }

  /**
   * 清除缓存
   */
  private async evictCache(pattern: string) {
    try {
      const count = await this.redisService.deleteByPattern(pattern);
      this.logger.debug(`Cache evicted: ${pattern} (${count} keys deleted)`);
    } catch (error) {
      this.logger.error(`Failed to evict cache: ${pattern}`, error);
    }
  }
}
