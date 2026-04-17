import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, from, lastValueFrom } from "rxjs";
import { BusinessLockService } from "../services/business-lock.service";
import {
  DISTRIBUTED_LOCK_KEY,
  DistributedLockOptions,
} from "../decorators/distributed-lock.decorator";

/**
 * 分布式业务锁拦截器 (V3.0)
 * 配合 @DistributedLock 装饰器使用，自动管理锁的生命周期。
 */
@Injectable()
export class BusinessLockInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly businessLockService: BusinessLockService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const handler = context.getHandler();
    const controller = context.getClass();

    const options = this.reflector.getAllAndOverride<DistributedLockOptions>(
      DISTRIBUTED_LOCK_KEY,
      [handler, controller],
    );
    if (!options) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();

    // 解析 Key 模板 (如 biz:{body.id})
    const resolvedKey = this.resolveKey(options.key, request);
    const ttl = options.ttl || 60;

    // 使用 BusinessLockService 执行，它内部处理了 acquire 和 release
    // 由于 runExclusive 是 Promise，我们需要将其转回 Observable
    const resultPromise = this.businessLockService.runExclusive(
      resolvedKey,
      ttl,
      async () => {
        return await lastValueFrom(next.handle());
      },
    );

    return from(resultPromise);
  }

  /**
   * 简单的 Key 模板解析逻辑
   */
  private resolveKey(template: string, request: Record<string, any>): string {
    return template.replace(/{([^}]+)}/g, (_, path) => {
      const parts = path.split(".");
      let val: any = request;
      for (const part of parts) {
        val = val?.[part];
      }
      return val ?? "unknown";
    });
  }
}
