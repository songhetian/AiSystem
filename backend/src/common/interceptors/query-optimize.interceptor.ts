import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  RequestTimeoutException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, tap, timeout } from 'rxjs/operators';
import { QUERY_OPTIMIZE_KEY, QueryOptimizeOptions } from '../decorators/query-optimize.decorator';

/**
 * 查询优化拦截器 (V1.0)
 * 
 * 职责：
 * 1. 记录查询耗时
 * 2. 慢查询告警
 * 3. 查询超时保护
 */
@Injectable()
export class QueryOptimizeInterceptor implements NestInterceptor {
  private readonly logger = new Logger(QueryOptimizeInterceptor.name);

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const controller = context.getClass();

    // 获取查询优化配置
    const options = this.reflector.getAllAndOverride<QueryOptimizeOptions>(
      QUERY_OPTIMIZE_KEY,
      [handler, controller],
    );

    // 如果没有配置，直接执行
    if (!options) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const methodName = handler.name;
    const startTime = Date.now();

    return next.handle().pipe(
      // 超时保护
      timeout(options.timeout || 5000),
      // 记录查询耗时
      tap(() => {
        const duration = Date.now() - startTime;
        
        // 慢查询告警
        if (options.logSlowQuery && duration > (options.slowQueryThreshold || 200)) {
          this.logger.warn(
            `[Slow Query] ${methodName} took ${duration}ms (threshold: ${options.slowQueryThreshold}ms) | ` +
            `URL: ${request.method} ${request.url} | ` +
            `User: ${request.user?.username || 'Anonymous'}`,
          );
        } else {
          this.logger.debug(`[Query] ${methodName} took ${duration}ms`);
        }
      }),
      // 超时错误处理
      catchError((error) => {
        if (error instanceof TimeoutError) {
          const duration = Date.now() - startTime;
          this.logger.error(
            `[Query Timeout] ${methodName} exceeded ${options.timeout}ms (actual: ${duration}ms) | ` +
            `URL: ${request.method} ${request.url} | ` +
            `User: ${request.user?.username || 'Anonymous'}`,
          );
          return throwError(() => new RequestTimeoutException('查询超时，请稍后重试'));
        }
        return throwError(() => error);
      }),
    );
  }
}
