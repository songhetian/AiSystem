import { Injectable } from "@nestjs/common";
import { ScopeService } from "../../../common/services/scope.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { CreateShopDto } from "../dto/create-shop.dto";
import { UpdateShopDto } from "../dto/update-shop.dto";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";

@Injectable()
export class SystemShopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  /**
   * 获取店铺列表（V2.0 性能优化）
   * 优化点：
   * 1. 添加缓存（10分钟）
   * 2. 添加查询监控
   */
  @Cache({ ttl: 600, byParams: true, prefix: "shop-list" })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async findAll(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    return this.prisma.biz_shop.findMany({
      where: this.scopeService.applyScope(
        scope,
        { is_deleted: 0 },
        {
          platform: "platform_id",
          department: "department_id",
        },
      ),
      orderBy: [{ sort: "asc" }, { create_time: "desc" }],
    });
  }

  /**
   * 创建店铺（清除缓存）
   */
  @CacheEvict({ pattern: "cache:shop-list:*" })
  async create(userId: string, dto: CreateShopDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertPlatformAccess(scope, dto.platform_id);
    this.scopeService.assertDepartmentAccess(scope, dto.department_id);

    return this.prisma.biz_shop.create({
      data: {
        name: dto.name,
        code: dto.code,
        type: dto.type ?? 1,
        address: dto.address,
        phone: dto.phone,
        avatar: dto.avatar,
        description: dto.description,
        platform_id: dto.platform_id,
        department_id: dto.department_id,
        owner_id: dto.owner_id,
        status: dto.status ?? 1,
      },
    });
  }

  /**
   * 更新店铺（清除缓存）
   */
  @CacheEvict({ pattern: "cache:shop-list:*" })
  async update(userId: string, id: string, dto: UpdateShopDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.biz_shop.findUnique({ where: { id } });
    this.scopeService.assertPlatformAccess(scope, current?.platform_id);
    this.scopeService.assertDepartmentAccess(scope, current?.department_id);
    this.scopeService.assertPlatformAccess(
      scope,
      dto.platform_id ?? current?.platform_id,
    );
    this.scopeService.assertDepartmentAccess(
      scope,
      dto.department_id ?? current?.department_id,
    );

    return this.prisma.biz_shop.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * 批量更新状态（清除缓存）
   */
  @CacheEvict({ pattern: "cache:shop-list:*" })
  async batchUpdateStatus(userId: string, ids: string[], status: number) {
    const scope = await this.scopeService.resolveAccess(userId);
    // Batch update requires careful scope check. For simplicity, we ensure access to each shop's platform/dept.
    // However, updateMany is tricky with complex scopes. We'll use a simpler approach or a multi-step update.
    // For now, let's just ensure the user has access to at least the current scopes of the target IDs.

    return this.prisma.biz_shop.updateMany({
      where: this.scopeService.applyScope(
        scope,
        {
          id: { in: ids },
          is_deleted: 0,
        },
        {
          platform: "platform_id",
          department: "department_id",
        },
      ),
      data: { status },
    });
  }

  /**
   * 删除店铺（清除缓存）
   */
  @CacheEvict({ pattern: "cache:shop-list:*" })
  async remove(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.biz_shop.findUnique({ where: { id } });
    this.scopeService.assertPlatformAccess(scope, current?.platform_id);
    this.scopeService.assertDepartmentAccess(scope, current?.department_id);

    return this.prisma.biz_shop.update({
      where: { id },
      data: { is_deleted: 1 },
    });
  }

  /**
   * 店铺排序（V2.0 性能优化）
   * 优化点：
   * 1. 使用事务批量更新
   * 2. 自动清除店铺列表缓存
   * 3. 权限校验
   */
  @CacheEvict({ pattern: "cache:shop-list:*" })
  async sort(userId: string, items: Array<{ id: string; sort: number }>) {
    const scope = await this.scopeService.resolveAccess(userId);

    // 获取所有店铺并校验权限
    const shopIds = items.map((item) => item.id);
    const shops = await this.prisma.biz_shop.findMany({
      where: { id: { in: shopIds }, is_deleted: 0 },
    });

    // 校验所有店铺的权限
    for (const shop of shops) {
      this.scopeService.assertPlatformAccess(scope, shop.platform_id);
      this.scopeService.assertDepartmentAccess(scope, shop.department_id);
    }

    if (shops.length !== shopIds.length) {
      throw new Error("部分店铺不存在或无权限访问");
    }

    // 使用事务批量更新排序
    return this.prisma.$transaction(
      items.map((item) =>
        this.prisma.biz_shop.update({
          where: { id: item.id },
          data: { sort: item.sort },
        }),
      ),
    );
  }
}
