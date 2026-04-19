import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { RedisService } from "../services/redis.service";
import {
  CONCURRENT_CONTROL_KEY,
  ConcurrentControlOptions,
  ConcurrentControlType,
} from "../decorators/concurrent-control.decorator";

/**
 * 并发控制拦截器
 */
@Injectable()
export class ConcurrentControlInterceptor implements NestInterceptor {
  private readonly queues = new Map<string, Promise<any>>();

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const options = this.reflector.get<ConcurrentControlOptions>(
      CONCURRENT_CONTROL_KEY,
      context.getHandler(),
    );

    if (!options) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const lockKey = this.generateLockKey(options.key || "", request);

    switch (options.type) {
      case ConcurrentControlType.OPTIMISTIC:
        return this.handleOptimisticLock(lockKey, next, options);

      case ConcurrentControlType.PESSIMISTIC:
        return this.handlePessimisticLock(lockKey, next, options);

      case ConcurrentControlType.QUEUE:
        return this.handleQueue(lockKey, next);

      default:
        return next.handle();
    }
  }

  /**
   * 乐观锁处理
   */
  private async handleOptimisticLock(
    key: string,
    next: CallHandler,
    options: ConcurrentControlOptions,
  ): Promise<Observable<any>> {
    let retries = options.retryTimes || 3;

    while (retries > 0) {
      try {
        // 获取当前版本号
        const version = await this.redisService.get(`version:${key}`);
        const currentVersion = version ? parseInt(version, 10) : 0;

        // 执行业务逻辑
        const result = await next.handle().toPromise();

        // 尝试更新版本号（使用Lua脚本实现CAS操作）
        const newVersion = currentVersion + 1;
        const script = `
          local key = KEYS[1]
          local expected = tonumber(ARGV[1])
          local newVal = tonumber(ARGV[2])
          local current = redis.call('GET', key)
          if current == false or tonumber(current) == expected then
            redis.call('SET', key, newVal)
            return 1
          else
            return 0
          end
        `;

        const updated = await this.redisService.eval(script, [
          `version:${key}`,
        ], [String(currentVersion), String(newVersion)]);

        if (updated === 1 || !version) {
          // 更新成功或首次创建
          if (!version) {
            await this.redisService.set(`version:${key}`, "1", 3600);
          }
          return new Observable((subscriber) => {
            subscriber.next(result);
            subscriber.complete();
          });
        }

        // 版本冲突，重试
        retries--;
        if (retries > 0) {
          await this.delay(options.retryDelay || 100);
        }
      } catch (error) {
        throw error;
      }
    }

    throw new HttpException(
      {
        code: HttpStatus.CONFLICT,
        message: "数据已被其他用户修改，请刷新后重试",
        data: null,
      },
      HttpStatus.CONFLICT,
    );
  }

  /**
   * 悲观锁处理
   */
  private async handlePessimisticLock(
    key: string,
    next: CallHandler,
    options: ConcurrentControlOptions,
  ): Promise<Observable<any>> {
    const lockKey = `lock:${key}`;
    const lockValue = `${Date.now()}-${Math.random()}`;
    const timeout = options.timeout || 5000;

    let retries = options.retryTimes || 3;

    while (retries > 0) {
      try {
        // 尝试获取锁
        const acquired = await this.redisService.setNx(
          lockKey,
          lockValue,
          Math.ceil(timeout / 1000),
        );

        if (acquired) {
          try {
            // 执行业务逻辑
            const result = await next.handle().toPromise();

            return new Observable((subscriber) => {
              subscriber.next(result);
              subscriber.complete();
            });
          } finally {
            // 释放锁（使用Lua脚本确保原子性）
            const script = `
              if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
              else
                return 0
              end
            `;
            await this.redisService.eval(script, [lockKey], [lockValue]);
          }
        }

        // 获取锁失败，重试
        retries--;
        if (retries > 0) {
          await this.delay(options.retryDelay || 100);
        }
      } catch (error) {
        // 确保释放锁
        const script = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        await this.redisService.eval(script, [lockKey], [lockValue]);
        throw error;
      }
    }

    throw new HttpException(
      {
        code: HttpStatus.TOO_MANY_REQUESTS,
        message: "操作繁忙，请稍后再试",
        data: null,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /**
   * 队列控制处理
   */
  private async handleQueue(
    key: string,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const queueKey = `queue:${key}`;

    // 获取或创建队列
    let queuePromise = this.queues.get(queueKey);

    if (!queuePromise) {
      queuePromise = Promise.resolve();
      this.queues.set(queueKey, queuePromise);
    }

    // 将当前请求加入队列
    queuePromise = queuePromise
      .then(async () => {
        try {
          const result = await next.handle().toPromise();
          return result;
        } catch (error) {
          throw error;
        }
      })
      .finally(() => {
        // 清理队列
        if (this.queues.get(queueKey) === queuePromise) {
          this.queues.delete(queueKey);
        }
      });

    this.queues.set(queueKey, queuePromise);

    const result = await queuePromise;
    return new Observable((subscriber) => {
      subscriber.next(result);
      subscriber.complete();
    });
  }

  /**
   * 生成锁Key
   */
  private generateLockKey<T extends Record<string, any>>(
    template: string,
    request: T,
  ): string {
    let key = template;

    // 替换参数占位符
    const matches = template.match(/\{([^}]+)\}/g);
    if (matches) {
      matches.forEach((match) => {
        const param = match.slice(1, -1);
        const value =
          request.params?.[param] ||
          request.body?.[param] ||
          request.query?.[param];
        key = key.replace(match, value || "");
      });
    }

    return key;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
