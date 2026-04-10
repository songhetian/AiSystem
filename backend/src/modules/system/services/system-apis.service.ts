import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../common/services/redis.service';
import { CreateApiPermissionDto } from '../dto/create-api-permission.dto';
import { UpdateApiPermissionDto } from '../dto/update-api-permission.dto';

@Injectable()
export class SystemApisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService
  ) {}

  findAll() {
    return this.prisma.sys_api_permission.findMany({
      where: { is_deleted: 0 },
      orderBy: { create_time: 'desc' }
    });
  }

  create(dto: CreateApiPermissionDto) {
    return this.prisma.sys_api_permission.create({
      data: {
        api_path: dto.api_path,
        request_method: dto.request_method.toUpperCase(),
        api_name: dto.api_name,
        role_ids: dto.role_ids,
        status: dto.status ?? 1,
        platform_id: dto.platform_id,
        dept_id: dto.dept_id,
        shop_id: dto.shop_id
      }
    });
  }

  async update(id: string, dto: UpdateApiPermissionDto) {
    const current = await this.prisma.sys_api_permission.findUnique({ where: { id } });
    if (current) {
      await this.redisService.del(`api:permission:${current.api_name}`);
    }

    return this.prisma.sys_api_permission.update({
      where: { id },
      data: {
        ...dto,
        request_method: dto.request_method?.toUpperCase()
      }
    });
  }

  async getStats(id: string) {
    const api = await this.prisma.sys_api_permission.findUnique({ where: { id } });
    if (!api) throw new Error('接口不存在');

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const logs = await (this.prisma as any).sys_operation_log.findMany({
      where: {
        api_path: api.api_path,
        request_method: api.request_method,
        create_time: { gte: oneHourAgo },
        is_deleted: 0
      },
      orderBy: { create_time: 'asc' }
    });

    // 按 5 分钟间隔聚合数据
    const timeline = [];
    const now = Date.now();
    for (let i = 11; i >= 0; i--) {
      const time = new Date(now - i * 5 * 60 * 1000);
      const label = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
      
      const periodLogs = logs.filter((l: any) => {
        const logTime = new Date(l.create_time).getTime();
        return logTime >= time.getTime() - 5 * 60 * 1000 && logTime < time.getTime();
      });

      timeline.push({
        time: label,
        total: periodLogs.length,
        success: periodLogs.filter((l: any) => l.operation_status === 1).length,
        failed: periodLogs.filter((l: any) => l.operation_status === 0).length
      });
    }

    const total = logs.length;
    const success = logs.filter((l: any) => l.operation_status === 1).length;

    return {
      api_name: api.api_name,
      api_path: api.api_path,
      summary: {
        total,
        success_rate: total > 0 ? (success / total) * 100 : 100,
        avg_response_time: 0
      },
      timeline
    };
  }

  async remove(id: string) {
    const current = await this.prisma.sys_api_permission.findUnique({ where: { id } });
    if (current) {
      await this.redisService.del(`api:permission:${current.api_name}`);
    }

    return this.prisma.sys_api_permission.update({
      where: { id },
      data: { is_deleted: 1 }
    });
  }
}
