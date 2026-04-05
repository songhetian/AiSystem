import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateApiPermissionDto } from '../dto/create-api-permission.dto';
import { UpdateApiPermissionDto } from '../dto/update-api-permission.dto';

@Injectable()
export class SystemApisService {
  constructor(private readonly prisma: PrismaService) {}

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

  update(id: string, dto: UpdateApiPermissionDto) {
    return this.prisma.sys_api_permission.update({
      where: { id },
      data: {
        ...dto,
        request_method: dto.request_method?.toUpperCase()
      }
    });
  }

  remove(id: string) {
    return this.prisma.sys_api_permission.update({
      where: { id },
      data: { is_deleted: 1 }
    });
  }
}
