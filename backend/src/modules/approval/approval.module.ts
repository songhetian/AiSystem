import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CommonModule } from '../../common/common.module';
import { SystemModule } from '../system/system.module';

// Controllers
import { ApprovalController } from './controllers/approval.controller';
import { ApprovalInstanceController } from './controllers/approval-instance.controller';
import { ApprovalTemplateController } from './controllers/approval-template.controller';
import { ApprovalProcessController } from './controllers/approval-process.controller';
import { ExpenseTypeController } from './controllers/expense-type.controller';
import { ReimbursementController } from './controllers/reimbursement.controller';
import { PurchaseController } from './controllers/purchase.controller';
import { FinancialRecordController } from './controllers/financial-record.controller';
import { StatisticsController } from './controllers/statistics.controller';

// Services
import { ApprovalService } from './services/approval.service';
import { ApprovalInstanceService } from './services/approval-instance.service';
import { ApprovalTemplateService } from './services/approval-template.service';
import { ApprovalProcessService } from './services/approval-process.service';
import { WorkflowEngineService } from './services/workflow-engine.service';
import { FormBuilderService } from './services/form-builder.service';
import { ExpenseTypeService } from './services/expense-type.service';
import { ReimbursementService } from './services/reimbursement.service';
import { PurchaseService } from './services/purchase.service';
import { FinancialRecordService } from './services/financial-record.service';
import { StatisticsService } from './services/statistics.service';

// Workers
import { ApprovalWorker } from './workers/approval.worker';

/**
 * 审批系统核心模块
 *
 * 功能特性:
 * - 审批流程管理 (ApprovalService)
 * - 审批实例管理 (ApprovalInstanceService)
 * - 审批模板管理 (ApprovalTemplateService)
 * - 审批流程配置 (ApprovalProcessService)
 * - 工作流引擎 (WorkflowEngineService)
 * - 动态表单构建 (FormBuilderService)
 * - 费用类型管理 (ExpenseTypeService)
 * - 报销管理 (ReimbursementService)
 * - 采购管理 (PurchaseService)
 * - 收支记录管理 (FinancialRecordService)
 * - 数据统计分析 (StatisticsService)
 *
 * 集成功能:
 * - JWT认证守卫 (通过CommonModule)
 * - 系统日志拦截器 (通过CommonModule)
 * - Redis缓存服务 (通过CommonModule)
 * - WebSocket通知服务 (通过CommonModule)
 * - 消息队列处理 (BullMQ)
 */
@Module({
  imports: [
    CommonModule, // 提供JWT认证、Redis缓存、WebSocket通知等基础服务
    SystemModule, // 提供系统消息服务
    BullModule.registerQueue({
      name: 'approval-queue', // 审批流程异步处理队列
    }),
  ],
  controllers: [
    ApprovalController, // 审批流程管理API
    ApprovalInstanceController, // 审批实例管理API
    ApprovalTemplateController, // 审批模板管理API
    ApprovalProcessController, // 审批流程配置API
    ExpenseTypeController, // 费用类型管理API
    ReimbursementController, // 报销管理API
    PurchaseController, // 采购管理API
    FinancialRecordController, // 收支记录管理API
    StatisticsController, // 统计分析API
  ],
  providers: [
    // 核心服务
    ApprovalService, // 审批流程管理服务
    ApprovalInstanceService, // 审批实例管理服务
    ApprovalTemplateService, // 审批模板管理服务
    ApprovalProcessService, // 审批流程配置服务
    WorkflowEngineService, // 工作流引擎服务
    FormBuilderService, // 表单构建器服务

    // 业务服务
    ExpenseTypeService, // 费用类型管理服务
    ReimbursementService, // 报销管理服务
    PurchaseService, // 采购管理服务
    FinancialRecordService, // 收支记录管理服务
    StatisticsService, // 统计分析服务

    // 后台任务
    ApprovalWorker, // 审批流程后台处理器
  ],
  exports: [
    // 导出核心服务供其他模块使用
    ApprovalService,
    ApprovalInstanceService,
    ApprovalTemplateService,
    ApprovalProcessService,
    WorkflowEngineService,
    FormBuilderService,
    ExpenseTypeService,
    ReimbursementService,
    PurchaseService,
    FinancialRecordService,
    StatisticsService,
  ],
})
export class ApprovalModule {}
