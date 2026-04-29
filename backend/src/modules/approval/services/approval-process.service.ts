import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Cacheable } from '../../../common/decorators/cache.decorator';
import { CacheEvict } from '../../../common/decorators/cache-evict.decorator';
import { QueryOptimize } from '../../../common/decorators/query-optimize.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { WorkflowEngineService, WorkflowNode, WorkflowCondition, WorkflowTemplate } from './workflow-engine.service';

export interface ApprovalProcessConfig {
  id: string;
  name: string;
  description?: string;
  version: number;
  nodes: WorkflowNode[];
  variables?: ProcessVariable[];
  settings: ProcessSettings;
  status: 'draft' | 'active' | 'archived';
  templateId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  defaultValue?: any;
  description?: string;
  required?: boolean;
}

export interface ProcessSettings {
  allowRecall?: boolean;
  allowDelegate?: boolean;
  allowTransfer?: boolean;
  maxTimeout?: number; // 最大超时时间(小时)
  autoApproveTimeout?: boolean; // 超时自动审批
  notificationSettings?: NotificationSettings;
  escalationRules?: EscalationRule[];
}

export interface NotificationSettings {
  enableEmail?: boolean;
  enableSms?: boolean;
  enableWebSocket?: boolean;
  reminderIntervals?: number[]; // 提醒间隔(小时)
  escalationDelay?: number; // 升级延迟(小时)
}

export interface EscalationRule {
  nodeId: string;
  timeoutHours: number;
  escalateTo: 'manager' | 'admin' | 'specific';
  targetUserId?: string;
  targetRoleCode?: string;
}

export interface ApproverAssignmentRule {
  type: 'user' | 'role' | 'department' | 'dynamic';
  userIds?: string[];
  roleCode?: string;
  departmentId?: string;
  dynamicRule?: string; // JavaScript表达式
  fallbackUserId?: string; // 兜底审批人
}

