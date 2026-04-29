import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Cacheable } from '../../../common/decorators/cache.decorator';
import { CacheEvict } from '../../../common/decorators/cache-evict.decorator';

export interface ExpenseType {
  id: string;
  name: string;
  code: string;
  description?: string;
  platformId: string;
  deptId?: string;
  status: number;
  creatorId?: string;
  createTime: Date;
  updateTime: Date;
}

export interface CreateExpenseTypeDto {
  name: string;
  code: string;
  description?: string;
  platformId: string;
  deptId?: string;
  status?: number;
}

export interface UpdateExpenseTypeDto {
  name?: string;
  code?: string;
  description?: string;
  status?: number;
}

export interface QueryExpenseTypeDto {
  platformId?: string;
  deptId?: string;
  status?: number;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class ExpenseTypeService {
  private readonly logger = new Logger(ExpenseTypeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建费用类型
   */
  @CacheEvict({
    pattern: 'expense-type:*',
  })
  async create(dto: CreateExpenseTypeDto, creatorId: string): Promise<ExpenseType> {
    // 检查编码唯一性
    await this.checkCodeUniqueness(dto.code, dto.platformId, dto.deptId);

    const expenseType = await this.prisma.fin_expense_type.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        platform_id: dto.platformId,
        dept_id: dto.deptId,
        status: dto.status ?? 1,
        creator_id: creatorId,
      },
    });

