import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScopeService } from '../../../common/services/scope.service';
import { Cache } from '../../../common/decorators/cache.decorator';
import { CacheEvict } from '../../../common/decorators/cache-evict.decorator';
import { QueryOptimize } from '../../../common/decorators/query-optimize.decorator';

/**
 * 系统集成服务（V2.0 性能优化）
 * 优化点：
 * 1. 添加缓存（10分钟）
 * 2. 添加查询监控
 * 3. 自动缓存清除
 */
@Injectable()
export class SystemIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  private get delegate() {
    return (this.prisma as any).sys_api_mapping;
  }

  /**
   * 获取集成配置列表（V2.0 性能优化）
   * 优化点：添加缓存（10分钟）和查询监控
   */
  @Cache({ ttl: 600, byUser: true, prefix: 'integration-list' })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async findAll(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.delegate.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id' }),
      orderBy: { create_time: 'desc' },
    });
  }

  /**
   * 保存集成配置（V2.0 性能优化）
   * 优化点：自动清除集成配置列表缓存
   */
  @CacheEvict({ pattern: 'cache:integration-list:*' })
  async save(userId: string, data: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertPlatformAccess(scope, data.platform_id);

    if (data.id) {
      return this.delegate.update({
        where: { id: data.id },
        data,
      });
    }

    return this.delegate.create({ data });
  }

  /**
   * 删除集成配置（V2.0 性能优化）
   * 优化点：自动清除集成配置列表缓存
   */
  @CacheEvict({ pattern: 'cache:integration-list:*' })
  async remove(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const existing = await this.delegate.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) {
      throw new NotFoundException('集成配置不存在');
    }

    this.scopeService.assertPlatformAccess(scope, existing.platform_id);

    return this.delegate.update({
      where: { id },
      data: { is_deleted: 1 },
    });
  }

  async transformExternalData(mappingId: string, externalJson: any) {
    const mapping = await this.delegate.findUnique({ where: { id: mappingId } });
    if (!mapping) {
      throw new NotFoundException('映射配置不存在');
    }

    const rules = mapping.mapping_json as Record<string, string>;
    const internalData: Record<string, unknown> = {};

    for (const [internalField, externalField] of Object.entries(rules)) {
      internalData[internalField] = externalJson[externalField];
    }

    return internalData;
  }
}