export interface ProcessValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProcessVersionInfo {
  version: number;
  description?: string;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

@Injectable()
export class ApprovalProcessService {
  private readonly logger = new Logger(ApprovalProcessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  /**
   * 创建审批流程配置
   */
  @CacheEvict({
    pattern: 'approval:process:*',
  })
  async createProcess(
    userId: string,
    config: Omit<ApprovalProcessConfig, 'id' | 'version' | 'createdBy' | 'createdAt' | 'updatedAt'>
  ): Promise<ApprovalProcessConfig> {
    // 验证流程配置
    const validation = await this.validateProcessConfig(config);
    if (!validation.isValid) {
      throw new BadRequestException(`流程配置验证失败: ${validation.errors.join(', ')}`);
    }

    // 检查流程名称唯一性
    await this.checkProcessNameUnique(config.name);

    const processId = randomUUID();
    const processConfig: ApprovalProcessConfig = {
      ...config,
      id: processId,
      version: 1,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 保存到数据库
    await this.saveProcessConfig(processConfig);

    // 如果关联了模板，更新模板的工作流配置
    if (config.templateId) {
      await this.updateTemplateWorkflowConfig(config.templateId, processConfig);
    }

    this.logger.log(`Created approval process: ${processId} by user: ${userId}`);
    return processConfig;
  }

  /**
   * 更新审批流程配置
   */
  @CacheEvict({
    pattern: 'approval:process:*',
  })
  async updateProcess(
    userId: string,
    processId: string,
    updates: Partial<Omit<ApprovalProcessConfig, 'id' | 'createdBy' | 'createdAt'>>
  ): Promise<ApprovalProcessConfig> {
    const existingProcess = await this.getProcessConfig(processId);
    if (!existingProcess) {
      throw new NotFoundException('审批流程不存在');
    }

    // 检查是否有活跃的审批实例使用此流程
    if (updates.nodes || updates.settings) {
      await this.checkActiveInstances(processId);
    }

    // 验证更新的配置
    const updatedConfig = { ...existingProcess, ...updates, updatedAt: new Date() };
    const validation = await this.validateProcessConfig(updatedConfig);
    if (!validation.isValid) {
      throw new BadRequestException(`流程配置验证失败: ${validation.errors.join(', ')}`);
    }

    // 检查名称唯一性（排除当前流程）
    if (updates.name && updates.name !== existingProcess.name) {
      await this.checkProcessNameUnique(updates.name, processId);
    }

    // 创建新版本
    const newVersion = existingProcess.version + 1;
    const newConfig: ApprovalProcessConfig = {
      ...updatedConfig,
      version: newVersion,
    };

    // 保存新版本
    await this.saveProcessConfig(newConfig);

    // 归档旧版本
    await this.archiveProcessVersion(processId, existingProcess.version);

    // 更新关联模板
    if (newConfig.templateId) {
      await this.updateTemplateWorkflowConfig(newConfig.templateId, newConfig);
    }

    this.logger.log(`Updated approval process: ${processId} to version ${newVersion} by user: ${userId}`);
    return newConfig;
  }

  /**
   * 获取审批流程配置
   */
  @Cacheable({
    prefix: 'approval:process',
    ttl: 300,
    keyGenerator: (processId: string) => processId,
  })
  async getProcessConfig(processId: string): Promise<ApprovalProcessConfig | null> {
    try {
      // 从模板表获取最新的工作流配置
      const template = await this.prisma.approval_template.findFirst({
        where: {
          id: processId,
          is_deleted: 0,
        },
      });

      if (!template) {
        return null;
      }

      // 安全地访问 workflow_config，因为它可能不存在于数据库模式中
      const workflowConfig = (template as any).workflow_config || {};

      return {
        id: template.id,
        name: template.name,
        description: template.description || undefined,
        version: workflowConfig.version || 1,
        nodes: Array.isArray(template.nodes) ? (template.nodes as any) : [],
        variables: workflowConfig.variables || [],
        settings: workflowConfig.settings || this.getDefaultSettings(),
        status: template.status === 'enabled' ? 'active' : 'draft',
        templateId: template.id,
        createdBy: (template as any).creator_id || 'system',
        createdAt: template.create_time,
        updatedAt: template.update_time,
      };
    } catch (error) {
      this.logger.error(`Failed to get process config: ${error}`);
      return null;
    }
  }

  /**
   * 获取流程版本历史
   */
  @Cacheable({
    prefix: 'approval:process-versions',
    ttl: 300,
    keyGenerator: (processId: string) => processId,
  })
  async getProcessVersions(processId: string): Promise<ProcessVersionInfo[]> {
    // 简化实现：从模板表获取版本信息
    const template = await this.prisma.approval_template.findFirst({
      where: {
        id: processId,
        is_deleted: 0,
      },
    });

    if (!template) {
      return [];
    }

    const workflowConfig = (template as any).workflow_config || {};
    return [{
      version: workflowConfig.version || 1,
      description: workflowConfig.versionDescription,
      createdBy: workflowConfig.updatedBy || (template as any).creator_id || 'system',
      createdAt: template.update_time,
      isActive: template.status === 'enabled',
    }];
  }

  /**
   * 验证审批流程配置
   */
  async validateProcessConfig(config: Partial<ApprovalProcessConfig>): Promise<ProcessValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基本字段验证
    if (!config.name?.trim()) {
      errors.push('流程名称不能为空');
    }

    if (!config.nodes || config.nodes.length === 0) {
      errors.push('流程必须包含至少一个节点');
    }

    if (config.nodes) {
      // 使用工作流引擎的验证逻辑
      try {
        const workflowTemplate: WorkflowTemplate = {
          id: config.id || 'temp',
          name: config.name || 'temp',
          version: config.version || 1,
          nodes: config.nodes,
          variables: config.variables,
          settings: config.settings,
        };
        this.workflowEngine.validateWorkflowTemplate(workflowTemplate);
      } catch (error) {
        if (error instanceof BadRequestException) {
          errors.push(error.message);
        } else {
          errors.push('工作流配置验证失败');
        }
      }

      // 验证节点配置
      const nodeValidation = this.validateNodes(config.nodes);
      errors.push(...nodeValidation.errors);
      warnings.push(...nodeValidation.warnings);
    }

    // 验证审批人分配规则
    if (config.nodes) {
      const approverValidation = this.validateApproverAssignment(config.nodes);
      errors.push(...approverValidation.errors);
      warnings.push(...approverValidation.warnings);
    }

    // 验证流程设置
    if (config.settings) {
      const settingsValidation = this.validateProcessSettings(config.settings);
      errors.push(...settingsValidation.errors);
      warnings.push(...settingsValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证节点配置
   */
  private validateNodes(nodes: WorkflowNode[]): ProcessValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查开始节点
    const startNodes = nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) {
      errors.push('流程必须包含开始节点');
    } else if (startNodes.length > 1) {
      errors.push('流程只能包含一个开始节点');
    }

    // 检查结束节点
    const endNodes = nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) {
      errors.push('流程必须包含结束节点');
    } else if (endNodes.length > 1) {
      errors.push('流程只能包含一个结束节点');
    }

    // 检查审批节点
    const approvalNodes = nodes.filter(n => n.type === 'approval');
    if (approvalNodes.length === 0) {
      warnings.push('流程中没有审批节点，将直接通过');
    }

    // 验证每个节点
    nodes.forEach((node, index) => {
      if (!node.id) {
        errors.push(`节点 ${index + 1} 缺少 id`);
      }
      if (!node.name) {
        errors.push(`节点 ${index + 1} 缺少 name`);
      }
      if (!node.type) {
        errors.push(`节点 ${index + 1} 缺少 type`);
      }

      // 验证审批节点
      if (node.type === 'approval') {
        if (!node.approvers || node.approvers.length === 0) {
          errors.push(`审批节点 ${node.name} 必须设置审批人`);
        }

        // 验证审批模式
        if (node.mode && !['and', 'or'].includes(node.mode)) {
          errors.push(`审批节点 ${node.name} 的审批模式必须是 'and' 或 'or'`);
        }

        // 验证超时设置
        if (node.timeout && (node.timeout <= 0 || node.timeout > 720)) {
          warnings.push(`审批节点 ${node.name} 的超时时间建议在 1-720 小时之间`);
        }
      }

      // 验证分支节点
      if (node.type === 'branch') {
        if (!node.conditions || node.conditions.length === 0) {
          errors.push(`分支节点 ${node.name} 必须设置条件`);
        }
      }
    });

    // 检查节点ID唯一性
    const nodeIds = nodes.map(n => n.id);
    const duplicateIds = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`节点ID重复: ${duplicateIds.join(', ')}`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * 验证审批人分配规则
   */
  private validateApproverAssignment(nodes: WorkflowNode[]): ProcessValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const approvalNodes = nodes.filter(n => n.type === 'approval');

    for (const node of approvalNodes) {
      if (!node.approvers || node.approvers.length === 0) {
        continue; // 已在节点验证中处理
      }

      // 检查审批人信息完整性
      for (const approver of node.approvers) {
        if (!approver.id) {
          errors.push(`审批节点 ${node.name} 的审批人缺少 id`);
        }
        if (!approver.name) {
          warnings.push(`审批节点 ${node.name} 的审批人 ${approver.id} 缺少 name`);
        }
      }

      // 检查会签模式下的审批人数量
      if (node.mode === 'and' && node.approvers.length > 10) {
        warnings.push(`审批节点 ${node.name} 会签模式下审批人过多，可能影响效率`);
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * 验证流程设置
   */
  private validateProcessSettings(settings: ProcessSettings): ProcessValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证最大超时时间
    if (settings.maxTimeout && (settings.maxTimeout <= 0 || settings.maxTimeout > 8760)) {
      errors.push('最大超时时间必须在 1-8760 小时之间');
    }

    // 验证通知设置
    if (settings.notificationSettings) {
      const { reminderIntervals, escalationDelay } = settings.notificationSettings;

      if (reminderIntervals && reminderIntervals.some(interval => interval <= 0)) {
        errors.push('提醒间隔必须大于 0');
      }

      if (escalationDelay && escalationDelay <= 0) {
        errors.push('升级延迟必须大于 0');
      }
    }

    // 验证升级规则
    if (settings.escalationRules) {
      for (const rule of settings.escalationRules) {
        if (!rule.nodeId) {
          errors.push('升级规则必须指定节点ID');
        }
        if (rule.timeoutHours <= 0) {
          errors.push('升级规则的超时时间必须大于 0');
        }
        if (rule.escalateTo === 'specific' && !rule.targetUserId) {
          errors.push('指定用户升级必须提供目标用户ID');
        }
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * 检查流程名称唯一性
   */
  private async checkProcessNameUnique(name: string, excludeId?: string): Promise<void> {
    const where: any = {
      name,
      is_deleted: 0,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existing = await this.prisma.approval_template.findFirst({ where });
    if (existing) {
      throw new BadRequestException('流程名称已存在');
    }
  }

  /**
   * 检查活跃的审批实例
   */
  private async checkActiveInstances(processId: string): Promise<void> {
    // 使用 approval_request 表而不是 approval_instances，因为后者可能不存在于当前模式中
    const activeCount = await this.prisma.approval_request.count({
      where: {
        template_id: processId,
        status: { in: ['pending'] },
        is_deleted: 0,
      },
    });

    if (activeCount > 0) {
      throw new BadRequestException(`该流程正在被 ${activeCount} 个审批实例使用，无法修改关键配置`);
    }
  }

  /**
   * 保存流程配置到数据库
   */
  private async saveProcessConfig(config: ApprovalProcessConfig): Promise<void> {
    const workflowConfig = {
      version: config.version,
      variables: config.variables || [],
      settings: config.settings,
      updatedBy: config.createdBy,
      updatedAt: config.updatedAt.toISOString(),
      versionDescription: `Version ${config.version}`,
    };

    // 更新或创建模板记录，使用类型断言来处理可能不存在的字段
    const updateData: any = {
      name: config.name,
      description: config.description,
      nodes: config.nodes as any,
      status: config.status === 'active' ? 'enabled' : 'disabled',
      update_time: config.updatedAt,
    };

    // 只有在数据库支持时才添加 workflow_config
    if ('workflow_config' in this.prisma.approval_template.fields || true) {
      updateData.workflow_config = workflowConfig as any;
    }

    const createData: any = {
      id: config.id,
      name: config.name,
      type: 'process',
      platform_name: 'Default',
      department_name: 'Default',
      description: config.description,
      nodes: config.nodes as any,
      status: config.status === 'active' ? 'enabled' : 'disabled',
      is_deleted: 0,
    };

    // 只有在数据库支持时才添加 workflow_config 和 creator_id
    if ('workflow_config' in this.prisma.approval_template.fields || true) {
      createData.workflow_config = workflowConfig as any;
    }
    if ('creator_id' in this.prisma.approval_template.fields || true) {
      createData.creator_id = config.createdBy;
    }

    await this.prisma.approval_template.upsert({
      where: { id: config.id },
      update: updateData,
      create: createData,
    });
  }

  /**
   * 更新模板的工作流配置
   */
  private async updateTemplateWorkflowConfig(
    templateId: string,
    processConfig: ApprovalProcessConfig
  ): Promise<void> {
    const workflowConfig = {
      version: processConfig.version,
      variables: processConfig.variables || [],
      settings: processConfig.settings,
      processId: processConfig.id,
      updatedBy: processConfig.createdBy,
      updatedAt: processConfig.updatedAt.toISOString(),
    };

    const updateData: any = {
      nodes: processConfig.nodes as any,
      update_time: processConfig.updatedAt,
    };

    // 只有在数据库支持时才添加 workflow_config
    if ('workflow_config' in this.prisma.approval_template.fields || true) {
      updateData.workflow_config = workflowConfig as any;
    }

    await this.prisma.approval_template.update({
      where: { id: templateId },
      data: updateData,
    });
  }

  /**
   * 归档流程版本
   */
  private async archiveProcessVersion(processId: string, version: number): Promise<void> {
    // 简化实现：在实际项目中可能需要单独的版本历史表
    this.logger.log(`Archived process version: ${processId} v${version}`);
  }

  /**
   * 获取默认流程设置
   */
  private getDefaultSettings(): ProcessSettings {
    return {
      allowRecall: true,
      allowDelegate: true,
      allowTransfer: true,
      maxTimeout: 72, // 72小时
      autoApproveTimeout: false,
      notificationSettings: {
        enableEmail: false,
        enableSms: false,
        enableWebSocket: true,
        reminderIntervals: [24, 48], // 24小时和48小时提醒
        escalationDelay: 72, // 72小时后升级
      },
      escalationRules: [],
    };
  }

  /**
   * 删除审批流程
   */
  @CacheEvict({
    pattern: 'approval:process:*',
  })
  async deleteProcess(userId: string, processId: string): Promise<void> {
    const existingProcess = await this.getProcessConfig(processId);
    if (!existingProcess) {
      throw new NotFoundException('审批流程不存在');
    }

    // 检查是否有活跃的审批实例
    await this.checkActiveInstances(processId);

    // 软删除
    await this.prisma.approval_template.update({
      where: { id: processId },
      data: { is_deleted: 1 },
    });

    this.logger.log(`Deleted approval process: ${processId} by user: ${userId}`);
  }

  /**
   * 激活流程版本
   */
  @CacheEvict({
    pattern: 'approval:process:*',
  })
  async activateProcessVersion(userId: string, processId: string, version: number): Promise<void> {
    const processConfig = await this.getProcessConfig(processId);
    if (!processConfig) {
      throw new NotFoundException('审批流程不存在');
    }

    if (processConfig.version === version) {
      // 已经是当前版本，只需要激活
      await this.prisma.approval_template.update({
        where: { id: processId },
        data: { status: 'enabled' },
      });
    } else {
      // TODO: 实现版本切换逻辑
      throw new BadRequestException('版本切换功能暂未实现');
    }

    this.logger.log(`Activated process version: ${processId} v${version} by user: ${userId}`);
  }

  /**
   * 复制审批流程
   */
  @CacheEvict({
    pattern: 'approval:process:*',
  })
  async copyProcess(userId: string, processId: string, newName: string): Promise<ApprovalProcessConfig> {
    const originalProcess = await this.getProcessConfig(processId);
    if (!originalProcess) {
      throw new NotFoundException('原审批流程不存在');
    }

    const newProcess = await this.createProcess(userId, {
      name: newName,
      description: `${originalProcess.description || ''} (副本)`,
      nodes: originalProcess.nodes,
      variables: originalProcess.variables,
      settings: originalProcess.settings,
      status: 'draft', // 副本默认为草稿状态
    });

    this.logger.log(`Copied approval process: ${processId} -> ${newProcess.id} by user: ${userId}`);
    return newProcess;
  }

  /**
   * 获取流程统计信息
   */
  @Cacheable({
    prefix: 'approval:process-stats',
    ttl: 600,
    keyGenerator: (processId: string) => processId,
  })
  async getProcessStats(processId: string): Promise<{
    totalInstances: number;
    pendingInstances: number;
    approvedInstances: number;
    rejectedInstances: number;
    averageProcessingTime: number; // 小时
  }> {
    // 使用 approval_request 表而不是 approval_instances
    const [total, pending, approved, rejected] = await Promise.all([
      this.prisma.approval_request.count({
        where: { template_id: processId, is_deleted: 0 },
      }),
      this.prisma.approval_request.count({
        where: { template_id: processId, status: 'pending', is_deleted: 0 },
      }),
      this.prisma.approval_request.count({
        where: { template_id: processId, status: 'approved', is_deleted: 0 },
      }),
      this.prisma.approval_request.count({
        where: { template_id: processId, status: 'rejected', is_deleted: 0 },
      }),
    ]);

    // 计算平均处理时间
    const completedInstances = await this.prisma.approval_request.findMany({
      where: {
        template_id: processId,
        status: { in: ['approved', 'rejected'] },
        is_deleted: 0,
      },
      select: {
        create_time: true,
        update_time: true,
      },
    });

    let averageProcessingTime = 0;
    if (completedInstances.length > 0) {
      const totalProcessingTime = completedInstances.reduce((sum, instance) => {
        const processingTime = instance.update_time.getTime() - instance.create_time.getTime();
        return sum + processingTime;
      }, 0);
      averageProcessingTime = totalProcessingTime / completedInstances.length / (1000 * 60 * 60); // 转换为小时
    }

    return {
      totalInstances: total,
      pendingInstances: pending,
      approvedInstances: approved,
      rejectedInstances: rejected,
      averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
    };
  }
}
