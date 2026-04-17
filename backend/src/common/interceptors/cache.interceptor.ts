import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, of } from "rxjs";
import { tap } from "rxjs/operators";
import { RedisService } from "../services/redis.service";
import { CACHE_KEY, CacheOptions } from "../decorators/cache.decorator";
import { IS_PUBLIC_KEY } from "../public.decorator";

/**
 * 缓存拦截器 (V1.0)
 *
 * 职责：
 * 1. 拦截带有 @Cache 装饰器的接口
 * 2. 先从Redis获取缓存
 * 3. 缓存未命中则执行原方法
 * 4. 将结果写入Redis缓存
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const handler = context.getHandler();
    const controller = context.getClass();

    // 获取缓存配置
    const cacheOptions = this.reflector.getAllAndOverride<CacheOptions>(
      CACHE_KEY,
      [handler, controller],
    );

    // 如果没有配置缓存，直接执行
    if (!cacheOptions) {
      return next.handle();
    }

    // 如果Redis不可用，直接执行
    if (!this.redisService.isReady()) {
      this.logger.warn("Redis not ready, skipping cache");
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 生成缓存Key
    const cacheKey = this.generateCacheKey(
      cacheOptions,
      handler.name,
      user?.sub,
      request.params,
      request.query,
      request.body,
    );

    try {
      // 尝试从缓存获取
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit: ${cacheKey}`);
        return of(JSON.parse(cached));
      }

      this.logger.debug(`Cache miss: ${cacheKey}`);

      // 缓存未命中，执行原方法
      return next.handle().pipe(
        tap(async (data) => {
          // 将结果写入缓存
          try {
            await this.redisService.set(
              cacheKey,
              JSON.stringify(data),
              cacheOptions.ttl || 60,
            );
            this.logger.debug(
              `Cache set: ${cacheKey} (TTL: ${cacheOptions.ttl}s)`,
            );
          } catch (error) {
            this.logger.error(`Failed to set cache: ${cacheKey}`, error);
          }
        }),
      );
    } catch (error) {
      this.logger.error(`Cache error: ${cacheKey}`, error);
      // 缓存出错，直接执行原方法
      return next.handle();
    }
  }

  /**
   * 生成缓存Key
   */
  private generateCacheKey(
    options: CacheOptions,
    methodName: string,
    userId?: string,
    params?: any,
    query?: any,
    body?: any,
  ): string {
    const prefix = options.prefix || methodName;
    const parts = [`cache:${prefix}`];

    // 根据用户ID生成Key
    if (options.byUser && userId) {
      parts.push(`user:${userId}`);
    }

    // 根据请求参数生成Key
    if (options.byParams) {
      const paramsStr = this.serializeParams({ ...params, ...query, ...body });
      if (paramsStr) {
        parts.push(paramsStr);
      }
    }

    return parts.join(":");
  }

  /**
   * 序列化参数
   */
  private serializeParams(params: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) {
      return "";
    }

    try {
      // 排序参数，确保相同参数生成相同的Key
      const sorted = Object.keys(params)
        .sort()
        .reduce(
          (acc, key) => {
            acc[key] = params[key];
            return acc;
          },
          {} as Record<string, any>,
        );

      return JSON.stringify(sorted);
    } catch (error) {
      return "";
    }
  }
}
