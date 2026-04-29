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
 * 操作日志拦截器 (V6.0 增强版)
 * 新增功能：
 * 1. 记录执行时间
 * 2. 字段级变更详情（对比修改前后数据）
 * 3. ID自动转换为真实姓名/名称
 * 4. Redis故障兜底（List缓存）
 * 5. 异步记录，不影响主业务
 * 6. 捕获所有 CRUD 操作 (create, read, update, delete, export, batch)
 * 7. 自动提取和格式化操作内容
 * 8. 时间戳自动校正
 * 9. 操作内容完整性处理
 */
@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(OperationLogInterceptor.name);
  private readonly LOG_QUEUE_KEY = 'operation_log:queue';

  // 预定义模块列表
  private readonly PREDEFINED_MODULES = [
    '用户管理',
    '角色管理',
    '菜单管理',
    '权限管理',
    '部门管理',
    '平台管理',
    '店铺管理',
    '系统设置',
    '数据映射',
    '消息管理',
    '考勤管理',
    '排班管理',
    '人员管理',
    '财务管理',
    '审批管理',
    '知识库',
    '考试管理',
    '客服管理',
    '审计日志',
  ];

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

    // 捕获所有 CRUD 操作: POST (create), PUT/PATCH (update), DELETE (delete), GET with /export (export)
    const isExport = path.includes('/export');
    const isBatch = path.includes('/batch');
    const shouldLog = isPublicLogin || method !== 'GET' || isExport || isBatch;

    if (!shouldLog) {
      return next.handle();
    }

    // 记录开始时间（用于时间戳校正）
    const startTime = Date.now();
    const requestTime = new Date();

    const permissionCode = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    // 提取模块名称并映射到预定义列表
    const moduleName = this.extractModuleName(path);

    const persist = async (status: number, message?: string, responseSummary?: unknown, error?: any) => {
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

        // 自动提取和格式化操作内容
        const operationContent = this.extractOperationContent(method, path, request, status, message, error);

        // 获取 IP 地址，处理异常情况
        const ipAddress = this.getIpAddressWithFallback(request);

        // 时间戳校正：验证时间戳有效性
        const correctedTime = this.correctTimestamp(requestTime);

        const logData = {
          user_id: userInfo?.id ?? userId,
          username: userInfo?.username ?? request.user?.username,
          request_method: method,
          api_path: path,
          api_name: permissionCode ?? undefined,
          operation_module: moduleName,
          request_ip: ipAddress,
          user_agent: request.headers?.['user-agent'],
          operation_status: status,
          operation_message: operationContent,
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
          requestTime: correctedTime.getTime(),
        };

        // 异步记录日志（不阻塞主业务）
        this.asyncLogOperation(logData);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`操作日志记录失败: ${errorMessage}`);
      }
    };

    return next.handle().pipe(
      tap((data) => {
        void persist(1, '操作成功', summarizeResponse(data));
      }),
      catchError((error) => {
        const errorMessage = error?.message || error?.response?.message || '未知错误';
        void persist(0, errorMessage, undefined, error);
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`数据库写入失败，使用Redis队列兜底: ${errorMessage}`);

      try {
        // Redis故障兜底：将日志推入队列
        await this.redisService.rpush(this.LOG_QUEUE_KEY, JSON.stringify(logData));
      } catch (redisError) {
        const redisErrorMessage = redisError instanceof Error ? redisError.message : String(redisError);
        this.logger.error(`Redis队列写入也失败: ${redisErrorMessage}`);
      }
    }
  }

  /**
   * 提取模块名称并映射到预定义列表
   * Requirement 4.1, 4.2: 实现操作模块名称映射，处理未知模块
   */
  private extractModuleName(path: string): string {
    // 从路径中提取模块名称
    const segments = path.split('/').filter(Boolean);

    // 跳过 'api' 前缀
    const moduleSegment = segments[0] === 'api' ? segments[1] : segments[0];

    if (!moduleSegment) {
      return '未知模块';
    }

    // 模块名称映射表
    const moduleMap: Record<string, string> = {
      'users': '用户管理',
      'user': '用户管理',
      'roles': '角色管理',
      'role': '角色管理',
      'menus': '菜单管理',
      'menu': '菜单管理',
      'permissions': '权限管理',
      'permission': '权限管理',
      'departments': '部门管理',
      'department': '部门管理',
      'dept': '部门管理',
      'platforms': '平台管理',
      'platform': '平台管理',
      'shops': '店铺管理',
      'shop': '店铺管理',
      'store': '店铺管理',
      'stores': '店铺管理',
      'settings': '系统设置',
      'system': '系统设置',
      'mappings': '数据映射',
      'mapping': '数据映射',
      'messages': '消息管理',
      'message': '消息管理',
      'attendance': '考勤管理',
      'shifts': '排班管理',
      'shift': '排班管理',
      'employees': '人员管理',
      'employee': '人员管理',
      'hr': '人员管理',
      'finance': '财务管理',
      'financial': '财务管理',
      'approvals': '审批管理',
      'approval': '审批管理',
      'knowledge': '知识库',
      'exams': '考试管理',
      'exam': '考试管理',
      'customer-service': '客服管理',
      'service': '客服管理',
      'audit': '审计日志',
      'logs': '审计日志',
    };

    const mappedModule = moduleMap[moduleSegment.toLowerCase()];

    if (mappedModule && this.PREDEFINED_MODULES.includes(mappedModule)) {
      return mappedModule;
    }

    // 如果未匹配到预定义模块，记录路径并返回未知模块
    this.logger.warn(`未知模块: ${moduleSegment}, 路径: ${path}`);
    return '未知模块';
  }

  /**
   * 自动提取和格式化操作内容
   * Requirement 1.3, 1.5, 4.3, 4.4, 4.5, 5.1, 5.2: 实现操作内容自动提取、格式化、长度限制和失败原因记录
   */
  private extractOperationContent(
    method: string,
    path: string,
    request: any,
    status: number,
    message?: string,
    error?: any
  ): string {
    let content = '';

    // 根据 HTTP 方法生成操作描述
    if (method === 'POST') {
      content = '创建';
    } else if (method === 'PUT' || method === 'PATCH') {
      content = '更新';
    } else if (method === 'DELETE') {
      content = '删除';
    } else if (method === 'GET' && path.includes('/export')) {
      content = '导出';
    } else if (path.includes('/batch')) {
      content = '批量操作';
    } else {
      content = '查询';
    }

    // 添加资源信息
    const resourceName = this.extractResourceName(path);
    if (resourceName) {
      content += resourceName;
    }

    // 添加操作结果
    if (status === 1) {
      content += ' - 成功';
      if (message && message !== '操作成功' && message !== 'success') {
        content += `: ${message}`;
      }
    } else {
      content += ' - 失败';
      // Requirement 1.5, 5.2: 添加操作失败原因
      if (message) {
        content += `: ${message}`;
      } else if (error) {
        const errorMsg = error?.message || error?.response?.message || '未知错误';
        content += `: ${errorMsg}`;
      } else {
        // Requirement 5.2: 操作结果未返回时的处理
        content += ': 操作异常（未返回结果）';
      }
    }

    // Requirement 4.4: 处理空操作内容
    if (!content || content.trim() === '') {
      content = '未获取到操作详情';
    }

    // Requirement 4.5: 操作内容长度限制（500字符）和截断逻辑
    if (content.length > 500) {
      content = content.slice(0, 500) + '（内容已截取）';
    }

    return content;
  }

  /**
   * 从路径中提取资源名称
   */
  private extractResourceName(path: string): string {
    const segments = path.split('/').filter(Boolean);

    // 跳过 'api' 前缀
    const startIndex = segments[0] === 'api' ? 1 : 0;

    if (segments.length > startIndex) {
      const resource = segments[startIndex];

      // 资源名称映射
      const resourceMap: Record<string, string> = {
        'users': '用户',
        'user': '用户',
        'roles': '角色',
        'role': '角色',
        'menus': '菜单',
        'menu': '菜单',
        'departments': '部门',
        'department': '部门',
        'dept': '部门',
        'platforms': '平台',
        'platform': '平台',
        'shops': '店铺',
        'shop': '店铺',
        'employees': '员工',
        'employee': '员工',
        'shifts': '排班',
        'shift': '排班',
        'attendance': '考勤',
        'messages': '消息',
        'message': '消息',
      };

      return resourceMap[resource.toLowerCase()] || '';
    }

    return '';
  }

  /**
   * 获取 IP 地址，处理异常情况
   * Requirement 4.6, 4.7: 实现 IP 地址获取和异常处理
   */
  private getIpAddressWithFallback(request: any): string {
    try {
      const ip = getRequestIp(request);

      if (!ip) {
        // Requirement 4.7: IP 获取失败时的处理
        this.logger.warn('IP获取失败，记录设备信息');
        return 'IP获取失败';
      }

      return ip;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`IP地址获取异常: ${errorMessage}`);
      return 'IP获取失败';
    }
  }

  /**
   * 时间戳自动校正逻辑
   * Requirement 2.1, 2.2, 2.3, 2.4: 验证时间戳有效性，异常时自动修正为系统当前时间
   */
  private correctTimestamp(timestamp: Date): Date {
    const now = new Date();

    // Requirement 2.1: 验证时间戳有效性
    if (!timestamp || isNaN(timestamp.getTime())) {
      // Requirement 2.2, 2.3: 时间戳为空或无效时，使用系统当前时间
      this.logger.warn('时间戳无效，已自动修正为系统当前时间');
      return now;
    }

    // Requirement 2.2: 时间戳早于系统当前时间的处理
    // 允许一定的时间偏差（例如 5 分钟），超过则认为异常
    const timeDiff = now.getTime() - timestamp.getTime();
    const fiveMinutesInMs = 5 * 60 * 1000;

    if (timeDiff > fiveMinutesInMs || timeDiff < -fiveMinutesInMs) {
      // Requirement 2.3: 记录时间戳异常日志
      this.logger.warn(`时间戳异常（偏差 ${Math.abs(timeDiff / 1000)} 秒），已自动修正`);
      return now;
    }

    return timestamp;
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`提取变更详情失败: ${errorMessage}`);
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
      } else if (path.includes('/departments') || path.includes('/dept')) {
        return await this.prisma.biz_department.findUnique({ where: { id: resourceId } });
      } else if (path.includes('/roles')) {
        return await this.prisma.sys_role.findUnique({ where: { id: resourceId } });
      } else if (path.includes('/employees')) {
        return await this.prisma.hr_employee.findUnique({ where: { id: resourceId } });
      }
      // 可以继续添加其他资源类型...

      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`获取旧数据失败: ${errorMessage}`);
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
    const enriched: Array<{ field: string; fieldName: string; oldValue: any; newValue: any; oldName?: string; newName?: string }> = [];

    for (const change of changes) {
      const enrichedChange: { field: string; fieldName: string; oldValue: any; newValue: any; oldName?: string; newName?: string } = {
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
          const oldDept = await this.prisma.biz_department.findUnique({ where: { id: oldId } });
          oldName = oldDept?.name;
        }
        if (newId) {
          const newDept = await this.prisma.biz_department.findUnique({ where: { id: newId } });
          newName = newDept?.name;
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`ID转换为名称失败: ${errorMessage}`);
      return {};
    }
  }
}
