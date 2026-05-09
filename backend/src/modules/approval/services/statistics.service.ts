import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Cacheable } from '../../../common/decorators/cache.decorator';

export interface ApprovalEfficiencyStats {
  totalApprovals: number;
  averageProcessTime: number; // 小时
  approvalRate: number; // 通过率
  rejectionRate: number; // 驳回率
  timeoutRate: number; // 超时率
  byStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
}

export interface ReimbursementStats {
  totalCount: number;
  totalAmount: number;
  byExpenseType: Array<{
    expenseTypeId: string;
    expenseTypeName: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  byDepartment: Array<{
    departmentId: string;
    departmentName: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  byMonth: Array<{
    month: string;
    count: number;
    amount: number;
  }>;
}

export interface PurchaseStats {
  totalCount: number;
  totalAmount: number;
  byCategory: Array<{
    category: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  byDepartment: Array<{
    departmentId: string;
    departmentName: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  byMonth: Array<{
    month: string;
    count: number;
    amount: number;
  }>;
}

export interface FinancialStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeByCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  expenseByCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    income: number;
    expense: number;
    balance: number;
  }>;
}

export interface DashboardStats {
  approvalStats: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  reimbursementStats: {
    pending: number;
    approved: number;
    paid: number;
    totalAmount: number;
  };
  purchaseStats: {
    pending: number;
    approved: number;
    completed: number;
    totalAmount: number;
  };
  financialStats: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    monthlyGrowth: number;
  };
}

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取审批效率统计
   */
  @Cacheable({
    prefix: 'stats:approval-efficiency',
    ttl: 600,
    keyGenerator: (platformId?: string, departmentId?: string, startDate?: Date, endDate?: Date) =>
      `${platformId || 'all'}:${departmentId || 'all'}:${startDate?.getTime() || 'all'}:${endDate?.getTime() || 'all'}`,
  })
  async getApprovalEfficiencyStats(
    platformId?: string,
    departmentId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ApprovalEfficiencyStats> {
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

    // 获取审批实例统计
    const [totalStats, statusStats, processTimeStats] = await Promise.all([
      this.prisma.approval_instances.aggregate({
        where,
        _count: { id: true },
      }),
      this.prisma.approval_instances.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      this.getAverageProcessTime(where),
    ]);

    const totalApprovals = totalStats._count.id;
    const approvedCount = statusStats.find(s => s.status === 'approved')?._count.id || 0;
    const rejectedCount = statusStats.find(s => s.status === 'rejected')?._count.id || 0;

    const byStatus = statusStats.map(stat => ({
      status: stat.status,
      count: stat._count.id,
      percentage: totalApprovals > 0 ? (stat._count.id / totalApprovals) * 100 : 0,
    }));

    return {
      totalApprovals,
      averageProcessTime: processTimeStats,
      approvalRate: totalApprovals > 0 ? (approvedCount / totalApprovals) * 100 : 0,
      rejectionRate: totalApprovals > 0 ? (rejectedCount / totalApprovals) * 100 : 0,
      timeoutRate: 0, // TODO: 实现超时统计
      byStatus,
    };
  }

  /**
   * 获取报销统计
   */
  @Cacheable({
    prefix: 'stats:reimbursement',
    ttl: 600,
    keyGenerator: (platformId?: string, departmentId?: string, startDate?: Date, endDate?: Date) =>
      `${platformId || 'all'}:${departmentId || 'all'}:${startDate?.getTime() || 'all'}:${endDate?.getTime() || 'all'}`,
  })
  async getReimbursementStats(
    platformId?: string,
    departmentId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ReimbursementStats> {
    const where: any = {
      is_deleted: 0,
    };

    if (platformId) {
      where.platform_id = platformId;
    }

    if (departmentId) {
      where.dept_id = departmentId;
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

    const [totalStats, expenseTypeStats, departmentStats, monthlyStats] = await Promise.all([
      this.prisma.fin_reimbursement.aggregate({
        where,
        _count: { id: true },
        _sum: { amount: true },
      }),
      this.prisma.fin_reimbursement.groupBy({
        by: ['expense_type_id'],
        where,
        _count: { id: true },
        _sum: { amount: true },
      }),
      this.prisma.fin_reimbursement.groupBy({
        by: ['dept_id'],
        where,
        _count: { id: true },
        _sum: { amount: true },
      }),
      this.getMonthlyReimbursementStats(where),
    ]);

    const totalCount = totalStats._count.id;
    const totalAmount = Number(totalStats._sum.amount || 0);

    // 获取费用类型名称
    const expenseTypeIds = expenseTypeStats.map(s => s.expense_type_id).filter(Boolean);
    const expenseTypes = await this.prisma.fin_expense_type.findMany({
      where: { id: { in: expenseTypeIds } },
      select: { id: true, name: true },
    });

    const byExpenseType = expenseTypeStats.map(stat => {
      const expenseType = expenseTypes.find(et => et.id === stat.expense_type_id);
      const amount = Number(stat._sum.amount || 0);
      return {
        expenseTypeId: stat.expense_type_id,
        expenseTypeName: expenseType?.name || '未知',
        count: stat._count.id,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      };
    });

    // 获取部门名称
    const departmentIds = departmentStats.map(s => s.dept_id).filter(Boolean);
    const departments = await this.prisma.biz_department.findMany({
      where: { id: { in: departmentIds } },
      select: { id: true, name: true },
    });

    const byDepartment = departmentStats.map(stat => {
      const department = departments.find(d => d.id === stat.dept_id);
      const amount = Number(stat._sum.amount || 0);
      return {
        departmentId: stat.dept_id,
        departmentName: department?.name || '未知',
        count: stat._count.id,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      };
    });

    return {
      totalCount,
      totalAmount,
      byExpenseType,
      byDepartment,
      byMonth: monthlyStats,
    };
  }

  /**
   * 获取采购统计
   */
  @Cacheable({
    prefix: 'stats:purchase',
    ttl: 600,
    keyGenerator: (platformId?: string, departmentId?: string, startDate?: Date, endDate?: Date) =>
      `${platformId || 'all'}:${departmentId || 'all'}:${startDate?.getTime() || 'all'}:${endDate?.getTime() || 'all'}`,
  })
  async getPurchaseStats(
    platformId?: string,
    departmentId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<PurchaseStats> {
    const where: any = {
      is_deleted: 0,
    };

    if (platformId) {
      where.platform_id = platformId;
    }

    if (departmentId) {
      where.dept_id = departmentId;
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

    const [totalStats, departmentStats, monthlyStats, categoryStats] = await Promise.all([
      this.prisma.fin_purchase.aggregate({
        where,
        _count: { id: true },
        _sum: { total_amount: true },
      }),
      this.prisma.fin_purchase.groupBy({
        by: ['dept_id'],
        where,
        _count: { id: true },
        _sum: { total_amount: true },
      }),
      this.getMonthlyPurchaseStats(where),
      this.getPurchaseCategoryStats(where),
    ]);

    const totalCount = totalStats._count.id;
    const totalAmount = Number(totalStats._sum.total_amount || 0);

    // 获取部门名称
    const departmentIds = departmentStats.map(s => s.dept_id).filter(Boolean);
    const departments = await this.prisma.biz_department.findMany({
      where: { id: { in: departmentIds } },
      select: { id: true, name: true },
    });

    const byDepartment = departmentStats.map(stat => {
      const department = departments.find(d => d.id === stat.dept_id);
      const amount = Number(stat._sum.total_amount || 0);
      return {
        departmentId: stat.dept_id,
        departmentName: department?.name || '未知',
        count: stat._count.id,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      };
    });

    return {
      totalCount,
      totalAmount,
      byCategory: categoryStats,
      byDepartment,
      byMonth: monthlyStats,
    };
  }

  /**
   * 获取财务统计
   */
  @Cacheable({
    prefix: 'stats:financial',
    ttl: 600,
    keyGenerator: (platformId?: string, departmentId?: string, startDate?: Date, endDate?: Date) =>
      `${platformId || 'all'}:${departmentId || 'all'}:${startDate?.getTime() || 'all'}:${endDate?.getTime() || 'all'}`,
  })
  async getFinancialStats(
    platformId?: string,
    departmentId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<FinancialStats> {
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

    const [incomeStats, expenseStats, incomeCategoryStats, expenseCategoryStats, monthlyTrend] = await Promise.all([
      this.prisma.financial_records.aggregate({
        where: { ...where, type: 'income' },
        _sum: { amount: true },
      }),
      this.prisma.financial_records.aggregate({
        where: { ...where, type: 'expense' },
        _sum: { amount: true },
      }),
      this.prisma.financial_records.groupBy({
        by: ['category'],
        where: { ...where, type: 'income' },
        _sum: { amount: true },
      }),
      this.prisma.financial_records.groupBy({
        by: ['category'],
        where: { ...where, type: 'expense' },
        _sum: { amount: true },
      }),
      this.getMonthlyFinancialTrend(where),
    ]);

    const totalIncome = Number(incomeStats._sum.amount || 0);
    const totalExpense = Number(expenseStats._sum.amount || 0);

    const incomeByCategory = incomeCategoryStats.map(stat => {
      const amount = Number(stat._sum.amount || 0);
      return {
        category: stat.category || '未分类',
        amount,
        percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
      };
    });

    const expenseByCategory = expenseCategoryStats.map(stat => {
      const amount = Number(stat._sum.amount || 0);
      return {
        category: stat.category || '未分类',
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      };
    });

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      incomeByCategory,
      expenseByCategory,
      monthlyTrend,
    };
  }

  /**
   * 获取财务汇总 (Alias for getFinancialStats)
   */
  async getFinancialSummary(
    platformId?: string,
    departmentId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<FinancialStats> {
    return this.getFinancialStats(platformId, departmentId, startDate, endDate);
  }

  /**
   * 获取仪表板统计
   */
  @Cacheable({
    prefix: 'stats:dashboard',
    ttl: 300,
    keyGenerator: (platformId?: string, departmentId?: string) =>
      `${platformId || 'all'}:${departmentId || 'all'}`,
  })
  async getDashboardStats(platformId?: string, departmentId?: string): Promise<DashboardStats> {
    const where: any = {
      is_deleted: 0,
    };

    if (platformId) {
      where.platform_id = platformId;
    }

    if (departmentId) {
      where.department_id = departmentId;
    }

    const [approvalStats, reimbursementStats, purchaseStats, financialStats] = await Promise.all([
      this.getApprovalDashboardStats(where),
      this.getReimbursementDashboardStats(where),
      this.getPurchaseDashboardStats(where),
      this.getFinancialDashboardStats(where),
    ]);

    return {
      approvalStats,
      reimbursementStats,
      purchaseStats,
      financialStats,
    };
  }

  /**
   * 导出统计报表
   */
  async exportStatisticsReport(
    type: 'approval' | 'reimbursement' | 'purchase' | 'financial',
    platformId?: string,
    departmentId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Buffer> {
    const XLSX = require('xlsx');
    const workbook = XLSX.utils.book_new();

    switch (type) {
      case 'approval':
        const approvalStats = await this.getApprovalEfficiencyStats(platformId, departmentId, startDate, endDate);
        const approvalSheet = XLSX.utils.json_to_sheet([
          { 指标: '总审批数', 数值: approvalStats.totalApprovals },
          { 指标: '平均处理时间(小时)', 数值: approvalStats.averageProcessTime },
          { 指标: '通过率(%)', 数值: approvalStats.approvalRate },
          { 指标: '驳回率(%)', 数值: approvalStats.rejectionRate },
        ]);
        XLSX.utils.book_append_sheet(workbook, approvalSheet, '审批效率统计');
        break;

      case 'reimbursement':
        const reimbursementStats = await this.getReimbursementStats(platformId, departmentId, startDate, endDate);
        const reimbursementSheet = XLSX.utils.json_to_sheet([
          { 指标: '总报销数', 数值: reimbursementStats.totalCount },
          { 指标: '总金额', 数值: reimbursementStats.totalAmount },
        ]);
        XLSX.utils.book_append_sheet(workbook, reimbursementSheet, '报销统计');
        break;

      case 'purchase':
        const purchaseStats = await this.getPurchaseStats(platformId, departmentId, startDate, endDate);
        const purchaseSheet = XLSX.utils.json_to_sheet([
          { 指标: '总采购数', 数值: purchaseStats.totalCount },
          { 指标: '总金额', 数值: purchaseStats.totalAmount },
        ]);
        XLSX.utils.book_append_sheet(workbook, purchaseSheet, '采购统计');
        break;

      case 'financial':
        const financialStats = await this.getFinancialStats(platformId, departmentId, startDate, endDate);
        const financialSheet = XLSX.utils.json_to_sheet([
          { 指标: '总收入', 数值: financialStats.totalIncome },
          { 指标: '总支出', 数值: financialStats.totalExpense },
          { 指标: '余额', 数值: financialStats.balance },
        ]);
        XLSX.utils.book_append_sheet(workbook, financialSheet, '财务统计');
        break;
    }

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  // 私有辅助方法

  private async getAverageProcessTime(where: any): Promise<number> {
    // 简化实现，实际应该计算审批记录的时间差
    return 24; // 默认24小时
  }

  private async getMonthlyReimbursementStats(where: any): Promise<Array<{ month: string; count: number; amount: number }>> {
    // 简化实现，实际应该按月分组统计
    return [];
  }

  private async getMonthlyPurchaseStats(where: any): Promise<Array<{ month: string; count: number; amount: number }>> {
    // 简化实现，实际应该按月分组统计
    return [];
  }

  private async getPurchaseCategoryStats(where: any): Promise<Array<{ category: string; count: number; amount: number; percentage: number }>> {
    // 简化实现，实际应该从采购项目中提取分类
    return [];
  }

  private async getMonthlyFinancialTrend(where: any): Promise<Array<{ month: string; income: number; expense: number; balance: number }>> {
    // 简化实现，实际应该按月分组统计
    return [];
  }

  private async getApprovalDashboardStats(where: any): Promise<DashboardStats['approvalStats']> {
    const stats = await this.prisma.approval_instances.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    const pending = stats.find(s => s.status === 'pending')?._count.id || 0;
    const approved = stats.find(s => s.status === 'approved')?._count.id || 0;
    const rejected = stats.find(s => s.status === 'rejected')?._count.id || 0;
    const total = pending + approved + rejected;

    return { pending, approved, rejected, total };
  }

  private async getReimbursementDashboardStats(where: any): Promise<DashboardStats['reimbursementStats']> {
    const stats = await this.prisma.fin_reimbursement.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
      _sum: { amount: true },
    });

    const pending = stats.find(s => s.status === 1)?._count.id || 0;
    const approved = stats.find(s => s.status === 2)?._count.id || 0;
    const paid = stats.find(s => s.status === 3)?._count.id || 0;
    const totalAmount = Number(stats.reduce((sum, s) => sum + Number(s._sum.amount || 0), 0));

    return { pending, approved, paid, totalAmount };
  }

  private async getPurchaseDashboardStats(where: any): Promise<DashboardStats['purchaseStats']> {
    const stats = await this.prisma.fin_purchase.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
      _sum: { total_amount: true },
    });

    const pending = stats.find(s => s.status === 1)?._count.id || 0;
    const approved = stats.find(s => s.status === 2)?._count.id || 0;
    const completed = stats.find(s => s.status === 3)?._count.id || 0;
    const totalAmount = Number(stats.reduce((sum, s) => sum + Number(s._sum.total_amount || 0), 0));

    return { pending, approved, completed, totalAmount };
  }

  private async getFinancialDashboardStats(where: any): Promise<DashboardStats['financialStats']> {
    const [incomeStats, expenseStats] = await Promise.all([
      this.prisma.financial_records.aggregate({
        where: { ...where, type: 'income' },
        _sum: { amount: true },
      }),
      this.prisma.financial_records.aggregate({
        where: { ...where, type: 'expense' },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = Number(incomeStats._sum.amount || 0);
    const totalExpense = Number(expenseStats._sum.amount || 0);
    const balance = totalIncome - totalExpense;

    // 简化的月度增长率计算
    const monthlyGrowth = 0; // TODO: 实现实际的增长率计算

    return { totalIncome, totalExpense, balance, monthlyGrowth };
  }
}
