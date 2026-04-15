import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface StandardResponse<T> {
  code: number;
  message: string;
  data: T;
}

@Injectable()
export class StandardResponseInterceptor<T>
  implements NestInterceptor<T, StandardResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<StandardResponse<T> | T> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { headers?: Record<string, string | undefined> }>();
    const accept = request?.headers?.accept ?? '';

    if (accept.includes('text/event-stream')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        if (
          data &&
          typeof data === 'object' &&
          'code' in (data as Record<string, unknown>) &&
          'message' in (data as Record<string, unknown>) &&
          'data' in (data as Record<string, unknown>)
        ) {
          return data as StandardResponse<T>;
        }

        const response = http.getResponse<{ statusCode?: number }>();
        return {
          code: response?.statusCode ?? 200,
          message: 'success',
          data,
        };
      }),
    );
  }
}
