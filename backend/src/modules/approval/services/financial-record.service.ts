import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Cacheable } from '../../../common/decorators/cache.decorator';
import { CacheEvict } from '../../../common/decorators/cache-evict.decorator';

export interface FinancialRecord {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  source?: string;
  category?: string;
  description?: string;
  relatedId?: string;
  relatedType?: 'reimbursement' | 'purchase' | 'manual';
  platformId?: string;
  departmentId?: string;
  operatorId: string;
  operatorName?: string;
  createTime: Date;
  updateTime: Date;
}

export interface CreateFinancialRecordDto {
  type: 'income' | 'expense';
  amount: number;
  source?: string;
  category?: string;
  description?: string;
  platformId?: string;
  departmentId?: string;
}

export interface UpdateFinancialRecordDto {
  amount?: number;
  source?: string;
  category?: string;
  description?: string;
}

export interface QueryFinancialRecordDto {
  type?: 'income' | 'expense';
  category?: string;
  relatedType?: 'reimbursement' | 'purchase' | 'manual';
  platformId?: string;
  departmentId?: string;
  operatorId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
  reimbursementExpense: number;
  purchaseExpense: number;
  manualExpense: number;
  manualIncome: number;
}

export interface MonthlyFinancialData {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

@Injectable()
export class FinancialRecordService {
  private readonly logger = new Logger(FinancialRecordService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建收入记录
   */
  @CacheEvict({
    pattern: 'financial:*',
  })
  async createIncomeRecord(dto: CreateFinancialRecordDto, operatorId: string): Promise<FinancialRecord> {
    if (dto.type !== 'income') {
      throw new BadRequestException('类型必须为收入');
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('金额必须大于0');
    }

    const record = await this.prisma.financial_records.create({
      data: {
        type: dto.type,
        amount: dto.amount,
        source: dto.source,
        category: dto.category,
        description: dto.description,
        related_type: 'manual',
        platform_id: dto.platformId,
        department_id: dto.departmentId,
        operator_id: operatorId,
      },
    });

    this.logger.log(`Created income record: ${record.id}, amount: ${dto.amount}`);
    return this.mapToFinancialRecord(record);
  }

  /**
   * 更新财务记录
   */
  @CacheEvict({
    pattern: 'financial:*',
  })
  async update(id: string, dto: UpdateFinancialRecordDto, operatorId: string): Promise<FinancialRecord> {
    const record = await this.findById(id);

    // 只有手动创建的记录可以修改
    if (record.relatedType !== 'manual') {
      throw new BadRequestException('只能修改手动创建的财务记录');
    }

    // 验证金额
    if (dto.amount !== undefined && dto.amount <= 0) {
      throw new BadRequestException('金额必须大于0');
    }

    const updated = await this.prisma.financial_records.update({
      where: { id },
      data: {
        amount: dto.amount,
        source: dto.source,
        category: dto.category,
        description: dto.description,
      },
    });

    this.logger.log(`Updated financial record: ${id}`);
    return this.mapToFinancialRecord(updated);
  }

  /**
   * 删除财务记录
   */
  @CacheEvict({
    pattern: 'financial:*',
  })
  async delete(id: string): Promise<void> {
    const record = await this.findById(id);

    // 只有手动创建的记录可以删除
    if (record.relatedType !== 'manual') {
      throw new BadRequestException('只能删除手动创建的财务记录');
    }

    await this.prisma.financial_records.update({
      where: { id },
      data: { is_deleted: 1 },
    });

    this.logger.log(`Deleted financial record: ${id}`);
  }

  /**
   * 根据ID查找财务记录
   */
  @Cacheable({
    prefix: 'financial:detail',
    ttl: 300,
    keyGenerator: (id: string) => id,
  })
  async findById(id: string): Promise<FinancialRecord> {
    const record = await this.prisma.financial_records.findFirst({
      where: {
        id,
        is_deleted: 0,
      },
    });

    if (!record) {
      throw new NotFoundException('财务记录不存在');
    }

    return this.mapToFinancialRecord(record);
  }

  /**
   * 查询财务记录列表
   */
  @Cacheable({
    prefix: 'financial:list',
    ttl: 180,
    keyGenerator: (query: QueryFinancialRecordDto) =>
      `${query.type || 'all'}:${query.platformId || 'all'}:${query.departmentId || 'all'}:${query.page || 1}:${query.pageSize || 20}`,
  })
  async findMany(query: QueryFinancialRecordDto): Promise<{
    items: FinancialRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const where: any = {
      is_deleted: 0,
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.relatedType) {
      where.related_type = query.relatedType;
    }

    if (query.platformId) {
      where.platform_id = query.platformId;
    }

    if (query.departmentId) {
      where.department_id = query.departmentId;
    }

    if (query.operatorId) {
      where.operator_id = query.operatorId;
    }

    if (query.startDate || query.endDate) {
      where.create_time = {};
      if (query.startDate) {
        where.create_time.gte = query.startDate;
      }
      if (query.endDate) {
        where.create_time.lte = query.endDate;
      }
    }

    if (query.minAmount !== undefined || query.maxAmount !== undefined) {
      where.amount = {};
      if (query.minAmount !== undefined) {
        where.amount.gte = query.minAmount;
      }
      if (query.maxAmount !== undefined) {
        where.amount.lte = query.maxAmount;
      }
    }

    if (query.keyword) {
      where.OR = [
        { source: { contains: query.keyword } },
        { category: { contains: query.keyword } },
        { description: { contains: query.keyword } },
      ];
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.financial_records.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { create_time: 'desc' },
      }),
      this.prisma.financial_records.count({ where }),
    ]);

