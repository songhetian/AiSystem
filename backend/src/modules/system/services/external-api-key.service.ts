import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScopeService } from '../../../common/services/scope.service';
import { Cache } from '../../../common/decorators/cache.decorator';
import { CacheEvict } from '../../../common/decorators/cache-evict.decorator';
import { QueryOptimize } from '../../../common/decorators/query-optimize.decorator';

/**
 * 外部API密钥服务（V2.0 性能优化）
 * 优化点：
 * 1. 添加缓存（10分钟）
 * 2. 添加查询监控
 * 3. getEffectiveKey 添加缓存（高频调用）
 */
@Injectable()
export class ExternalApiKeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  private get delegate() {
    return (this.prisma as any).sys_external_api_key;
  }

  /**
   * 获取API密钥列表（V2.0 性能优化）
   * 优化点：添加缓存（10分钟）和查询监控
   */
  @Cache({ ttl: 600, byUser: true, prefix: 'api-key-list' })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async findAll(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.delegate.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id' }),
      orderBy: { create_time: 'desc' },
    });
  }

  /**
   * 保存API密钥（V2.0 性能优化）
   * 优化点：自动清除相关缓存
   */
  @CacheEvict({ pattern: 'cache:api-key-*' })
  async save(userId: string, data: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertPlatformAccess(scope, data.platform_id);
    if (data.dept_id) {
      this.scopeService.assertDepartmentAccess(scope, data.dept_id);
    }

    if (data.id) {
      return this.delegate.update({
        where: { id: data.id },
        data,
      });
    }

    return this.delegate.create({ data });
  }

  /**
   * 删除API密钥（V2.0 性能优化）
   * 优化点：自动清除相关缓存
   */
  @CacheEvict({ pattern: 'cache:api-key-*' })
  async remove(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const existing = await this.delegate.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) {
      throw new NotFoundException('外部 API Key 不存在');
    }

    this.scopeService.assertPlatformAccess(scope, existing.platform_id);
    if (existing.dept_id) {
      this.scopeService.assertDepartmentAccess(scope, existing.dept_id);
    }

    return this.delegate.update({
      where: { id },
      data: { is_deleted: 1 },
    });
  }

  /**
   * 获取有效的API密钥（V2.0 性能优化）
   * 优化点：添加缓存（5分钟）和查询监控
   * 说明：此方法可能被频繁调用，缓存可显著提升性能
   */
  @Cache({ ttl: 300, byParams: true, prefix: 'effective-api-key' })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async getEffectiveKey(platformId: string, deptId?: string, serviceType?: string) {
    if (deptId) {
      const deptKey = await this.delegate.findFirst({
        where: { platform_id: platformId, dept_id: deptId, service_type: serviceType, status: 1, is_deleted: 0 },
      });
      if (deptKey) {
        return deptKey;
      }
    }

    return this.delegate.findFirst({
      where: { platform_id: platformId, dept_id: null, service_type: serviceType, status: 1, is_deleted: 0 },
    });
  }
}
