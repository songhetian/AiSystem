import { CallHandler, ConflictException, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, catchError, from, map, mergeMap, of, throwError } from 'rxjs';
import { IdempotencyService } from '../services/idempotency.service';
import { IDEMPOTENT_KEY, IdempotentOptions } from '../decorators/idempotent.decorator';
import { CryptoUtil } from '../utils/crypto.util';

function normalizeHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/**
 * 工业级幂等拦截器 (V3.0)
 * 支持基于 Header 的被动幂等 (Passive) 和基于请求指纹的主动幂等 (Active)。
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly reflector: Reflector
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();

    if (!request) {
      return next.handle();
    }

    const handler = context.getHandler();
    const controller = context.getClass();

    // 1. 获取幂等配置 (V3.0 装饰器支持)
    const options = this.reflector.getAllAndOverride<IdempotentOptions>(IDEMPOTENT_KEY, [handler, controller]);
    
    // 默认行为：仅对 POST, PATCH, DELETE 开启。如果没有装饰器且没有 Header，则跳过。
    const method = request.method?.toUpperCase?.() ?? 'GET';
    const isMutation = ['POST', 'PATCH', 'DELETE'].includes(method);
    const headerKey = normalizeHeaderValue(request.headers?.['x-idempotency-key'])?.trim();

    if (!isMutation && !options) {
      return next.handle();
    }

    // 2. 确定幂等 Key
    let idempotencyKey = headerKey;
    let mode: 'passive' | 'active' = options?.mode || (headerKey ? 'passive' : 'none' as any);

    if (!idempotencyKey && options?.mode === 'active') {
      // 主动模式：自动根据 Payload 生成指纹
      const payload = {
        body: request.body,
        query: request.query,
        params: request.params
      };
      idempotencyKey = `fp:${CryptoUtil.generateFingerprint(payload)}`;
      mode = 'active';
    }

    if (!idempotencyKey) {
      return next.handle();
    }

    const userId = request.user?.sub ?? 'anonymous';
    const path = request.originalUrl?.split('?')[0] ?? request.url ?? '';
    const requestKey = `${userId}:${method}:${path}:${idempotencyKey}`;
    
    // 3. 检查缓存结果
    const cached = await this.idempotencyService.getCompleted(requestKey);

    this.setDebugHeaders(response, {
      key: idempotencyKey,
      mode
    });

    if (cached !== undefined) {
      this.setDebugHeaders(response, {
        status: 'replayed',
        store: cached.store
      });
      return of(cached.body);
    }

    // 4. 尝试获取并发锁
    const begin = await this.idempotencyService.begin(requestKey);
    if (!begin.acquired) {
      this.setDebugHeaders(response, {
        status: 'conflict',
        store: begin.store
      });
      throw new ConflictException('请求正忙或已在处理中，请勿重复提交');
    }

    this.setDebugHeaders(response, {
      status: 'created',
      store: begin.store
    });

    return next.handle().pipe(
      mergeMap((body) =>
        from(this.idempotencyService.complete(requestKey, body)).pipe(
          map(() => body)
        )
      ),
      catchError((error) =>
        from(this.idempotencyService.fail(requestKey)).pipe(
          mergeMap(() => throwError(() => error))
        )
      )
    );
  }

  private setDebugHeaders(
    response: { setHeader?: (name: string, value: string) => void } | undefined,
    values: {
      key?: string;
      status?: 'created' | 'replayed' | 'conflict';
      store?: 'redis' | 'memory';
      mode?: 'passive' | 'active';
    }
  ) {
    if (process.env.IDEMPOTENCY_DEBUG_HEADERS === 'false' || !response?.setHeader) {
      return;
    }

    if (values.key) response.setHeader('x-idempotency-key', values.key);
    if (values.status) response.setHeader('x-idempotency-status', values.status);
    if (values.store) response.setHeader('x-idempotency-store', values.store);
    if (values.mode) response.setHeader('x-idempotency-mode', values.mode);
  }
}
