import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 全局工业级异常追踪过滤器 (V6.0)
 * 职责：捕获并持久化所有 500 错误至 sys_error_log，实现异常的可复现与告警。
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly prisma: PrismaService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : (exception as Error).message || 'Internal Server Error';

    // 针对 500 错误开启深度追踪 (Error Tracing)
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      const errorStack = (exception as Error).stack;
      this.logger.error(`[V6.0 Error] 致命错误已捕获: ${request.method} ${request.url}`, errorStack);

      try {
        // 持久化到 sys_error_log
        await (this.prisma as any).sys_error_log.create({
          data: {
            user_id: request.user?.sub,
            username: request.user?.username,
            request_method: request.method,
            api_path: request.url,
            request_params: {
              query: request.query,
              params: request.params,
              body: request.body,
            },
            error_message: (exception as Error).message,
            stack_trace: errorStack,
          },
        });
      } catch (e) {
        this.logger.error('持久化异常日志失败', (e as Error).stack);
      }
    }

    response.status(status).json({
      code: status,
      message: typeof message === 'string' ? message : (message as any).message || '请求执行失败',
      data: null,
    });
  }
}
