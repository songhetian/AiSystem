import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { ScopeService } from "../../../common/services/scope.service";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";

/**
 * 产品服务（V2.0 性能优化）
 * 优化点：
 * 1. 添加缓存（5分钟）
 * 2. 添加查询监控
 * 3. SKU同步使用事务
 */
@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  /**
   * 获取产品列表（V2.0 性能优化）
   * 优化点：添加缓存（5分钟）和查询监控
   */
  @Cache({ ttl: 300, byParams: true, prefix: "product-list" })
  @QueryOptimize({ timeout: 5000, slowQueryThreshold: 300 })
  async findAll(
    userId: string,
    params: { keyword?: string; platform_id?: string; category_id?: string },
  ) {
    const scope = await this.scopeService.resolveAccess(userId);

    return this.prisma.biz_product.findMany({
      where: this.scopeService.applyScope(
        scope,
        {
          is_deleted: 0,
          name: params.keyword ? { contains: params.keyword } : undefined,
          platform_id: params.platform_id,
          category_id: params.category_id,
        },
        {
          platform: "platform_id",
          department: "department_id",
        },
      ),
      include: {
        skus: {
          where: { is_deleted: 0 },
        },
      },
      orderBy: { create_time: "desc" },
    });
  }

  /**
   * 创建产品（V2.0 性能优化）
   * 优化点：自动清除产品列表缓存
   */
  @CacheEvict({ pattern: "cache:product-list:*" })
  async create(userId: string, data: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertPlatformAccess(scope, data.platform_id);
    this.scopeService.assertDepartmentAccess(scope, data.department_id);

    return this.prisma.biz_product.create({
      data: {
        ...data,
        images: data.images ? data.images : [],
      },
    });
  }

  /**
   * 更新产品（V2.0 性能优化）
   * 优化点：自动清除产品列表缓存
   */
  @CacheEvict({ pattern: "cache:product-list:*" })
  async update(userId: string, id: string, data: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    const product = await this.prisma.biz_product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException("商品不存在");

    this.scopeService.assertPlatformAccess(scope, product.platform_id);
    this.scopeService.assertDepartmentAccess(scope, product.department_id);

    return this.prisma.biz_product.update({
      where: { id },
      data,
    });
  }

  /**
   * 删除产品（V2.0 性能优化）
   * 优化点：自动清除产品列表缓存
   */
  @CacheEvict({ pattern: "cache:product-list:*" })
  async remove(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const product = await this.prisma.biz_product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException("商品不存在");

    this.scopeService.assertPlatformAccess(scope, product.platform_id);
    this.scopeService.assertDepartmentAccess(scope, product.department_id);

    return this.prisma.biz_product.update({
      where: { id },
      data: { is_deleted: 1 },
    });
  }

  /**
   * 同步SKU（V2.0 性能优化）
   * 优化点：
   * 1. 使用事务批量操作
   * 2. 自动清除产品列表缓存
   * 3. 保证数据一致性
   */
  @CacheEvict({ pattern: "cache:product-list:*" })
  async syncSkus(userId: string, productId: string, skus: any[]) {
    const scope = await this.scopeService.resolveAccess(userId);
    const product = await this.prisma.biz_product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException("商品不存在");

    this.scopeService.assertPlatformAccess(scope, product.platform_id);

    // 使用事务批量操作
    return this.prisma.$transaction(async (tx) => {
      // 1. 标记当前商品下所有旧 SKU 为逻辑删除
      await tx.biz_product_sku.updateMany({
        where: { product_id: productId },
        data: { is_deleted: 1 },
      });

      // 2. 批量创建/恢复新 SKU
      const ops = skus.map((sku, index) => {
        return tx.biz_product_sku.upsert({
          where: { sku_code: sku.sku_code },
          create: {
            ...sku,
            product_id: productId,
            sort: index, // 记录排序
            is_deleted: 0,
          },
          update: {
            ...sku,
            sort: index,
            is_deleted: 0,
          },
        });
      });

      return Promise.all(ops);
    });
  }

  /**
   * 商品排序（V2.0 性能优化）
   * 优化点：
   * 1. 使用事务批量更新
   * 2. 自动清除产品列表缓存
   * 3. 权限校验
   */
  @CacheEvict({ pattern: "cache:product-list:*" })
  async sort(userId: string, items: Array<{ id: string; sort: number }>) {
    const scope = await this.scopeService.resolveAccess(userId);

    // 获取所有商品并校验权限
    const productIds = items.map((item) => item.id);
    const products = await this.prisma.biz_product.findMany({
      where: { id: { in: productIds }, is_deleted: 0 },
    });

    // 校验所有商品的权限
    for (const product of products) {
      this.scopeService.assertPlatformAccess(scope, product.platform_id);
      this.scopeService.assertDepartmentAccess(scope, product.department_id);
    }

    // 使用事务批量更新排序
    return this.prisma.$transaction(
      items.map((item) =>
        this.prisma.biz_product.update({
          where: { id: item.id },
          data: { sort: item.sort },
        }),
      ),
    );
  }
}
