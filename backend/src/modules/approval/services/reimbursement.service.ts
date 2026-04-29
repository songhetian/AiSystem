import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { Cacheable } from '../../../common/decorators/cache.decorator';
import { CacheEvict } from '../../../common/decorators/cache-evict.decorator';

export interface Reimbursement {
  id: string;
  reimNo: string;
  expenseTypeId: string;
  expenseTypeName?: string;
  amount: number;
  reason: string;
  attachmentUrls?: string[];
  applicantId: string;
  applicantName?: string;
  platformId: string;
  deptId: string;
  shopId?: string;
  instanceId?: string;
  status: number; // 1:审批中, 2:待打款, 3:已打款, 4:已驳回, 5:已撤回
  paidAt?: Date;
  payMethod?: string;
  remark?: string;
  createTime: Date;
  updateTime: Date;
}

export interface CreateReimbursementDto {
  expenseTypeId: string;
  amount: number;
  reason: string;
  attachmentUrls?: string[];
  platformId: string;
  deptId: string;
  shopId?: string;
}

export interface UpdateReimbursementDto {
  amount?: number;
  reason?: string;
  attachmentUrls?: string[];
  payMethod?: string;
  remark?: string;
}

export interface QueryReimbursementDto {
  applicantId?: string;
  expenseTypeId?: string;
  status?: number;
  platformId?: string;
  deptId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface ReimbursementStats {
  totalCount: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  approvedAmount: number;
  paidCount: number;
  paidAmount: number;
}

@Injectable()
export class ReimbursementService {
  private readonly logger = new Logger(ReimbursementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  /**
   * 创建报销申请
   */
  @CacheEvict({
    pattern: 'reimbursement:*',
  })
  async create(dto: CreateReimbursementDto, applicantId: string): Promise<Reimbursement> {
    // 验证费用类型
    const expenseType = await this.prisma.fin_expense_type.findFirst({
      where: {
        id: dto.expenseTypeId,
        is_deleted: 0,
        status: 1,
      },
    });

    if (!expenseType) {
      throw new BadRequestException('费用类型不存在或已禁用');
    }

    // 验证金额
    if (dto.amount <= 0) {
      throw new BadRequestException('报销金额必须大于0');
    }

    // 生成报销单号
    const reimNo = await this.generateReimbursementNo();

    // 获取申请人信息
    const applicant = await this.prisma.sys_user.findUnique({
      where: { id: applicantId },
    });

    if (!applicant) {
      throw new BadRequestException('申请人不存在');
    }

    // 创建报销记录
    const reimbursement = await this.prisma.fin_reimbursement.create({
      data: {
        reim_no: reimNo,
        expense_type_id: dto.expenseTypeId,
        amount: dto.amount,
        reason: dto.reason,
        attachment_urls: dto.attachmentUrls || [],
        applicant_id: applicantId,
        platform_id: dto.platformId,
        dept_id: dto.deptId,
        shop_id: dto.shopId,
        status: 1, // 审批中
      },
    });

    // 创建审批实例
    try {
      const approvalInstance = await this.workflowEngine.createInstance(
        await this.getReimbursementTemplateId(dto.platformId, dto.deptId),
        {
          applicantId,
          title: `报销申请 - ${expenseType.name} - ¥${dto.amount}`,
          formData: {
            reimbursementId: reimbursement.id,
            expenseType: expenseType.name,
            amount: dto.amount,
            reason: dto.reason,
            attachments: dto.attachmentUrls || [],
          },
          platformId: dto.platformId,
          departmentId: dto.deptId,
        },
      );

      // 更新报销记录的审批实例ID
      await this.prisma.fin_reimbursement.update({
        where: { id: reimbursement.id },
        data: { instance_id: approvalInstance.id },
      });

      this.logger.log(`Created reimbursement: ${reimbursement.id} with approval instance: ${approvalInstance.id}`);
    } catch (error) {
      // 如果创建审批实例失败，删除报销记录
      await this.prisma.fin_reimbursement.delete({
        where: { id: reimbursement.id },
      });
      throw new BadRequestException(`创建审批流程失败: ${error.message}`);
    }

    return this.mapToReimbursement(reimbursement);
  }

  /**
   * 更新报销申请
   */
  @CacheEvict({
    pattern: 'reimbursement:*',
  })
  async update(id: string, dto: UpdateReimbursementDto, userId: string): Promise<Reimbursement> {
    const reimbursement = await this.findById(id);

    // 只有申请人可以修改，且只能在审批中状态修改
    if (reimbursement.applicantId !== userId) {
      throw new BadRequestException('只能修改自己的报销申请');
    }

    if (reimbursement.status !== 1) {
      throw new BadRequestException('只能修改审批中的报销申请');
    }

    const updated = await this.prisma.fin_reimbursement.update({
      where: { id },
      data: {
        amount: dto.amount,
        reason: dto.reason,
        attachment_urls: dto.attachmentUrls,
        pay_method: dto.payMethod,
        remark: dto.remark,
      },
    });

    this.logger.log(`Updated reimbursement: ${id}`);
    return this.mapToReimbursement(updated);
  }

  /**
   * 撤回报销申请
   */
  @CacheEvict({
    pattern: 'reimbursement:*',
  })
  async withdraw(id: string, userId: string): Promise<void> {
    const reimbursement = await this.findById(id);

    if (reimbursement.applicantId !== userId) {
      throw new BadRequestException('只能撤回自己的报销申请');
    }

    if (reimbursement.status !== 1) {
      throw new BadRequestException('只能撤回审批中的报销申请');
    }

    await this.prisma.fin_reimbursement.update({
      where: { id },
      data: { status: 5 }, // 已撤回
    });

    this.logger.log(`Withdrew reimbursement: ${id}`);
  }

  /**
   * 更新报销状态（财务操作）
   */
  @CacheEvict({
    pattern: 'reimbursement:*',
  })
  async updateStatus(
    id: string,
    status: number,
    operatorId: string,
    payMethod?: string,
    remark?: string,
  ): Promise<Reimbursement> {
    const reimbursement = await this.findById(id);

    // 验证状态转换
    this.validateStatusTransition(reimbursement.status, status);

    const updateData: any = {
      status,
      remark,
    };

    if (status === 3) { // 已打款
      updateData.paid_at = new Date();
      updateData.pay_method = payMethod;

      // 创建支出记录
      await this.createExpenseRecord(reimbursement, operatorId);
    }

    const updated = await this.prisma.fin_reimbursement.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Updated reimbursement status: ${id} -> ${status}`);
    return this.mapToReimbursement(updated);
  }

  /**
   * 根据ID查找报销申请
   */
  @Cacheable({
    prefix: 'reimbursement:detail',
    ttl: 300,
    keyGenerator: (id: string) => id,
  })
  async findById(id: string): Promise<Reimbursement> {
    const reimbursement = await this.prisma.fin_reimbursement.findFirst({
      where: {
        id,
        is_deleted: 0,
      },
      include: {
        fin_expense_type: true,
      },
    });

    if (!reimbursement) {
      throw new NotFoundException('报销申请不存在');
    }

    return this.mapToReimbursement(reimbursement);
  }

  /**
   * 查询报销申请列表
   */
  @Cacheable({
    prefix: 'reimbursement:list',
    ttl: 180,
    keyGenerator: (query: QueryReimbursementDto) =>
      `${query.applicantId || 'all'}:${query.status || 'all'}:${query.platformId || 'all'}:${query.page || 1}:${query.pageSize || 20}`,
  })
  async findMany(query: QueryReimbursementDto): Promise<{
    items: Reimbursement[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const where: any = {
      is_deleted: 0,
    };

    if (query.applicantId) {
      where.applicant_id = query.applicantId;
    }

    if (query.expenseTypeId) {
      where.expense_type_id = query.expenseTypeId;
    }

    if (query.status !== undefined) {
      where.status = query.status;
    }

    if (query.platformId) {
      where.platform_id = query.platformId;
    }

    if (query.deptId) {
      where.dept_id = query.deptId;
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
        { reim_no: { contains: query.keyword } },
        { reason: { contains: query.keyword } },
        { fin_expense_type: { name: { contains: query.keyword } } },
      ];
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.fin_reimbursement.findMany({
        where,
        include: {
          fin_expense_type: true,
        },
        skip,
        take: pageSize,
        orderBy: { create_time: 'desc' },
      }),
      this.prisma.fin_reimbursement.count({ where }),
    ]);

    return {
      items: items.map(item => this.mapToReimbursement(item)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取报销统计
   */
  @Cacheable({
    prefix: 'reimbursement:stats',
    ttl: 300,
    keyGenerator: (platformId?: string, deptId?: string, applicantId?: string) =>
      `${platformId || 'all'}:${deptId || 'all'}:${applicantId || 'all'}`,
  })
  async getStats(platformId?: string, deptId?: string, applicantId?: string): Promise<ReimbursementStats> {
    const where: any = {
      is_deleted: 0,
    };

    if (platformId) {
      where.platform_id = platformId;
    }

    if (deptId) {
      where.dept_id = deptId;
    }

    if (applicantId) {
      where.applicant_id = applicantId;
    }

    const [
      totalStats,
      pendingStats,
      approvedStats,
      paidStats,
    ] = await Promise.all([
      this.prisma.fin_reimbursement.aggregate({
        where,
        _count: { id: true },
        _sum: { amount: true },
      }),
      this.prisma.fin_reimbursement.aggregate({
        where: { ...where, status: 1 },
        _count: { id: true },
        _sum: { amount: true },
      }),
      this.prisma.fin_reimbursement.aggregate({
        where: { ...where, status: 2 },
        _count: { id: true },
        _sum: { amount: true },
      }),
      this.prisma.fin_reimbursement.aggregate({
        where: { ...where, status: 3 },
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalCount: totalStats._count.id,
      totalAmount: Number(totalStats._sum.amount || 0),
      pendingCount: pendingStats._count.id,
      pendingAmount: Number(pendingStats._sum.amount || 0),
      approvedCount: approvedStats._count.id,
      approvedAmount: Number(approvedStats._sum.amount || 0),
      paidCount: paidStats._count.id,
      paidAmount: Number(paidStats._sum.amount || 0),
    };
  }

  /**
   * 导出报销记录
   */
  async exportReimbursements(query: QueryReimbursementDto): Promise<Buffer> {
    const XLSX = require('xlsx');
    const { items } = await this.findMany({ ...query, page: 1, pageSize: 10000 });

    const statusMap: Record<number, string> = {
      1: '审批中',
      2: '待打款',
      3: '已打款',
      4: '已驳回',
      5: '已撤回',
    };

    const exportData = items.map(item => ({
      报销单号: item.reimNo,
      费用类型: item.expenseTypeName || '',
      报销金额: item.amount,
      报销原因: item.reason,
      申请人: item.applicantName || '',
      状态: statusMap[item.status] || '',
      打款方式: item.payMethod || '',
      打款时间: item.paidAt ? item.paidAt.toLocaleString() : '',
      创建时间: item.createTime.toLocaleString(),
      备注: item.remark || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '报销记录');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * 生成报销单号
   */
  private async generateReimbursementNo(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // 查找今天的最大序号
    const lastReimbursement = await this.prisma.fin_reimbursement.findFirst({
      where: {
        reim_no: {
          startsWith: `REIM${dateStr}`,
        },
      },
      orderBy: {
        reim_no: 'desc',
      },
    });

    let sequence = 1;
    if (lastReimbursement) {
      const lastSequence = parseInt(lastReimbursement.reim_no.slice(-4));
      sequence = lastSequence + 1;
    }

    return `REIM${dateStr}${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * 获取报销审批模板ID
   */
  private async getReimbursementTemplateId(platformId: string, deptId: string): Promise<string> {
    const template = await this.prisma.approval_template.findFirst({
      where: {
        type: 'reimbursement',
        status: 'enabled',
        is_deleted: 0,
        OR: [
          { platform_id: platformId, dept_id: deptId },
          { platform_id: platformId, dept_id: null },
          { platform_id: null, dept_id: null },
        ],
      },
      orderBy: [
        { dept_id: 'desc' }, // 部门专用模板优先
        { platform_id: 'desc' }, // 平台专用模板其次
        { update_time: 'desc' },
      ],
    });

    if (!template) {
      throw new BadRequestException('未找到可用的报销审批模板');
    }

    return template.id;
  }

  /**
   * 验证状态转换
   */
  private validateStatusTransition(currentStatus: number, newStatus: number): void {
    const validTransitions: Record<number, number[]> = {
      1: [2, 4, 5], // 审批中 -> 待打款/已驳回/已撤回
      2: [3], // 待打款 -> 已打款
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException('无效的状态转换');
    }
  }

  /**
   * 创建支出记录
   */
  private async createExpenseRecord(reimbursement: Reimbursement, operatorId: string): Promise<void> {
    await this.prisma.financial_records.create({
      data: {
        type: 'expense',
        amount: reimbursement.amount,
        source: `报销支出 - ${reimbursement.reimNo}`,
        category: 'reimbursement',
        description: reimbursement.reason,
        related_id: reimbursement.id,
        related_type: 'reimbursement',
        platform_id: reimbursement.platformId,
        department_id: reimbursement.deptId,
        operator_id: operatorId,
      },
    });
  }

  /**
   * 映射到报销对象
   */
  private mapToReimbursement(item: any): Reimbursement {
    return {
      id: item.id,
      reimNo: item.reim_no,
      expenseTypeId: item.expense_type_id,
      expenseTypeName: item.fin_expense_type?.name,
      amount: Number(item.amount),
      reason: item.reason,
      attachmentUrls: Array.isArray(item.attachment_urls) ? item.attachment_urls : [],
      applicantId: item.applicant_id,
      platformId: item.platform_id,
      deptId: item.dept_id,
      shopId: item.shop_id,
      instanceId: item.instance_id,
      status: item.status,
      paidAt: item.paid_at,
      payMethod: item.pay_method,
      remark: item.remark,
      createTime: item.create_time,
      updateTime: item.update_time,
    };
  }
}
