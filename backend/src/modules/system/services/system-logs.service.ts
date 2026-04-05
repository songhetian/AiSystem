import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { QuerySystemLogsDto } from '../dto/query-system-logs.dto';

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
  constructor(private readonly prisma: PrismaService) {}

  async listLoginLogs(query: QuerySystemLogsDto) {
    const startDate = normalizeDate(query.start_date);
    const endDate = normalizeDate(query.end_date);

    return this.prisma.sys_login_log.findMany({
      where: {
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
      },
      orderBy: { create_time: 'desc' }
    });
  }

  async listOperationLogs(query: QuerySystemLogsDto) {
    const startDate = normalizeDate(query.start_date);
    const endDate = normalizeDate(query.end_date);

    return this.prisma.sys_operation_log.findMany({
      where: {
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
      },
      orderBy: { create_time: 'desc' }
    });
  }
}
