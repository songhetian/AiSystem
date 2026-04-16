import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { ScopeService } from "../../../common/services/scope.service";
import { PaginationService } from "../../../common/services/pagination.service";
import {
  PaginationDto,
  PaginatedResponse,
} from "../../../common/dto/pagination.dto";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";
import * as XLSX from "xlsx";

/**
 * 产品服务（V2.0 性能优化）
 * 优化点：
 * 1. 添加缓存（5分钟）
 * 2. 添加查询监控
 * 3. SKU同步使用事务
 * 4. 批量操作支持
 * 5. 导出功能
 */
@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly paginationService: PaginationService,
  ) {}

  /**
   * 获取产品列表（V3.0 统一分页）
   * 优化点：添加缓存（5分钟）、查询监控、统一分页
   */
  @Cache({ ttl: 300, byParams: true, prefix: "product-list" })
  @QueryOptimize({ timeout: 5000, slowQueryThreshold: 300 })
  async findAll(
    userId: string,
    pagination: PaginationDto,
    params: { keyword?: string; platform_id?: string; category_id?: string },
  ): Promise<PaginatedResponse<any>> {
    const scope = await this.scopeService.resolveAccess(userId);

    const where = this.scopeService.applyScope(
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
    );

    const { skip, take } = this.paginationService.calculatePagination(
      pagination.page,
      pagination.pageSize,
    );

    const [data, total] = await Promise.all([
      this.prisma.biz_product.findMany({
        where,
        skip,
        take,
        include: {
          skus: {
            where: { is_deleted: 0 },
          },
        },
        orderBy: { create_time: "desc" },
      }),
      this.prisma.biz_product.count({ where }),
    ]);

    return this.paginationService.createResponse(
      data,
      total,
      pagination.page,
      pagination.pageSize,
    );
  }

  /**
   * 获取商品详情
   */
  @Cache({ ttl: 300, byUser: true, prefix: "product-detail" })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async findOne(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    const product = await this.prisma.biz_product.findUnique({
      where: { id },
      include: {
        skus: {
          where: { is_deleted: 0 },
          orderBy: { sort: "asc" },
        },
        biz_product_category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException("商品不存在");
    }

    this.scopeService.assertPlatformAccess(scope, product.platform_id);
    this.scopeService.assertDepartmentAccess(scope, product.department_id);

    return product;
  }

  /**
   * 创建产品（V2.0 性能优化）
   * 优化点：自动清除产品列表和详情缓存，校验商品编码唯一性
   */
  @CacheEvict({ pattern: "cache:product-*" })
  async create(userId: string, data: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertPlatformAccess(scope, data.platform_id);
    this.scopeService.assertDepartmentAccess(scope, data.department_id);

    // 校验商品编码唯一性
    if (data.code) {
      const existing = await this.prisma.biz_product.findFirst({
        where: {
          code: data.code,
          is_deleted: 0,
        },
      });
      if (existing) {
        throw new BadRequestException("商品编码已存在");
      }
    }

    return this.prisma.biz_product.create({
      data: {
        ...data,
        images: data.images ? data.images : [],
      },
    });
  }

  /**
   * 更新产品（V2.0 性能优化）
   * 优化点：自动清除产品列表和详情缓存
   */
  @CacheEvict({ pattern: "cache:product-*" })
  async update(userId: string, id: string, data: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    const product = await this.prisma.biz_product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException("商品不存在");

    this.scopeService.assertPlatformAccess(scope, product.platform_id);
    this.scopeService.assertDepartmentAccess(scope, product.department_id);

    // 校验商品编码唯一性
    if (data.code && data.code !== product.code) {
      const existing = await this.prisma.biz_product.findFirst({
        where: {
          code: data.code,
          is_deleted: 0,
          id: { not: id },
        },
      });
      if (existing) {
        throw new BadRequestException("商品编码已存在");
      }
    }

    return this.prisma.biz_product.update({
      where: { id },
      data,
    });
  }

  /**
   * 删除产品（V2.0 性能优化）
   * 优化点：自动清除产品列表和详情缓存
   */
  @CacheEvict({ pattern: "cache:product-*" })
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
   * 2. 自动清除产品列表和详情缓存
   * 3. 保证数据一致性
   */
  @CacheEvict({ pattern: "cache:product-*" })
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
   * 2. 自动清除产品列表和详情缓存
   * 3. 权限校验
   */
  @CacheEvict({ pattern: "cache:product-*" })
  async sort(userId: string, items: Array<{ id: string; sort: number }>) {
    const scope = await this.scopeService.resolveAccess(userId);

    // 获取所有商品并校验权限
    const productIds = items.map((item) => item.id);
    const products = await this.prisma.biz_product.findMany({
      where: { id: { in: productIds }, is_deleted: 0 },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException("部分商品不存在或无权限访问");
    }

    // 校验所有商品的权限
    for (const product of products) {
      this.scopeService.assertPlatformAccess(scope, product.platform_id);
      this.scopeService.assertDepartmentAccess(scope, product.department_id);
    }

    // 使用事务批量更新排序
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.biz_product.update({
          where: { id: item.id },
          data: { sort: item.sort, update_time: new Date() },
        }),
      ),
    );

    return { success: true };
  }

  /**
   * 批量更新商品状态
   */
  @CacheEvict({ pattern: "cache:product-*" })
  async batchUpdateStatus(userId: string, ids: string[], status: number) {
    const scope = await this.scopeService.resolveAccess(userId);

    // 验证所有商品权限
    const products = await this.prisma.biz_product.findMany({
      where: { id: { in: ids }, is_deleted: 0 },
    });

    if (products.length !== ids.length) {
      throw new BadRequestException("部分商品不存在或无权限访问");
    }

    for (const product of products) {
      this.scopeService.assertPlatformAccess(scope, product.platform_id);
      this.scopeService.assertDepartmentAccess(scope, product.department_id);
    }

    await this.prisma.biz_product.updateMany({
      where: { id: { in: ids } },
      data: { status, update_time: new Date() },
    });

    return { success: true, updated: ids.length };
  }

  /**
   * 批量更新商品分类
   */
  @CacheEvict({ pattern: "cache:product-*" })
  async batchUpdateCategory(userId: string, ids: string[], categoryId: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    // 验证分类是否存在
    const category = await this.prisma.biz_product_category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new BadRequestException("分类不存在");
    }

    // 验证所有商品权限
    const products = await this.prisma.biz_product.findMany({
      where: { id: { in: ids }, is_deleted: 0 },
    });

    if (products.length !== ids.length) {
      throw new BadRequestException("部分商品不存在或无权限访问");
    }

    for (const product of products) {
      this.scopeService.assertPlatformAccess(scope, product.platform_id);
      this.scopeService.assertDepartmentAccess(scope, product.department_id);
    }

    await this.prisma.biz_product.updateMany({
      where: { id: { in: ids } },
      data: { category_id: categoryId, update_time: new Date() },
    });

    return { success: true, updated: ids.length };
  }

  /**
   * 导出商品
   */
  async exportProducts(
    userId: string,
    params: { platform_id?: string; category_id?: string },
  ): Promise<Buffer> {
    const products = await this.findAll(userId, params);

    const exportData = (products as any[]).map((product: any) => ({
      商品编码: product.code || "",
      商品名称: product.name,
      分类: product.biz_product_category?.name || "",
      价格: product.price || 0,
      库存: product.stock || 0,
      状态: product.status === 1 ? "上架" : "下架",
      SKU数量: product.skus?.length || 0,
      排序: product.sort || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "商品列表");
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }
}
