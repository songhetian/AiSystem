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
export class StandardResponseInterceptor<T extends StandardResponse<any>>
  implements NestInterceptor<T, StandardResponse<any>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<StandardResponse<any>> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { headers?: Record<string, string | undefined> }>();
    const accept = request?.headers?.accept ?? '';

    if (accept.includes('text/event-stream')) {
      return next.handle() as Observable<StandardResponse<any>>;
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
          return data as unknown as StandardResponse<any>;
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
