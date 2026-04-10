import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScopeService } from '../../../common/services/scope.service';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  async findAll(userId: string, params: { keyword?: string; platform_id?: string; category_id?: string }) {
    const scope = await this.scopeService.resolveAccess(userId);
    
    return this.prisma.biz_product.findMany({
      where: this.scopeService.applyScope(scope, {
        is_deleted: 0,
        name: params.keyword ? { contains: params.keyword } : undefined,
        platform_id: params.platform_id,
        category_id: params.category_id,
      }, {
        platform: 'platform_id',
        department: 'department_id'
      }),
      include: {
        skus: {
          where: { is_deleted: 0 }
        }
      },
      orderBy: { create_time: 'desc' }
    });
  }

  async create(userId: string, data: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertPlatformAccess(scope, data.platform_id);
    this.scopeService.assertDepartmentAccess(scope, data.department_id);

    return this.prisma.biz_product.create({
      data: {
        ...data,
        images: data.images ? data.images : [],
      }
    });
  }

  async update(userId: string, id: string, data: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    const product = await this.prisma.biz_product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('商品不存在');

    this.scopeService.assertPlatformAccess(scope, product.platform_id);
    this.scopeService.assertDepartmentAccess(scope, product.department_id);

    return this.prisma.biz_product.update({
      where: { id },
      data
    });
  }

  async remove(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const product = await this.prisma.biz_product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('商品不存在');

    this.scopeService.assertPlatformAccess(scope, product.platform_id);
    this.scopeService.assertDepartmentAccess(scope, product.department_id);

    return this.prisma.biz_product.update({
      where: { id },
      data: { is_deleted: 1 }
    });
  }

  // SKU 相关操作
  async syncSkus(userId: string, productId: string, skus: any[]) {
    const scope = await this.scopeService.resolveAccess(userId);
    const product = await this.prisma.biz_product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('商品不存在');

    this.scopeService.assertPlatformAccess(scope, product.platform_id);

    // 1. 标记当前商品下所有旧 SKU 为逻辑删除
    await this.prisma.biz_product_sku.updateMany({
      where: { product_id: productId },
      data: { is_deleted: 1 }
    });

    // 2. 批量创建/恢复新 SKU
    const ops = skus.map((sku, index) => {
      return this.prisma.biz_product_sku.upsert({
        where: { sku_code: sku.sku_code },
        create: {
          ...sku,
          product_id: productId,
          sort: index, // 记录排序
          is_deleted: 0
        },
        update: {
          ...sku,
          sort: index,
          is_deleted: 0
        }
      });
    });

    return Promise.all(ops);
  }
}