    this.logger.log(`Created expense type: ${expenseType.id}`);
    return this.mapToExpenseType(expenseType);
  }

  /**
   * 更新费用类型
   */
  @CacheEvict({
    pattern: 'expense-type:*',
  })
  async update(id: string, dto: UpdateExpenseTypeDto): Promise<ExpenseType> {
    const existingType = await this.findById(id);

    // 如果更新编码，检查唯一性
    if (dto.code && dto.code !== existingType.code) {
      await this.checkCodeUniqueness(dto.code, existingType.platformId, existingType.deptId, id);
    }

    const expenseType = await this.prisma.fin_expense_type.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        status: dto.status,
      },
    });

    this.logger.log(`Updated expense type: ${id}`);
    return this.mapToExpenseType(expenseType);
  }

  /**
   * 删除费用类型
   */
  @CacheEvict({
    pattern: 'expense-type:*',
  })
  async delete(id: string): Promise<void> {
    // 检查是否有关联的报销记录
    const reimbursementCount = await this.prisma.fin_reimbursement.count({
      where: {
        expense_type_id: id,
        is_deleted: 0,
      },
    });

    if (reimbursementCount > 0) {
      throw new BadRequestException('该费用类型下存在报销记录，无法删除');
    }

    await this.prisma.fin_expense_type.update({
      where: { id },
      data: { is_deleted: 1 },
    });

    this.logger.log(`Deleted expense type: ${id}`);
  }

  /**
   * 启用/禁用费用类型
   */
  @CacheEvict({
    pattern: 'expense-type:*',
  })
  async toggleStatus(id: string): Promise<ExpenseType> {
    const expenseType = await this.findById(id);
    const newStatus = expenseType.status === 1 ? 0 : 1;

    const updated = await this.prisma.fin_expense_type.update({
      where: { id },
      data: { status: newStatus },
    });

    this.logger.log(`Toggled expense type status: ${id} -> ${newStatus}`);
    return this.mapToExpenseType(updated);
  }

  /**
   * 根据ID查找费用类型
   */
  @Cacheable({
    prefix: 'expense-type:detail',
    ttl: 300,
    keyGenerator: (id: string) => id,
  })
  async findById(id: string): Promise<ExpenseType> {
    const expenseType = await this.prisma.fin_expense_type.findFirst({
      where: {
        id,
        is_deleted: 0,
      },
    });

    if (!expenseType) {
      throw new NotFoundException('费用类型不存在');
    }

    return this.mapToExpenseType(expenseType);
  }

  /**
   * 查询费用类型列表
   */
  @Cacheable({
    prefix: 'expense-type:list',
    ttl: 180,
    keyGenerator: (query: QueryExpenseTypeDto) =>
      `${query.platformId || 'all'}:${query.deptId || 'all'}:${query.status || 'all'}:${query.keyword || 'all'}:${query.page || 1}:${query.pageSize || 20}`,
  })
  async findMany(query: QueryExpenseTypeDto): Promise<{
    items: ExpenseType[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const where: any = {
      is_deleted: 0,
    };

    if (query.platformId) {
      where.platform_id = query.platformId;
    }

    if (query.deptId) {
      where.dept_id = query.deptId;
    }

    if (query.status !== undefined) {
      where.status = query.status;
    }

    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { code: { contains: query.keyword } },
        { description: { contains: query.keyword } },
      ];
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.fin_expense_type.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { update_time: 'desc' },
      }),
      this.prisma.fin_expense_type.count({ where }),
    ]);

    return {
      items: items.map(item => this.mapToExpenseType(item)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 根据平台和部门查找费用类型
   */
  @Cacheable({
    prefix: 'expense-type:by-scope',
    ttl: 300,
    keyGenerator: (platformId: string, deptId?: string) => `${platformId}:${deptId || 'all'}`,
  })
  async findByScope(platformId: string, deptId?: string): Promise<ExpenseType[]> {
    const where: any = {
      is_deleted: 0,
      status: 1,
      platform_id: platformId,
    };

    if (deptId) {
      where.OR = [
        { dept_id: deptId },
        { dept_id: null }, // 全平台通用的费用类型
      ];
    } else {
      where.dept_id = null;
    }

    const items = await this.prisma.fin_expense_type.findMany({
      where,
      orderBy: [
        { dept_id: 'desc' }, // 部门专用的排在前面
        { name: 'asc' },
      ],
    });

    return items.map(item => this.mapToExpenseType(item));
  }

  /**
   * 获取费用类型使用统计
   */
  @Cacheable({
    prefix: 'expense-type:stats',
    ttl: 600,
    keyGenerator: (id: string) => id,
  })
  async getUsageStats(id: string): Promise<{
    totalReimbursements: number;
    totalAmount: number;
    recentReimbursements: number;
  }> {
    const [totalReimbursements, totalAmountResult, recentReimbursements] = await Promise.all([
      this.prisma.fin_reimbursement.count({
        where: {
          expense_type_id: id,
          is_deleted: 0,
        },
      }),
      this.prisma.fin_reimbursement.aggregate({
        where: {
          expense_type_id: id,
          is_deleted: 0,
          status: { in: [2, 3] }, // 待打款和已打款
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.fin_reimbursement.count({
        where: {
          expense_type_id: id,
          is_deleted: 0,
          create_time: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 最近30天
          },
        },
      }),
    ]);

    return {
      totalReimbursements,
      totalAmount: Number(totalAmountResult._sum.amount || 0),
      recentReimbursements,
    };
  }

  /**
   * 批量导入费用类型
   */
  @CacheEvict({
    pattern: 'expense-type:*',
  })
  async batchImport(
    items: Array<{
      name: string;
      code: string;
      description?: string;
      platformId: string;
      deptId?: string;
    }>,
    creatorId: string,
  ): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const item of items) {
      try {
        await this.create(
          {
            name: item.name,
            code: item.code,
            description: item.description,
            platformId: item.platformId,
            deptId: item.deptId,
          },
          creatorId,
        );
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push(`${item.code}: ${error.message}`);
      }
    }

    this.logger.log(`Batch import completed: ${result.success} success, ${result.failed} failed`);
    return result;
  }

  /**
   * 检查编码唯一性
   */
  private async checkCodeUniqueness(
    code: string,
    platformId: string,
    deptId?: string,
    excludeId?: string,
  ): Promise<void> {
    const where: any = {
      code,
      platform_id: platformId,
      is_deleted: 0,
    };

    if (deptId) {
      where.dept_id = deptId;
    }

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existing = await this.prisma.fin_expense_type.findFirst({ where });

    if (existing) {
      throw new BadRequestException(`费用类型编码 "${code}" 已存在`);
    }
  }

  /**
   * 映射到费用类型对象
   */
  private mapToExpenseType(item: any): ExpenseType {
    return {
      id: item.id,
      name: item.name,
      code: item.code,
      description: item.description,
      platformId: item.platform_id,
      deptId: item.dept_id,
      status: item.status,
      creatorId: item.creator_id,
      createTime: item.create_time,
      updateTime: item.update_time,
    };
  }
}
