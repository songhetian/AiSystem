import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { QuerySystemLogsDto } from '../dto/query-system-logs.dto';
import { CurrentUserPayload } from '../../../common/current-user.decorator';
import { ScopeService } from '../../../common/services/scope.service';

function normalizeDate(value?: string) {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('日期格式无效');
  }
  return date;
}

@Injectable()
export class SystemLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService
  ) {}

  async listLoginLogs(user: CurrentUserPayload, query: QuerySystemLogsDto) {
    const startDate = normalizeDate(query.start_date);
    const endDate = normalizeDate(query.end_date);
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;

    // 获取访问范围
    const scope = await this.scopeService.resolveAccess(user.sub);

    const where = this.scopeService.applyScope({
      is_deleted: 0,
      ...(query.username ? { username: { contains: query.username } } : {}),
      ...(query.keyword
        ? {
            OR: [
              { username: { contains: query.keyword } },
              { login_message: { contains: query.keyword } },
              { login_ip: { contains: query.keyword } }
            ]
          }
        : {}),
      ...(query.status !== undefined ? { login_status: query.status } : {}),
      ...(startDate || endDate
        ? {
            create_time: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {})
            }
          }
        : {})
    }, scope, { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' });

    const [items, total] = await Promise.all([
      this.prisma.sys_login_log.findMany({
        where,
        orderBy: { create_time: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.sys_login_log.count({ where })
    ]);

    return { items, total };
  }

  async listOperationLogs(user: CurrentUserPayload, query: QuerySystemLogsDto) {
    const startDate = normalizeDate(query.start_date);
    const endDate = normalizeDate(query.end_date);
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;

    // 获取访问范围
    const scope = await this.scopeService.resolveAccess(user.sub);

    const where = this.scopeService.applyScope({
      is_deleted: 0,
      ...(query.username ? { username: { contains: query.username } } : {}),
      ...(query.keyword
        ? {
            OR: [
              { username: { contains: query.keyword } },
              { api_path: { contains: query.keyword } },
              { operation_module: { contains: query.keyword } },
              { operation_message: { contains: query.keyword } }
            ]
          }
        : {}),
      ...(query.status !== undefined ? { operation_status: query.status } : {}),
      ...(startDate || endDate
        ? {
            create_time: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {})
            }
          }
        : {})
    }, scope, { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' });

    const [items, total] = await Promise.all([
      this.prisma.sys_operation_log.findMany({
        where,
        orderBy: { create_time: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.sys_operation_log.count({ where })
    ]);

    return { items, total };
  }
}
