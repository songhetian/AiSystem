import { CallHandler, ConflictException, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, from, map, mergeMap, of, throwError } from 'rxjs';
import { IdempotencyService } from '../services/idempotency.service';

function normalizeHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();

    if (!request) {
      return next.handle();
    }

    const method = request.method?.toUpperCase?.() ?? 'GET';
    if (!['POST', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const idempotencyKey = normalizeHeaderValue(request.headers?.['x-idempotency-key'])?.trim();
    if (!idempotencyKey) {
      return next.handle();
    }

    const userId = request.user?.sub ?? 'anonymous';
    const path = request.originalUrl?.split('?')[0] ?? request.url ?? '';
    const requestKey = `${userId}:${method}:${path}:${idempotencyKey}`;
    const cached = await this.idempotencyService.getCompleted(requestKey);

    this.setDebugHeaders(response, {
      key: idempotencyKey
    });

    if (cached !== undefined) {
      this.setDebugHeaders(response, {
        status: 'replayed',
        store: cached.store
      });
      return of(cached.body);
    }

    const begin = await this.idempotencyService.begin(requestKey);
    if (!begin.acquired) {
      this.setDebugHeaders(response, {
        status: 'conflict',
        store: begin.store
      });
      throw new ConflictException('请求正在处理中，请勿重复提交');
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
    }
  ) {
    if (process.env.IDEMPOTENCY_DEBUG_HEADERS === 'false' || !response?.setHeader) {
      return;
    }

    if (values.key) {
      response.setHeader('x-idempotency-key', values.key);
    }

    if (values.status) {
      response.setHeader('x-idempotency-status', values.status);
    }

    if (values.store) {
      response.setHeader('x-idempotency-store', values.store);
    }
  }
}
