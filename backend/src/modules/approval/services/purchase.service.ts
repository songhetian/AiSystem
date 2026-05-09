import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { Cacheable } from '../../../common/decorators/cache.decorator';
import { CacheEvict } from '../../../common/decorators/cache-evict.decorator';
import { QueryPurchaseDto } from '../dto/query-purchase.dto';

export interface PurchaseItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specification?: string;
  brand?: string;
  model?: string;
}

export interface Purchase {
  id: string;
  purchaseNo: string;
  items: PurchaseItem[];
  totalAmount: number;
  actualAmount?: number;
  reason: string;
  attachmentUrls?: string[];
  applicantId: string;
  applicantName?: string;
  platformId: string;
  deptId: string;
  shopId?: string;
  instanceId?: string;
  status: number; // 1:审批中, 2:待采购, 3:已完成, 4:已驳回, 5:已取消
  supplierInfo?: string;
  completedAt?: Date;
  createTime: Date;
  updateTime: Date;
}

export interface CreatePurchaseDto {
  items: PurchaseItem[];
  reason: string;
  attachmentUrls?: string[];
  platformId: string;
  deptId: string;
  shopId?: string;
}

export interface UpdatePurchaseDto {
  items?: PurchaseItem[];
  reason?: string;
  attachmentUrls?: string[];
  supplierInfo?: string;
  actualAmount?: number;
}

export interface PurchaseStats {
  totalCount: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  approvedAmount: number;
  completedCount: number;
  completedAmount: number;
}

@Injectable()
export class PurchaseService {
  private readonly logger = new Logger(PurchaseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  /**
   * 创建采购申请
   */
  @CacheEvict({
    pattern: 'purchase:*',
  })
  async create(dto: CreatePurchaseDto, applicantId: string): Promise<Purchase> {
    // 验证采购项目
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('采购项目不能为空');
    }

    // 计算总金额
    const totalAmount = dto.items.reduce((sum, item) => {
      if (item.quantity <= 0 || item.unitPrice <= 0) {
        throw new BadRequestException('采购数量和单价必须大于0');
      }
      item.totalPrice = item.quantity * item.unitPrice;
      return sum + item.totalPrice;
    }, 0);

    if (totalAmount <= 0) {
      throw new BadRequestException('采购总金额必须大于0');
    }

    // 生成采购单号
    const purchaseNo = await this.generatePurchaseNo();

    // 获取申请人信息
    const applicant = await this.prisma.sys_user.findUnique({
      where: { id: applicantId },
    });

    if (!applicant) {
      throw new BadRequestException('申请人不存在');
    }

    // 创建采购记录
    const purchase = await this.prisma.fin_purchase.create({
      data: {
        purchase_no: purchaseNo,
        items: dto.items as any,
        total_amount: totalAmount,
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
        await this.getPurchaseTemplateId(dto.platformId, dto.deptId),
        {
          applicantId,
          title: `采购申请 - ${dto.items.length}项物品 - ¥${totalAmount}`,
          formData: {
            purchaseId: purchase.id,
            items: dto.items,
            totalAmount,
            reason: dto.reason,
            attachments: dto.attachmentUrls || [],
          },
          platformId: dto.platformId,
          departmentId: dto.deptId,
        },
      );

      // 更新采购记录的审批实例ID
      await this.prisma.fin_purchase.update({
        where: { id: purchase.id },
        data: { instance_id: approvalInstance.id },
      });

      this.logger.log(`Created purchase: ${purchase.id} with approval instance: ${approvalInstance.id}`);
    } catch (error: any) {
      // 如果创建审批实例失败，删除采购记录
      await this.prisma.fin_purchase.delete({
        where: { id: purchase.id },
      });
      throw new BadRequestException(`创建审批流程失败: ${error.message}`);
    }

    return this.mapToPurchase(purchase);
  }

  /**
   * 更新采购申请
   */
  @CacheEvict({
    pattern: 'purchase:*',
  })
  async update(id: string, dto: UpdatePurchaseDto, userId: string): Promise<Purchase> {
    const purchase = await this.findById(id);

    // 只有申请人可以修改，且只能在审批中状态修改
    if (purchase.applicantId !== userId) {
      throw new BadRequestException('只能修改自己的采购申请');
    }

    if (purchase.status !== 1) {
      throw new BadRequestException('只能修改审批中的采购申请');
    }

    const updateData: any = {
      reason: dto.reason,
      attachment_urls: dto.attachmentUrls,
      supplier_info: dto.supplierInfo,
      actual_amount: dto.actualAmount,
    };

    // 如果更新了采购项目，重新计算总金额
    if (dto.items) {
      const totalAmount = dto.items.reduce((sum, item) => {
        if (item.quantity <= 0 || item.unitPrice <= 0) {
          throw new BadRequestException('采购数量和单价必须大于0');
        }
        item.totalPrice = item.quantity * item.unitPrice;
        return sum + item.totalPrice;
      }, 0);

      updateData.items = dto.items;
      updateData.total_amount = totalAmount;
    }

    const updated = await this.prisma.fin_purchase.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Updated purchase: ${id}`);
    return this.mapToPurchase(updated);
  }

  /**
   * 取消采购申请
   */
  @CacheEvict({
    pattern: 'purchase:*',
  })
  async cancel(id: string, userId: string): Promise<void> {
    const purchase = await this.findById(id);

    if (purchase.applicantId !== userId) {
      throw new BadRequestException('只能取消自己的采购申请');
    }

    if (![1, 2].includes(purchase.status)) {
      throw new BadRequestException('只能取消审批中或待采购的申请');
    }

    await this.prisma.fin_purchase.update({
      where: { id },
      data: { status: 5 }, // 已取消
    });

    this.logger.log(`Cancelled purchase: ${id}`);
  }

  /**
   * 更新采购状态（采购人员操作）
   */
  @CacheEvict({
    pattern: 'purchase:*',
  })
  async updateStatus(
    id: string,
    status: number,
    operatorId: string,
    supplierInfo?: string,
    actualAmount?: number,
  ): Promise<Purchase> {
    const purchase = await this.findById(id);

    // 验证状态转换
    this.validateStatusTransition(purchase.status, status);

    const updateData: any = {
      status,
      supplier_info: supplierInfo,
      actual_amount: actualAmount,
    };

    if (status === 3) { // 已完成
      updateData.completed_at = new Date();

      // 创建支出记录
      await this.createExpenseRecord(purchase, operatorId, actualAmount || purchase.totalAmount);
    }

    const updated = await this.prisma.fin_purchase.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Updated purchase status: ${id} -> ${status}`);
    return this.mapToPurchase(updated);
  }

