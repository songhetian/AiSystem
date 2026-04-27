import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../services/redis.service';
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

/**
 * 操作日志拦截器 (V5.0 增强版)
 * 新增功能：
 * 1. 记录执行时间
 * 2. 字段级变更详情（对比修改前后数据）
 * 3. ID自动转换为真实姓名/名称
 * 4. Redis故障兜底（List缓存）
 * 5. 异步记录，不影响主业务
 */
@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(OperationLogInterceptor.name);
  private readonly LOG_QUEUE_KEY = 'operation_log:queue';

  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
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

    // 记录开始时间
    const startTime = Date.now();

    const permissionCode = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    const moduleName = path.split('/').filter(Boolean)[1] ?? 'unknown';

    const persist = async (status: number, message?: string, responseSummary?: unknown) => {
      try {
        // 计算执行时间
        const executionTime = Date.now() - startTime;

        const userId = request.user?.sub as string | undefined;
        let userInfo: any = null;

        if (userId) {
          userInfo = await this.prisma.sys_user.findUnique({ where: { id: userId } });
        }

        // 提取字段变更详情
        const diffContent = await this.extractDiffContent(request, method, path);

        const logData = {
          user_id: userInfo?.id ?? userId,
          username: userInfo?.username ?? request.user?.username,
          request_method: method,
          api_path: path,
          api_name: permissionCode ?? undefined,
          operation_module: moduleName,
          request_ip: getRequestIp(request),
          user_agent: request.headers?.['user-agent'],
          operation_status: status,
          operation_message: status === 1 ? message : `失败原因：${message}`,
          request_params: MaskUtil.maskObject({
            params: request.params,
            query: request.query,
            body: request.body
          }),
          response_summary: responseSummary,
          diff_content: diffContent,
          platform_id: userInfo?.platform_id,
          dept_id: userInfo?.dept_id,
          shop_id: userInfo?.shop_id,
          execution_time: executionTime,
        };

        // 异步记录日志（不阻塞主业务）
        this.asyncLogOperation(logData);
      } catch (error) {
        this.logger.error(`操作日志记录失败: ${error.message}`);
      }
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

  /**
   * 异步记录操作日志
   * 优先使用数据库，失败时使用Redis队列兜底
   */
  private async asyncLogOperation(logData: any): Promise<void> {
    try {
      // 尝试直接写入数据库
      await this.auditLogService.logOperation(logData);
    } catch (error) {
      this.logger.warn(`数据库写入失败，使用Redis队列兜底: ${error.message}`);

      try {
        // Redis故障兜底：将日志推入队列
        await this.redisService.rpush(this.LOG_QUEUE_KEY, JSON.stringify(logData));
      } catch (redisError) {
        this.logger.error(`Redis队列写入也失败: ${redisError.message}`);
      }
    }
  }

  /**
   * 提取字段级变更详情
   * 对比修改前后的数据，记录具体变更的字段
   */
  private async extractDiffContent(request: any, method: string, path: string): Promise<any> {
    // 只对PUT/PATCH请求记录变更详情
    if (method !== 'PUT' && method !== 'PATCH') {
      return undefined;
    }

    try {
      const body = request.body;
      if (!body || typeof body !== 'object') {
        return undefined;
      }

      // 提取资源ID（从URL或body中）
      const resourceId = this.extractResourceId(request, path);
      if (!resourceId) {
        return undefined;
      }

      // 根据路径判断资源类型并获取旧数据
      const oldData = await this.fetchOldData(path, resourceId);
      if (!oldData) {
        return undefined;
      }

      // 对比字段变更
      const changes = this.compareData(oldData, body);

      // ID转换为名称
      const enrichedChanges = await this.enrichChangesWithNames(changes, path);

      return enrichedChanges.length > 0 ? enrichedChanges : undefined;
    } catch (error) {
      this.logger.warn(`提取变更详情失败: ${error.message}`);
      return undefined;
    }
  }

  /**
   * 从请求中提取资源ID
   */
  private extractResourceId(request: any, path: string): string | null {
    // 优先从URL参数中提取
    if (request.params?.id) {
      return request.params.id;
    }

    // 从body中提取
    if (request.body?.id) {
      return request.body.id;
    }

    // 从URL路径中提取（最后一段）
    const segments = path.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];

    // 检查是否为有效的ID格式（CUID或UUID）
    if (lastSegment && /^[a-z0-9]{20,}$/i.test(lastSegment)) {
      return lastSegment;
    }

    return null;
  }

  /**
   * 根据路径获取旧数据
   */
  private async fetchOldData(path: string, resourceId: string): Promise<any> {
    try {
      // 根据路径判断资源类型
      if (path.includes('/users')) {
        return await this.prisma.sys_user.findUnique({ where: { id: resourceId } });
      } else if (path.includes('/departments')) {
        return await this.prisma.sys_department.findUnique({ where: { id: resourceId } });
      } else if (path.includes('/roles')) {
        return await this.prisma.sys_role.findUnique({ where: { id: resourceId } });
      } else if (path.includes('/employees')) {
        return await this.prisma.hr_employee.findUnique({ where: { id: resourceId } });
      }
      // 可以继续添加其他资源类型...

      return null;
    } catch (error) {
      this.logger.warn(`获取旧数据失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 对比数据变更
   */
  private compareData(oldData: any, newData: any): Array<{ field: string; oldValue: any; newValue: any }> {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    // 遍历新数据的所有字段
    for (const key of Object.keys(newData)) {
      // 跳过系统字段
      if (['create_time', 'update_time', 'is_deleted'].includes(key)) {
        continue;
      }

      const oldValue = oldData[key];
      const newValue = newData[key];

      // 值发生变化
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          oldValue: oldValue,
          newValue: newValue,
        });
      }
    }

    return changes;
  }

  /**
   * ID转换为名称
   * 将变更记录中的ID字段转换为可读的名称
   */
  private async enrichChangesWithNames(
    changes: Array<{ field: string; oldValue: any; newValue: any }>,
    path: string
  ): Promise<Array<{ field: string; fieldName: string; oldValue: any; newValue: any; oldName?: string; newName?: string }>> {
    const enriched = [];

    for (const change of changes) {
      const enrichedChange: any = {
        ...change,
        fieldName: this.getFieldDisplayName(change.field),
      };

      // 尝试转换ID为名称
      if (change.field.endsWith('_id') || change.field === 'user_id' || change.field === 'dept_id') {
        const { oldName, newName } = await this.resolveIdToName(change.field, change.oldValue, change.newValue);
        if (oldName) enrichedChange.oldName = oldName;
        if (newName) enrichedChange.newName = newName;
      }

      enriched.push(enrichedChange);
    }

    return enriched;
  }

  /**
   * 获取字段显示名称
   */
  private getFieldDisplayName(field: string): string {
    const fieldNameMap: Record<string, string> = {
      name: '姓名',
      username: '用户名',
      phone: '手机号',
      email: '邮箱',
      status: '状态',
      dept_id: '部门',
      role_id: '角色',
      platform_id: '平台',
      shop_id: '门店',
      position: '职位',
      salary: '薪资',
      entry_date: '入职日期',
      // 可以继续添加更多字段映射...
    };

    return fieldNameMap[field] || field;
  }

  /**
   * 将ID解析为名称
   */
  private async resolveIdToName(
    field: string,
    oldId: any,
    newId: any
  ): Promise<{ oldName?: string; newName?: string }> {
    try {
      let oldName: string | undefined;
      let newName: string | undefined;

      if (field === 'user_id') {
        if (oldId) {
          const oldUser = await this.prisma.sys_user.findUnique({ where: { id: oldId } });
          oldName = oldUser?.name || oldUser?.username;
        }
        if (newId) {
          const newUser = await this.prisma.sys_user.findUnique({ where: { id: newId } });
          newName = newUser?.name || newUser?.username;
        }
      } else if (field === 'dept_id') {
        if (oldId) {
          const oldDept = await this.prisma.sys_department.findUnique({ where: { id: oldId } });
          oldName = oldDept?.dept_name;
        }
        if (newId) {
          const newDept = await this.prisma.sys_department.findUnique({ where: { id: newId } });
          newName = newDept?.dept_name;
        }
      } else if (field === 'role_id') {
        if (oldId) {
          const oldRole = await this.prisma.sys_role.findUnique({ where: { id: oldId } });
          oldName = oldRole?.role_name;
        }
        if (newId) {
          const newRole = await this.prisma.sys_role.findUnique({ where: { id: newId } });
          newName = newRole?.role_name;
        }
      }

      return { oldName, newName };
    } catch (error) {
      this.logger.warn(`ID转换为名称失败: ${error.message}`);
      return {};
    }
  }
}
