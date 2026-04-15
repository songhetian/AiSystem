import { Injectable } from '@nestjs/common';
import { ScopeService } from '../../../common/services/scope.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePlatformDto } from '../dto/create-platform.dto';
import { UpdatePlatformDto } from '../dto/update-platform.dto';
import { Cache } from '../../../common/decorators/cache.decorator';
import { CacheEvict } from '../../../common/decorators/cache-evict.decorator';
import { QueryOptimize } from '../../../common/decorators/query-optimize.decorator';

@Injectable()
export class SystemPlatformsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService
  ) {}

  /**
   * 获取平台列表（V2.0 性能优化）
   * 优化点：
   * 1. 添加缓存（15分钟）
   * 2. 添加查询监控
   */
  @Cache({ ttl: 900, byUser: false, prefix: 'platform-list' })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async findAll(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    return this.prisma.biz_platform.findMany({
      where: this.scopeService.applyPlatformScope(scope, { is_deleted: 0 }),
      orderBy: { create_time: 'desc' }
    });
  }

  /**
   * 创建平台（清除缓存）
   */
  @CacheEvict({ pattern: 'cache:platform-list:*' })
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

  /**
   * 更新平台（清除缓存）
   */
  @CacheEvict({ pattern: 'cache:platform-list:*' })
  async update(userId: string, id: string, dto: UpdatePlatformDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertSuperAdmin(scope, '只有超级管理员可以维护平台');

    return this.prisma.biz_platform.update({
      where: { id },
      data: dto
    });
  }

  /**
   * 批量更新状态（清除缓存）
   */
  @CacheEvict({ pattern: 'cache:platform-list:*' })
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

  /**
   * 删除平台（清除缓存）
   */
  @CacheEvict({ pattern: 'cache:platform-list:*' })
  async remove(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertSuperAdmin(scope, '只有超级管理员可以维护平台');

    return this.prisma.biz_platform.update({
      where: { id },
      data: { is_deleted: 1 }
    });
  }
}