    return {
      items: items.map(item => this.mapToFinancialRecord(item)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取财务汇总
   */
  @Cacheable({
    prefix: 'financial:summary',
    ttl: 300,
    keyGenerator: (platformId?: string, departmentId?: string, startDate?: Date, endDate?: Date) =>
      `${platformId || 'all'}:${departmentId || 'all'}:${startDate?.getTime() || 'all'}:${endDate?.getTime() || 'all'}`,
  })
  async getSummary(
    platformId?: string,
    departmentId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<FinancialSummary> {
    const where: any = {
      is_deleted: 0,
    };

    if (platformId) {
      where.platform_id = platformId;
    }

    if (departmentId) {
      where.department_id = departmentId;
    }

    if (startDate || endDate) {
      where.create_time = {};
      if (startDate) {
        where.create_time.gte = startDate;
      }
      if (endDate) {
        where.create_time.lte = endDate;
      }
    }

    const [
      incomeStats,
      expenseStats,
      reimbursementStats,
      purchaseStats,
      manualIncomeStats,
      manualExpenseStats,
    ] = await Promise.all([
      this.prisma.financial_records.aggregate({
        where: { ...where, type: 'income' },
        _count: { id: true },
        _sum: { amount: true },
      }),
      this.prisma.financial_records.aggregate({
        where: { ...where, type: 'expense' },
        _count: { id: true },
        _sum: { amount: true },
      }),
      this.prisma.financial_records.aggregate({
        where: { ...where, type: 'expense', related_type: 'reimbursement' },
        _sum: { amount: true },
      }),
      this.prisma.financial_records.aggregate({
        where: { ...where, type: 'expense', related_type: 'purchase' },
        _sum: { amount: true },
      }),
      this.prisma.financial_records.aggregate({
        where: { ...where, type: 'income', related_type: 'manual' },
        _sum: { amount: true },
      }),
      this.prisma.financial_records.aggregate({
        where: { ...where, type: 'expense', related_type: 'manual' },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = Number(incomeStats._sum.amount || 0);
    const totalExpense = Number(expenseStats._sum.amount || 0);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      incomeCount: incomeStats._count.id,
      expenseCount: expenseStats._count.id,
      reimbursementExpense: Number(reimbursementStats._sum.amount || 0),
      purchaseExpense: Number(purchaseStats._sum.amount || 0),
      manualExpense: Number(manualExpenseStats._sum.amount || 0),
      manualIncome: Number(manualIncomeStats._sum.amount || 0),
    };
  }

  /**
   * 获取月度财务数据
   */
  @Cacheable({
    prefix: 'financial:monthly',
    ttl: 600,
    keyGenerator: (platformId?: string, departmentId?: string, months?: number) =>
      `${platformId || 'all'}:${departmentId || 'all'}:${months || 12}`,
  })
  async getMonthlyData(
    platformId?: string,
    departmentId?: string,
    months = 12,
  ): Promise<MonthlyFinancialData[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const where: any = {
      is_deleted: 0,
      create_time: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (platformId) {
      where.platform_id = platformId;
    }

    if (departmentId) {
      where.department_id = departmentId;
    }

    // 获取原始数据
    const records = await this.prisma.financial_records.findMany({
      where,
      select: {
        type: true,
        amount: true,
        create_time: true,
      },
      orderBy: { create_time: 'asc' },
    });

    // 按月分组统计
    const monthlyData = new Map<string, { income: number; expense: number }>();

    for (const record of records) {
      const month = record.create_time.toISOString().slice(0, 7); // YYYY-MM

      if (!monthlyData.has(month)) {
        monthlyData.set(month, { income: 0, expense: 0 });
      }

      const data = monthlyData.get(month)!;
      const amount = Number(record.amount);

      if (record.type === 'income') {
        data.income += amount;
      } else {
        data.expense += amount;
      }
    }

    // 转换为数组并计算余额
    const result: MonthlyFinancialData[] = [];
    let runningBalance = 0;

    for (const [month, data] of Array.from(monthlyData.entries()).sort()) {
      const monthBalance = data.income - data.expense;
      runningBalance += monthBalance;

      result.push({
        month,
        income: data.income,
        expense: data.expense,
        balance: runningBalance,
      });
    }

    return result;
  }

  /**
   * 获取分类统计
   */
  @Cacheable({
    prefix: 'financial:category-stats',
    ttl: 300,
    keyGenerator: (type: 'income' | 'expense', platformId?: string, departmentId?: string) =>
      `${type}:${platformId || 'all'}:${departmentId || 'all'}`,
  })
  async getCategoryStats(
    type: 'income' | 'expense',
    platformId?: string,
    departmentId?: string,
  ): Promise<Array<{ category: string; amount: number; count: number }>> {
    const where: any = {
      is_deleted: 0,
      type,
    };

    if (platformId) {
      where.platform_id = platformId;
    }

    if (departmentId) {
      where.department_id = departmentId;
    }

    const stats = await this.prisma.financial_records.groupBy({
      by: ['category'],
      where,
      _count: { id: true },
      _sum: { amount: true },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
    });

    return stats.map(stat => ({
      category: stat.category || '未分类',
      amount: Number(stat._sum.amount || 0),
      count: stat._count.id,
    }));
  }

  /**
   * 导出财务记录
   */
  async exportRecords(query: QueryFinancialRecordDto): Promise<Buffer> {
    const XLSX = require('xlsx');
    const { items } = await this.findMany({ ...query, page: 1, pageSize: 10000 });

    const typeMap: Record<string, string> = {
      income: '收入',
      expense: '支出',
    };

    const relatedTypeMap: Record<string, string> = {
      reimbursement: '报销',
      purchase: '采购',
      manual: '手动',
    };

    const exportData = items.map(item => ({
      类型: typeMap[item.type] || item.type,
      金额: item.amount,
      来源: item.source || '',
      分类: item.category || '',
      描述: item.description || '',
      关联类型: relatedTypeMap[item.relatedType || ''] || item.relatedType || '',
      操作人: item.operatorName || '',
      创建时间: item.createTime.toLocaleString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '财务记录');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * 自动创建报销支出记录
   */
  async createReimbursementExpense(
    reimbursementId: string,
    amount: number,
    description: string,
    platformId: string,
    departmentId: string,
    operatorId: string,
  ): Promise<FinancialRecord> {
    const record = await this.prisma.financial_records.create({
      data: {
        type: 'expense',
        amount,
        source: '报销支出',
        category: 'reimbursement',
        description,
        related_id: reimbursementId,
        related_type: 'reimbursement',
        platform_id: platformId,
        department_id: departmentId,
        operator_id: operatorId,
      },
    });

    this.logger.log(`Created reimbursement expense record: ${record.id}, amount: ${amount}`);
    return this.mapToFinancialRecord(record);
  }

  /**
   * 自动创建采购支出记录
   */
  async createPurchaseExpense(
    purchaseId: string,
    amount: number,
    description: string,
    platformId: string,
    departmentId: string,
    operatorId: string,
  ): Promise<FinancialRecord> {
    const record = await this.prisma.financial_records.create({
      data: {
        type: 'expense',
        amount,
        source: '采购支出',
        category: 'purchase',
        description,
        related_id: purchaseId,
        related_type: 'purchase',
        platform_id: platformId,
        department_id: departmentId,
        operator_id: operatorId,
      },
    });

    this.logger.log(`Created purchase expense record: ${record.id}, amount: ${amount}`);
    return this.mapToFinancialRecord(record);
  }

  /**
   * 映射到财务记录对象
   */
  private mapToFinancialRecord(item: any): FinancialRecord {
    return {
      id: item.id,
      type: item.type,
      amount: Number(item.amount),
      source: item.source,
      category: item.category,
      description: item.description,
      relatedId: item.related_id,
      relatedType: item.related_type,
      platformId: item.platform_id,
      departmentId: item.department_id,
      operatorId: item.operator_id,
      createTime: item.create_time,
      updateTime: item.update_time,
    };
  }
}