  /**
   * 根据ID查找采购申请
   */
  @Cacheable({
    prefix: 'purchase:detail',
    ttl: 300,
    keyGenerator: (id: string) => id,
  })
  async findById(id: string): Promise<Purchase> {
    const purchase = await this.prisma.fin_purchase.findFirst({
      where: {
        id,
        is_deleted: 0,
      },
    });

    if (!purchase) {
      throw new NotFoundException('采购申请不存在');
    }

    return this.mapToPurchase(purchase);
  }

  /**
   * 查询采购申请列表
   */
  @Cacheable({
    prefix: 'purchase:list',
    ttl: 180,
    keyGenerator: (query: QueryPurchaseDto) =>
      `${query.applicantId || 'all'}:${query.status || 'all'}:${query.platformId || 'all'}:${query.page || 1}:${query.pageSize || 20}`,
  })
  async findMany(query: QueryPurchaseDto): Promise<{
    items: Purchase[];
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
      where.total_amount = {};
      if (query.minAmount !== undefined) {
        where.total_amount.gte = query.minAmount;
      }
      if (query.maxAmount !== undefined) {
        where.total_amount.lte = query.maxAmount;
      }
    }

    if (query.keyword) {
      where.OR = [
        { purchase_no: { contains: query.keyword } },
        { reason: { contains: query.keyword } },
        { supplier_info: { contains: query.keyword } },
      ];
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.fin_purchase.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { create_time: 'desc' },
      }),
      this.prisma.fin_purchase.count({ where }),
    ]);

    return {
      items: items.map(item => this.mapToPurchase(item)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取采购统计
   */
  @Cacheable({
    prefix: 'purchase:stats',
    ttl: 300,
    keyGenerator: (platformId?: string, deptId?: string, applicantId?: string) =>
      `${platformId || 'all'}:${deptId || 'all'}:${applicantId || 'all'}`,
  })
  async getStats(platformId?: string, deptId?: string, applicantId?: string): Promise<PurchaseStats> {
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
      completedStats,
    ] = await Promise.all([
      this.prisma.fin_purchase.aggregate({
        where,
        _count: { id: true },
        _sum: { total_amount: true },
      }),
      this.prisma.fin_purchase.aggregate({
        where: { ...where, status: 1 },
        _count: { id: true },
        _sum: { total_amount: true },
      }),
      this.prisma.fin_purchase.aggregate({
        where: { ...where, status: 2 },
        _count: { id: true },
        _sum: { total_amount: true },
      }),
      this.prisma.fin_purchase.aggregate({
        where: { ...where, status: 3 },
        _count: { id: true },
        _sum: { actual_amount: true },
      }),
    ]);

    return {
      totalCount: totalStats._count.id,
      totalAmount: Number(totalStats._sum.total_amount || 0),
      pendingCount: pendingStats._count.id,
      pendingAmount: Number(pendingStats._sum.total_amount || 0),
      approvedCount: approvedStats._count.id,
      approvedAmount: Number(approvedStats._sum.total_amount || 0),
      completedCount: completedStats._count.id,
      completedAmount: Number(completedStats._sum.actual_amount || 0),
    };
  }

  /**
   * 批量操作采购申请
   */
  @CacheEvict({
    pattern: 'purchase:*',
  })
  async batchUpdateStatus(
    ids: string[],
    status: number,
    operatorId: string,
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

    for (const id of ids) {
      try {
        await this.updateStatus(id, status, operatorId);
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`${id}: ${error.message}`);
      }
    }

    this.logger.log(`Batch update completed: ${result.success} success, ${result.failed} failed`);
    return result;
  }

  /**
   * 导出采购记录
   */
  async exportPurchases(query: QueryPurchaseDto): Promise<Buffer> {
    const XLSX = require('xlsx');
    const { items } = await this.findMany({ ...query, page: 1, pageSize: 10000 });

    const statusMap: Record<number, string> = {
      1: '审批中',
      2: '待采购',
      3: '已完成',
      4: '已驳回',
      5: '已取消',
    };

    const exportData = items.map(item => ({
      采购单号: item.purchaseNo,
      采购项目: item.items.map(i => `${i.name}(${i.quantity}${i.specification || ''})`).join('; '),
      预算金额: item.totalAmount,
      实际金额: item.actualAmount || '',
      采购原因: item.reason,
      申请人: item.applicantName || '',
      状态: statusMap[item.status] || '',
      供应商信息: item.supplierInfo || '',
      完成时间: item.completedAt ? item.completedAt.toLocaleString() : '',
      创建时间: item.createTime.toLocaleString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '采购记录');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * 生成采购单号
   */
  private async generatePurchaseNo(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // 查找今天的最大序号
    const lastPurchase = await this.prisma.fin_purchase.findFirst({
      where: {
        purchase_no: {
          startsWith: `PUR${dateStr}`,
        },
      },
      orderBy: {
        purchase_no: 'desc',
      },
    });

    let sequence = 1;
    if (lastPurchase) {
      const lastSequence = parseInt(lastPurchase.purchase_no.slice(-4));
      sequence = lastSequence + 1;
    }

    return `PUR${dateStr}${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * 获取采购审批模板ID
   */
  private async getPurchaseTemplateId(platformId: string, deptId: string): Promise<string> {
    const template = await this.prisma.approval_template.findFirst({
      where: {
        type: 'purchase',
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
      throw new BadRequestException('未找到可用的采购审批模板');
    }

    return template.id;
  }

  /**
   * 验证状态转换
   */
  private validateStatusTransition(currentStatus: number, newStatus: number): void {
    const validTransitions: Record<number, number[]> = {
      1: [2, 4, 5], // 审批中 -> 待采购/已驳回/已取消
      2: [3, 5], // 待采购 -> 已完成/已取消
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException('无效的状态转换');
    }
  }

  /**
   * 创建支出记录
   */
  private async createExpenseRecord(purchase: Purchase, operatorId: string, actualAmount: number): Promise<void> {
    await this.prisma.financial_records.create({
      data: {
        type: 'expense',
        amount: actualAmount,
        source: `采购支出 - ${purchase.purchaseNo}`,
        category: 'purchase',
        description: purchase.reason,
        related_id: purchase.id,
        related_type: 'purchase',
        platform_id: purchase.platformId,
        department_id: purchase.deptId,
        operator_id: operatorId,
      },
    });
  }

  /**
   * 映射到采购对象
   */
  private mapToPurchase(item: any): Purchase {
    return {
      id: item.id,
      purchaseNo: item.purchase_no,
      items: Array.isArray(item.items) ? item.items : [],
      totalAmount: Number(item.total_amount),
      actualAmount: item.actual_amount ? Number(item.actual_amount) : undefined,
      reason: item.reason,
      attachmentUrls: Array.isArray(item.attachment_urls) ? item.attachment_urls : [],
      applicantId: item.applicant_id,
      platformId: item.platform_id,
      deptId: item.dept_id,
      shopId: item.shop_id,
      instanceId: item.instance_id,
      status: item.status,
      supplierInfo: item.supplier_info,
      completedAt: item.completed_at,
      createTime: item.create_time,
      updateTime: item.update_time,
    };
  }
}
