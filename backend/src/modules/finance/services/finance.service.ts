import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScopeService } from '../../../common/services/scope.service';
import { ApprovalService } from '../../approval/services/approval.service';
import { RealtimeService } from '../../../common/services/realtime.service';
import { CreateReimbursementDto, CreatePurchaseDto } from '../dto/finance.dto';

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly approvalService: ApprovalService,
    private readonly realtimeService: RealtimeService
  ) {}

  // --- 费用类型 ---
  async listExpenseTypes(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.fin_expense_type.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id' }),
      orderBy: { create_time: 'asc' }
    });
  }

  // --- 报销申请 ---
  async listReimbursements(userId: string, params: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.fin_reimbursement.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0, ...params }, { 
        platform: 'platform_id', 
        department: 'dept_id' 
      }),
      orderBy: { create_time: 'desc' }
    });
  }

  // ... (reimbursement methods)

  // --- 采购管理 ---
  async listPurchases(userId: string, params: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.fin_purchase.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0, ...params }, { 
        platform: 'platform_id', 
        department: 'dept_id' 
      }),
      orderBy: { create_time: 'desc' }
    });
  }

  async createPurchase(userId: string, dto: CreatePurchaseDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertPlatformAccess(scope, dto.platform_id);
    this.scopeService.assertDepartmentAccess(scope, dto.department_id);

    const purchaseNo = `PUR-${Date.now()}`;
    
    const purchase = await this.prisma.fin_purchase.create({
      data: {
        purchase_no: purchaseNo,
        items: dto.items, // 这里存储已排序的清单 JSON
        total_amount: dto.total_amount,
        reason: dto.reason,
        attachment_urls: dto.attachment_urls || [],
        applicant_id: userId,
        platform_id: dto.platform_id,
        dept_id: dto.department_id,
        status: 1
      }
    });

    // 发起审批并发送 Socket
    try {
      const user = await this.prisma.sys_user.findUnique({ where: { id: userId } });
      const approval = await this.approvalService.createAttendanceApproval({
        bizType: 'finance_purchase',
        bizId: purchase.id,
        bizNo: purchaseNo,
        applicantId: userId,
        applicantName: user?.name || 'Unknown',
        platformName: '默认平台',
        departmentName: '行政部',
        summary: `采购申请: ${dto.reason} (总计: ￥${dto.total_amount})`
      } as any);

      await this.prisma.fin_purchase.update({
        where: { id: purchase.id },
        data: { approval_request_id: approval.id }
      });

      if (approval.currentApproverId) {
        this.realtimeService.emitToUser(approval.currentApproverId, 'new_approval_task', {
          requestId: approval.id,
          requestNo: approval.requestNo,
          applicantName: user?.name,
          type: '采购审批',
          summary: purchase.reason,
          amount: purchase.total_amount
        });
      }
    } catch (e) {
      console.error('Purchase approval error:', e);
    }

    return purchase;
  }

  async createReimbursement(userId: string, dto: CreateReimbursementDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertPlatformAccess(scope, dto.platform_id);
    this.scopeService.assertDepartmentAccess(scope, dto.department_id);

    const reimNo = `REIM-${Date.now()}`;
    
    // 1. 创建报销记录 (移除 shop_id)
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
        status: 1 // 审批中
      }
    });

    // 2. 发起审批单并发送 Socket 通知
    try {
      const user = await this.prisma.sys_user.findUnique({ where: { id: userId } });
      const approval = await this.approvalService.createAttendanceApproval({
        bizType: 'finance_reimbursement',
        bizId: reim.id,
        bizNo: reimNo,
        applicantId: userId,
        applicantName: user?.name || 'Unknown',
        platformName: '默认平台',
        departmentName: '财务部',
        summary: `报销申请: ${dto.reason} (￥${dto.amount})`
      } as any);

      await this.prisma.fin_reimbursement.update({
        where: { id: reim.id },
        data: { approval_request_id: approval.id }
      });

      // 发送 Socket 通知给当前审批人
      if (approval.currentApproverId) {
        this.realtimeService.emitToUser(approval.currentApproverId, 'new_approval_task', {
          requestId: approval.id,
          requestNo: approval.requestNo,
          applicantName: user?.name,
          type: '报销审批',
          summary: reim.reason,
          amount: reim.amount
        });
      }
    } catch (e) {
      console.error('Failed to create approval or send socket for reimbursement:', e);
    }

    return reim;
  }

  // --- 收支流水 ---
  async listCashRecords(userId: string, params: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.fin_cash_record.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0, ...params }, { platform: 'platform_id' }),
      orderBy: { create_time: 'desc' }
    });
  }

  async createCashRecord(userId: string, data: any) {
    return this.prisma.fin_cash_record.create({
      data: {
        ...data,
        platform_id: data.platform_id,
        dept_id: data.dept_id
      }
    });
  }

  // --- 大屏统计 ---
  async getDashboardStats(userId: string, platformId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertPlatformAccess(scope, platformId);

    // 1. 核心指标汇总
    const [reimTotal, purchaseTotal, cashFlow] = await Promise.all([
      this.prisma.fin_reimbursement.aggregate({
        _sum: { amount: true },
        where: { platform_id: platformId, status: 2, is_deleted: 0 }
      }),
      this.prisma.fin_purchase.aggregate({
        _sum: { total_amount: true },
        where: { platform_id: platformId, status: 2, is_deleted: 0 }
      }),
      this.prisma.fin_cash_record.groupBy({
        by: ['type'],
        _sum: { amount: true },
        where: { platform_id: platformId, is_deleted: 0 }
      })
    ]);

    // 2. 费用类型占比
    const categoryStats = await this.prisma.fin_reimbursement.groupBy({
      by: ['expense_type_id'],
      _sum: { amount: true },
      where: { platform_id: platformId, status: 2, is_deleted: 0 }
    });

    return {
      overview: {
        reimbursement: Number(reimTotal._sum.amount || 0),
        purchase: Number(purchaseTotal._sum.total_amount || 0),
        income: Number(cashFlow.find(c => c.type === 1)?._sum.amount || 0),
        expense: Number(cashFlow.find(c => c.type === 2)?._sum.amount || 0),
      },
      categoryStats: categoryStats.map(c => ({
        typeId: c.expense_type_id,
        amount: Number(c._sum.amount || 0)
      }))
    };
  }
}
