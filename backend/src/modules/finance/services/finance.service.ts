import {
  Injectable,
  OnModuleInit,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { ScopeService } from "../../../common/services/scope.service";
import { ApprovalService } from "../../approval/services/approval.service";
import { RealtimeService } from "../../../common/services/realtime.service";
import { Cacheable } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";
import { CreateReimbursementDto, CreatePurchaseDto } from "../dto/finance.dto";

@Injectable()
export class FinanceService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly approvalService: ApprovalService,
    private readonly realtimeService: RealtimeService,
  ) {}

  onModuleInit() {
    // 注册审批回调处理器
    this.approvalService.registerHandler(
      "finance_reimbursement",
      this.handleApprovalCallback.bind(this),
    );
    this.approvalService.registerHandler(
      "finance_purchase",
      this.handleApprovalCallback.bind(this),
    );
  }

  private async handleApprovalCallback(
    request: any,
    action: string,
    operatorId: string,
  ) {
    const { biz_type, biz_id, biz_no, amount, platform_id, dept_id } = request;

    if (action === "approved") {
      if (biz_type === "finance_reimbursement") {
        await this.prisma.fin_reimbursement.update({
          where: { id: biz_id },
          data: { status: 2 }, // 审批通过 -> 待打款
        });
      } else if (biz_type === "finance_purchase") {
        await this.prisma.fin_purchase.update({
          where: { id: biz_id },
          data: { status: 2 }, // 审批通过 -> 待采购
        });
      }
    } else if (action === "rejected") {
      if (biz_type === "finance_reimbursement") {
        await this.prisma.fin_reimbursement.update({
          where: { id: biz_id },
          data: { status: 4 }, // 已驳回
        });
      } else if (biz_type === "finance_purchase") {
        await this.prisma.fin_purchase.update({
          where: { id: biz_id },
          data: { status: 4 }, // 已驳回
        });
      }
    }
  }

  private async resolveApprovalActors(userId: string, departmentId: string) {
    const [user, department] = await Promise.all([
      this.prisma.sys_user.findUnique({ where: { id: userId } }),
      this.prisma.biz_department.findUnique({ where: { id: departmentId } }),
    ]);
    const approver = department?.owner_id
      ? await this.prisma.sys_user.findUnique({
          where: { id: department.owner_id },
        })
      : null;

    return {
      applicantName: user?.name || user?.username || "Unknown",
      approverId: approver?.id ?? userId,
      approverName:
        approver?.name || approver?.username || user?.name || "Unknown",
      departmentName: department?.name || "未分配部门",
    };
  }

  // ✅ 优化：添加缓存
  @Cacheable({
    prefix: "finance:expense-types",
    ttl: 600,
    keyGenerator: (userId: string) => "all",
  })
  @QueryOptimize()
  async listExpenseTypes(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.fin_expense_type.findMany({
      where: this.scopeService.applyScope(
        scope,
        { is_deleted: 0 },
        { platform: "platform_id" },
      ),
      orderBy: { create_time: "asc" },
    });
  }

  // ✅ 优化：添加缓存和查询监控
  @Cacheable({
    prefix: "finance:reimbursements",
    ttl: 180,
    keyGenerator: (userId: string, params: any) =>
      `${userId}:${JSON.stringify(params)}`,
  })
  @QueryOptimize()
  async listReimbursements(userId: string, params: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.fin_reimbursement.findMany({
      where: this.scopeService.applyScope(
        scope,
        { is_deleted: 0, ...params },
        {
          platform: "platform_id",
          department: "dept_id",
        },
      ),
      orderBy: { create_time: "desc" },
    });
  }

  // ... (reimbursement methods)

  // ✅ 优化：添加缓存和查询监控
  @Cacheable({
    prefix: "finance:purchases",
    ttl: 180,
    keyGenerator: (userId: string, params: any) =>
      `${userId}:${JSON.stringify(params)}`,
  })
  @QueryOptimize()
  async listPurchases(userId: string, params: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.fin_purchase.findMany({
      where: this.scopeService.applyScope(
        scope,
        { is_deleted: 0, ...params },
        {
          platform: "platform_id",
          department: "dept_id",
        },
      ),
      orderBy: { create_time: "desc" },
    });
  }

  // ✅ 优化：添加缓存清除
  @CacheEvict({
    prefix: ["finance:purchases", "finance:cash-records"],
    pattern: "*",
  })
  async createPurchase(userId: string, dto: CreatePurchaseDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertPlatformAccess(scope, dto.platform_id);
    this.scopeService.assertDepartmentAccess(scope, dto.department_id);

    const purchaseNo = `PUR-${Date.now()}`;

    const purchase = await this.prisma.fin_purchase.create({
      data: {
        purchase_no: purchaseNo,
        items: dto.items,
        total_amount: dto.total_amount,
        reason: dto.reason,
        attachment_urls: dto.attachment_urls || [],
        applicant_id: userId,
        platform_id: dto.platform_id,
        dept_id: dto.department_id,
        status: 1, // 审批中
      },
    });

    try {
      const actors = await this.resolveApprovalActors(
        userId,
        dto.department_id,
      );
      const approval = await this.approvalService.createAttendanceApproval({
        bizType: "finance_purchase",
        bizId: purchase.id,
        bizNo: purchaseNo,
        applicantId: userId,
        applicantName: actors.applicantName,
        currentApproverId: actors.approverId,
        currentApproverName: actors.approverName,
        platformName: dto.platform_id,
        departmentName: actors.departmentName,
        summary: `采购申请: ${dto.reason} (总计: ￥${dto.total_amount})`,
        amount: dto.total_amount,
      });

      await this.prisma.fin_purchase.update({
        where: { id: purchase.id },
        data: { approval_request_id: approval.id },
      });
    } catch (e) {
      console.error("Purchase approval error:", e);
    }

    return purchase;
  }

  // ✅ 优化：添加缓存清除
  @CacheEvict({
    prefix: ["finance:reimbursements", "finance:cash-records"],
    pattern: "*",
  })
  async createReimbursement(userId: string, dto: CreateReimbursementDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertPlatformAccess(scope, dto.platform_id);
    this.scopeService.assertDepartmentAccess(scope, dto.department_id);

    const reimNo = `REIM-${Date.now()}`;

    const reim = await this.prisma.fin_reimbursement.create({
      data: {
        reim_no: reimNo,
        amount: dto.amount,
        reason: dto.reason,
        expense_type_id: dto.expense_type_id,
        attachment_urls: dto.attachment_urls || [],
        applicant_id: userId,
        platform_id: dto.platform_id,
        dept_id: dto.department_id,
        status: 1, // 审批中
      },
    });

    try {
      const actors = await this.resolveApprovalActors(
        userId,
        dto.department_id,
      );
      const approval = await this.approvalService.createAttendanceApproval({
        bizType: "finance_reimbursement",
        bizId: reim.id,
        bizNo: reimNo,
        applicantId: userId,
        applicantName: actors.applicantName,
        currentApproverId: actors.approverId,
        currentApproverName: actors.approverName,
        platformName: dto.platform_id,
        departmentName: actors.departmentName,
        summary: `报销申请: ${dto.reason} (￥${dto.amount})`,
        amount: dto.amount,
      });

      await this.prisma.fin_reimbursement.update({
        where: { id: reim.id },
        data: { approval_request_id: approval.id },
      });
    } catch (e) {
      console.error("Reimbursement approval error:", e);
    }

    return reim;
  }

  // ✅ 新增：报销申请撤回（PRD 2.6.3.2）
  @CacheEvict({ prefix: ["finance:reimbursements"], pattern: "*" })
  async withdrawReimbursement(userId: string, id: string) {
    const reim = await this.prisma.fin_reimbursement.findUnique({
      where: { id },
    });
    if (!reim) throw new NotFoundException("报销单不存在");
    if (reim.applicant_id !== userId)
      throw new BadRequestException("只能撤回自己的报销申请");
    if (reim.status !== 1)
      throw new BadRequestException("只有审批中的报销申请可以撤回");

    return this.prisma.$transaction(async (tx) => {
      // 1. 更新报销状态为已撤回
      const updated = await tx.fin_reimbursement.update({
        where: { id },
        data: { status: 5 }, // 5: 已撤回
      });
      // 2. 同步撤回关联审批单
      if (reim.approval_request_id) {
        await tx["approval_request"].updateMany({
          where: { id: reim.approval_request_id, status: "pending" },
          data: { status: "withdrawn" },
        });
      }
      return updated;
    });
  }

  @CacheEvict({
    prefix: [
      "finance:reimbursements",
      "finance:cash-records",
      "finance:dashboard-stats",
      "finance:reimbursement-stats",
      "finance:cash-record-stats",
    ],
    pattern: "*",
  })
  async completePayment(
    userId: string,
    id: string,
    payMethod: string,
    remark?: string,
  ) {
    const reim = await this.prisma.fin_reimbursement.findUnique({
      where: { id },
    });
    if (!reim) throw new NotFoundException("报销单不存在");

    return this.prisma.$transaction(async (tx) => {
      // 1. 更新报销状态
      const updated = await tx.fin_reimbursement.update({
        where: { id },
        data: {
          status: 3, // 已打款
          paid_at: new Date(),
          pay_method: payMethod,
          remark,
        },
      });

      // 2. 自动同步支出记录并记录操作日志 (PRD 2.8.2/2.8.3.1)
      const opLog = {
        operatorId: userId,
        time: new Date().toISOString(),
        action: "MARK_PAID",
        fromStatus: reim.status,
        toStatus: 3,
        payMethod,
      };

      await tx.fin_cash_record.create({
        data: {
          type: 2, // 支出
          amount: updated.amount,
          source: `报销打款: ${updated.reason}`,
          biz_id: updated.id,
          biz_type: "reimbursement",
          biz_no: updated.reim_no,
          platform_id: updated.platform_id,
          dept_id: updated.dept_id,
          operator_id: userId,
          remark: `支付方式: ${payMethod}`,
          modify_log: [opLog] as any,
        },
      });

      return updated;
    });
  }

  @CacheEvict({
    prefix: [
      "finance:purchases",
      "finance:purchase-stats",
      "finance:dashboard-stats",
    ],
    pattern: "*",
  })
  async cancelPurchase(userId: string, id: string, reason: string) {
    const item = await this.prisma.fin_purchase.findUnique({ where: { id } });
    if (!item) throw new NotFoundException("采购单不存在");
    if (item.status === 3)
      throw new BadRequestException("已完成的采购单不可取消");

    return this.prisma.fin_purchase.update({
      where: { id },
      data: {
        status: 5, // 已取消
        supplier_info: `取消原因: ${reason}`,
      },
    });
  }

  @CacheEvict({
    prefix: [
      "finance:purchases",
      "finance:cash-records",
      "finance:purchase-stats",
      "finance:cash-record-stats",
      "finance:dashboard-stats",
    ],
    pattern: "*",
  })
  async completePurchase(
    userId: string,
    id: string,
    actualAmount: number,
    supplierInfo: string,
  ) {
    const purchase = await this.prisma.fin_purchase.findUnique({
      where: { id },
    });
    if (!purchase) throw new NotFoundException("采购单不存在");

    return this.prisma.$transaction(async (tx) => {
      // 1. 更新采购状态
      const updated = await tx.fin_purchase.update({
        where: { id },
        data: {
          status: 3, // 已完成
          actual_amount: actualAmount,
          supplier_info: supplierInfo,
          completed_at: new Date(),
        },
      });

      // 2. 自动同步支出记录并记录操作日志 (PRD 2.8.2/2.8.3.1)
      const opLog = {
        operatorId: userId,
        time: new Date().toISOString(),
        action: "MARK_COMPLETED",
        fromStatus: purchase.status,
        toStatus: 3,
        actualAmount,
      };

      await tx.fin_cash_record.create({
        data: {
          type: 2, // 支出
          amount: actualAmount,
          source: `采购付款: ${updated.reason}`,
          biz_id: updated.id,
          biz_type: "purchase",
          biz_no: updated.purchase_no,
          platform_id: updated.platform_id,
          dept_id: updated.dept_id,
          operator_id: userId,
          remark: `供应商: ${supplierInfo}`,
          modify_log: [opLog] as any,
        },
      });

      return updated;
    });
  }

  // ✅ 优化：添加缓存和查询监控
  @Cacheable({
    prefix: "finance:cash-records",
    ttl: 180,
    keyGenerator: (userId: string, params: any) =>
      `${userId}:${JSON.stringify(params)}`,
  })
  @QueryOptimize()
  async listCashRecords(userId: string, params: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.fin_cash_record.findMany({
      where: this.scopeService.applyScope(
        scope,
        { is_deleted: 0, ...params },
        { platform: "platform_id" },
      ),
      orderBy: { create_time: "desc" },
    });
  }

  async createCashRecord(userId: string, data: any) {
    return this.prisma.fin_cash_record.create({
      data: {
        ...data,
        platform_id: data.platform_id,
        dept_id: data.dept_id,
      },
    });
  }

  // --- 大屏统计 ---
  @Cacheable({
    prefix: "finance:dashboard-stats",
    ttl: 300,
    keyGenerator: (userId: string, platformId: string) => platformId,
  })
  @QueryOptimize()
  async getDashboardStats(userId: string, platformId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertPlatformAccess(scope, platformId);

    // 1. 核心指标汇总
    const [reimTotal, purchaseTotal, cashFlow] = await Promise.all([
      this.prisma.fin_reimbursement.aggregate({
        _sum: { amount: true },
        where: { platform_id: platformId, status: 2, is_deleted: 0 },
      }),
      this.prisma.fin_purchase.aggregate({
        _sum: { total_amount: true },
        where: { platform_id: platformId, status: 2, is_deleted: 0 },
      }),
      this.prisma.fin_cash_record.groupBy({
        by: ["type"],
        _sum: { amount: true },
        where: { platform_id: platformId, is_deleted: 0 },
      }),
    ]);

    // 2. 费用类型占比
    const categoryStats = await this.prisma.fin_reimbursement.groupBy({
      by: ["expense_type_id"],
      _sum: { amount: true },
      where: { platform_id: platformId, status: 2, is_deleted: 0 },
    });

    return {
      overview: {
        reimbursement: Number(reimTotal._sum.amount || 0),
        purchase: Number(purchaseTotal._sum.total_amount || 0),
        income: Number(cashFlow.find((c) => c.type === 1)?._sum.amount || 0),
        expense: Number(cashFlow.find((c) => c.type === 2)?._sum.amount || 0),
      },
      categoryStats: categoryStats.map((c) => ({
        typeId: c.expense_type_id,
        amount: Number(c._sum.amount || 0),
      })),
    };
  }

  // ✅ 新增：报销统计（PRD 2.9.1）
  @Cacheable({
    prefix: "finance:reimbursement-stats",
    ttl: 300,
    keyGenerator: (userId: string, params: any) =>
      `${params.platformId}:${params.startDate}:${params.endDate}:${params.deptId}`,
  })
  @QueryOptimize()
  async getReimbursementStats(
    userId: string,
    params: {
      platformId: string;
      startDate?: string;
      endDate?: string;
      deptId?: string;
    },
  ) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertPlatformAccess(scope, params.platformId);

    const where: any = {
      platform_id: params.platformId,
      is_deleted: 0,
    };

    if (params.startDate && params.endDate) {
      where.create_time = {
        gte: new Date(params.startDate),
        lte: new Date(params.endDate),
      };
    }

    if (params.deptId) {
      where.dept_id = params.deptId;
    }

    // 1. 按费用类型统计
    const byExpenseType = await this.prisma.fin_reimbursement.groupBy({
      by: ["expense_type_id"],
      _sum: { amount: true },
      _count: true,
      where: { ...where, status: { in: [2, 3] } }, // 待打款、已打款
    });

    // 2. 按部门统计
    const byDepartment = await this.prisma.fin_reimbursement.groupBy({
      by: ["dept_id"],
      _sum: { amount: true },
      _count: true,
      where: { ...where, status: { in: [2, 3] } },
    });

    // 3. 按时间统计（按天）
    const allRecords = await this.prisma.fin_reimbursement.findMany({
      where: { ...where, status: { in: [2, 3] } },
      select: {
        create_time: true,
        amount: true,
      },
    });

    const byDate = allRecords.reduce((acc: any, record: any) => {
      const date = new Date(record.create_time).toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = { date, amount: 0, count: 0 };
      }
      acc[date].amount += Number(record.amount);
      acc[date].count += 1;
      return acc;
    }, {});

    // 4. 统计汇总
    const [total, approved, rejected] = await Promise.all([
      this.prisma.fin_reimbursement.count({ where }),
      this.prisma.fin_reimbursement.count({
        where: { ...where, status: { in: [2, 3] } },
      }),
      this.prisma.fin_reimbursement.count({ where: { ...where, status: 4 } }),
    ]);

    const totalAmount = await this.prisma.fin_reimbursement.aggregate({
      _sum: { amount: true },
      _avg: { amount: true },
      where: { ...where, status: { in: [2, 3] } },
    });

    return {
      summary: {
        total_count: total,
        approved_count: approved,
        rejected_count: rejected,
        total_amount: Number(totalAmount._sum.amount || 0),
        average_amount: Number(totalAmount._avg.amount || 0),
        pass_rate: total > 0 ? ((approved / total) * 100).toFixed(1) : 0,
        reject_rate: total > 0 ? ((rejected / total) * 100).toFixed(1) : 0,
      },
      by_expense_type: byExpenseType.map((item: any) => ({
        expense_type_id: item.expense_type_id,
        amount: Number(item._sum.amount || 0),
        count: item._count,
      })),
      by_department: byDepartment.map((item: any) => ({
        dept_id: item.dept_id,
        amount: Number(item._sum.amount || 0),
        count: item._count,
      })),
      by_date: Object.values(byDate),
    };
  }

  // ✅ 新增：采购统计（PRD 2.9.2）
  @Cacheable({
    prefix: "finance:purchase-stats",
    ttl: 300,
    keyGenerator: (userId: string, params: any) =>
      `${params.platformId}:${params.startDate}:${params.endDate}:${params.deptId}`,
  })
  @QueryOptimize()
  async getPurchaseStats(
    userId: string,
    params: {
      platformId: string;
      startDate?: string;
      endDate?: string;
      deptId?: string;
    },
  ) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertPlatformAccess(scope, params.platformId);

    const where: any = {
      platform_id: params.platformId,
      is_deleted: 0,
    };

    if (params.startDate && params.endDate) {
      where.create_time = {
        gte: new Date(params.startDate),
        lte: new Date(params.endDate),
      };
    }

    if (params.deptId) {
      where.dept_id = params.deptId;
    }

    // 1. 按部门统计
    const byDepartment = await this.prisma.fin_purchase.groupBy({
      by: ["dept_id"],
      _sum: { total_amount: true, actual_amount: true },
      _count: true,
      where: { ...where, status: { in: [2, 3] } }, // 待采购、已完成
    });

    // 2. 按时间统计
    const allRecords = await this.prisma.fin_purchase.findMany({
      where: { ...where, status: { in: [2, 3] } },
      select: {
        create_time: true,
        total_amount: true,
        actual_amount: true,
      },
    });

    const byDate = allRecords.reduce((acc: any, record: any) => {
      const date = new Date(record.create_time).toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = { date, planned_amount: 0, actual_amount: 0, count: 0 };
      }
      acc[date].planned_amount += Number(record.total_amount);
      acc[date].actual_amount += Number(
        record.actual_amount || record.total_amount,
      );
      acc[date].count += 1;
      return acc;
    }, {});

    // 3. 统计汇总
    const [total, completed] = await Promise.all([
      this.prisma.fin_purchase.count({ where }),
      this.prisma.fin_purchase.count({ where: { ...where, status: 3 } }),
    ]);

    const amounts = await this.prisma.fin_purchase.aggregate({
      _sum: { total_amount: true, actual_amount: true },
      where: { ...where, status: { in: [2, 3] } },
    });

    return {
      summary: {
        total_count: total,
        completed_count: completed,
        planned_amount: Number(amounts._sum.total_amount || 0),
        actual_amount: Number(amounts._sum.actual_amount || 0),
        variance:
          Number(amounts._sum.actual_amount || 0) -
          Number(amounts._sum.total_amount || 0),
        completion_rate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
      },
      by_department: byDepartment.map((item: any) => ({
        dept_id: item.dept_id,
        planned_amount: Number(item._sum.total_amount || 0),
        actual_amount: Number(item._sum.actual_amount || 0),
        count: item._count,
      })),
      by_date: Object.values(byDate),
    };
  }

  // ✅ 新增：收支统计（PRD 2.9.3）
  @Cacheable({
    prefix: "finance:cash-record-stats",
    ttl: 300,
    keyGenerator: (userId: string, params: any) =>
      `${params.platformId}:${params.startDate}:${params.endDate}:${params.type}`,
  })
  @QueryOptimize()
  async getCashRecordStats(
    userId: string,
    params: {
      platformId: string;
      startDate?: string;
      endDate?: string;
      type?: string;
    },
  ) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertPlatformAccess(scope, params.platformId);

    const where: any = {
      platform_id: params.platformId,
      is_deleted: 0,
    };

    if (params.startDate && params.endDate) {
      where.create_time = {
        gte: new Date(params.startDate),
        lte: new Date(params.endDate),
      };
    }

    if (params.type) {
      where.type = Number(params.type);
    }

    // 1. 按类型统计
    const byType = await this.prisma.fin_cash_record.groupBy({
      by: ["type"],
      _sum: { amount: true },
      _count: true,
      where,
    });

    // 2. 按时间统计
    const allRecords = await this.prisma.fin_cash_record.findMany({
      where,
      select: {
        create_time: true,
        type: true,
        amount: true,
      },
    });

    const byDate = allRecords.reduce((acc: any, record: any) => {
      const date = new Date(record.create_time).toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = { date, income: 0, expense: 0, balance: 0 };
      }
      if (record.type === 1) {
        acc[date].income += Number(record.amount);
      } else {
        acc[date].expense += Number(record.amount);
      }
      acc[date].balance = acc[date].income - acc[date].expense;
      return acc;
    }, {});

    // 3. 统计汇总
    const income = byType.find((item: any) => item.type === 1);
    const expense = byType.find((item: any) => item.type === 2);

    return {
      summary: {
        total_income: Number(income?._sum.amount || 0),
        total_expense: Number(expense?._sum.amount || 0),
        balance:
          Number(income?._sum.amount || 0) - Number(expense?._sum.amount || 0),
        income_count: income?._count || 0,
        expense_count: expense?._count || 0,
      },
      by_type: byType.map((item: any) => ({
        type: item.type,
        amount: Number(item._sum.amount || 0),
        count: item._count,
      })),
      by_date: Object.values(byDate),
    };
  }
}
