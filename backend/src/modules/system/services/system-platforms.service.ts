import { Injectable } from '@nestjs/common';
import { ScopeService } from '../../../common/services/scope.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePlatformDto } from '../dto/create-platform.dto';
import { UpdatePlatformDto } from '../dto/update-platform.dto';

@Injectable()
export class SystemPlatformsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService
  ) {}

  async findAll(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    return this.prisma.biz_platform.findMany({
      where: this.scopeService.applyPlatformScope(scope, { is_deleted: 0 }),
      orderBy: { create_time: 'desc' }
    });
  }

  async create(userId: string, dto: CreatePlatformDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertSuperAdmin(scope, '只有超级管理员可以维护平台');

    return this.prisma.biz_platform.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        status: dto.status ?? 1,
        owner_id: dto.owner_id
      }
    });
  }

  async update(userId: string, id: string, dto: UpdatePlatformDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertSuperAdmin(scope, '只有超级管理员可以维护平台');

    return this.prisma.biz_platform.update({
      where: { id },
      data: dto
    });
  }

  async batchUpdateStatus(userId: string, ids: string[], status: number) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertSuperAdmin(scope, '只有超级管理员可以维护平台');

    return this.prisma.biz_platform.updateMany({
      where: {
        id: { in: ids },
        is_deleted: 0
      },
      data: { status }
    });
  }

  async remove(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertSuperAdmin(scope, '只有超级管理员可以维护平台');

    return this.prisma.biz_platform.update({
      where: { id },
      data: { is_deleted: 1 }
    });
  }
}
