import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Performance');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        if (duration > 200) {
          this.logger.warn(`SLOW REQUEST: ${method} ${url} - ${duration}ms`);
        } else {
          this.logger.debug(`REQUEST: ${method} ${url} - ${duration}ms`);
        }
      }),
    );
  }
}