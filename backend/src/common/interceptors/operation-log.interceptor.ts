import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSION_KEY } from '../permission.decorator';
import { AuditLogService } from '../services/audit-log.service';
import { MaskUtil } from '../utils/mask.util';

function getRequestIp(request: any) {
  return (
    request.headers?.['x-forwarded-for']?.split(',')?.[0]?.trim() ||
    request.ip ||
    request.socket?.remoteAddress ||
    undefined
  );
}

function summarizeResponse(data: unknown) {
  if (data === null || data === undefined) {
    return undefined;
  }

  if (Array.isArray(data)) {
    return { type: 'array', length: data.length };
  }

  if (typeof data === 'object') {
    return {
      type: 'object',
      keys: Object.keys(data as Record<string, unknown>).slice(0, 12)
    };
  }

  return { type: typeof data, value: String(data) };
}

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    if (!request) {
      return next.handle();
    }

    const method = request.method?.toUpperCase?.() ?? 'GET';
    const path = request.originalUrl?.split('?')[0] ?? request.url ?? '';
    const isPublicLogin = path === '/api/auth/login';
    const shouldLog = isPublicLogin || method !== 'GET';

    if (!shouldLog) {
      return next.handle();
    }

    const permissionCode = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    const moduleName = path.split('/').filter(Boolean)[1] ?? 'unknown';

    const persist = async (status: number, message?: string, responseSummary?: unknown) => {
      const userId = request.user?.sub as string | undefined;
      let userInfo: any = null;

      if (userId) {
        userInfo = await this.prisma.sys_user.findUnique({ where: { id: userId } });
      }

      await this.auditLogService.logOperation({
        user_id: userInfo?.id ?? userId,
        username: userInfo?.username ?? request.user?.username,
        request_method: method,
        api_path: path,
        api_name: permissionCode ?? undefined,
        operation_module: moduleName,
        request_ip: getRequestIp(request),
        user_agent: request.headers?.['user-agent'],
        operation_message: status === 1 ? message : `失败原因：${message}`,
        request_params: MaskUtil.maskObject({
          params: request.params,
          query: request.query,
          body: request.body
        }),
        response_summary: responseSummary,
        diff_content: request.diffContent,
        platform_id: userInfo?.platform_id,
        dept_id: userInfo?.dept_id,
        shop_id: userInfo?.shop_id
      });

      // 异常告警与细节对齐由 AuditLogService 统一处理
    };

    return next.handle().pipe(
      tap((data) => {
        void persist(1, 'success', summarizeResponse(data));
      }),
      catchError((error) => {
        const errorMessage = error?.message || error?.response?.message || '未知错误';
        void persist(0, `失败原因：${errorMessage}`);
        return throwError(() => error);
      })
    );
  }
}
