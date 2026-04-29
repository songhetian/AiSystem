import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Cacheable } from '../../../common/decorators/cache.decorator';
import { CacheEvict } from '../../../common/decorators/cache-evict.decorator';
import { QueryOptimize } from '../../../common/decorators/query-optimize.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { SaveApprovalTemplateDto } from '../dto/save-approval-template.dto';
import { QueryApprovalTemplatesDto } from '../dto/query-approval-templates.dto';

export interface ApprovalTemplate {
  id: string;
  name: string;
  type: string;
  platformId?: string;
  platformName: string;
  deptId?: string;
  departmentName: string;
  status: string;
  description: string;
  updatedAt: string;
  createdAt: string;
  nodes: any[];
  formFields?: any[];
  workflowConfig?: any;
  creatorId?: string;
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
}

@Injectable()
export class ApprovalTemplateService {
  private readonly logger = new Logger(ApprovalTemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get templateDelegate() {
    return this.prisma['approval_template' as keyof typeof this.prisma] as any;
  }

  private get instanceDelegate() {
    return this.prisma['approval_instances' as keyof typeof this.prisma] as any;
  }

  /**
   * 获取审批模板列表
   */
  @Cacheable({
    prefix: 'approval:templates',
    ttl: 300,
    keyGenerator: (userId: string | undefined, query: QueryApprovalTemplatesDto) =>
      `${userId}:${query.type || 'all'}:${query.status || 'all'}:${query.keyword || 'all'}:${query.page || 1}:${query.pageSize || 20}`,
  })
  @QueryOptimize()
  async listTemplates(userId?: string, query: QueryApprovalTemplatesDto = {}) {
    const where: Record<string, any> = { is_deleted: 0 };

    // 类型筛选
    if (query.type) {
      where.type = query.type;
    }

    // 状态筛选
    if (query.status) {
      where.status = query.status;
    }

    // 关键词搜索
    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { description: { contains: query.keyword } },
        { type: { contains: query.keyword } },
      ];
    }

    // 权限控制：用户只能看到自己有权限的模板
    if (userId) {
      // TODO: 根据用户权限添加平台和部门过滤
      // where.OR = [
      //   { platform_id: userPlatformId },
      //   { dept_id: userDeptId },
      //   { creator_id: userId }
      // ];
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.templateDelegate.findMany({
        where,
        orderBy: { update_time: 'desc' },
        skip,
        take: pageSize,
      }),
      this.templateDelegate.count({ where }),
    ]);

    return {
      items: items.map((item: Record<string, any>) => this.mapTemplate(item)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取审批模板详情
   */
  @Cacheable({
    prefix: 'approval:template-detail',
    ttl: 300,
    keyGenerator: (userId: string | undefined, id: string) => `${userId}:${id}`,
  })
  async getTemplate(userId: string | undefined, id: string): Promise<ApprovalTemplate> {
    const item = await this.templateDelegate.findFirst({
      where: { id, is_deleted: 0 },
    });

    if (!item) {
      throw new NotFoundException('审批模板不存在');
    }

    return this.mapTemplate(item);
  }

  /**
   * 创建审批模板
   */
  @CacheEvict({
    pattern: 'approval:templates:*',
  })
  async createTemplate(userId: string | undefined, dto: SaveApprovalTemplateDto) {
    // 验证模板配置
    const validation = this.validateTemplateConfig(dto);
    if (!validation.isValid) {
      throw new BadRequestException(`模板配置验证失败: ${validation.errors.join(', ')}`);
    }

    // 检查模板名称是否重复
    await this.checkTemplateNameUnique(dto.name);

    const id = dto.id || randomUUID();
    const payload = this.normalizeTemplatePayload(dto, id, userId);

    try {
      const created = await this.templateDelegate.create({ data: payload });
      this.logger.log(`Template created: ${id} by user: ${userId}`);
      return this.mapTemplate(created);
    } catch (error) {
      this.logger.error(`Failed to create template: ${error}`);
      throw new BadRequestException('创建模板失败');
    }
  }

  /**
   * 更新审批模板
   */
  @CacheEvict({
    pattern: 'approval:templates:*',
  })
  async updateTemplate(userId: string | undefined, id: string, dto: SaveApprovalTemplateDto) {
    await this.ensureTemplateExists(id);

    // 检查是否有活跃的审批实例使用此模板
    await this.checkActiveInstances(id);

    // 验证模板配置
    const validation = this.validateTemplateConfig(dto);
    if (!validation.isValid) {
      throw new BadRequestException(`模板配置验证失败: ${validation.errors.join(', ')}`);
    }

    // 检查模板名称是否重复（排除当前模板）
    await this.checkTemplateNameUnique(dto.name, id);

    const payload = this.normalizeTemplatePayload(dto, id, userId);

    try {
      const updated = await this.templateDelegate.update({
        where: { id },
        data: payload,
      });
      this.logger.log(`Template updated: ${id} by user: ${userId}`);
      return this.mapTemplate(updated);
    } catch (error) {
      this.logger.error(`Failed to update template: ${error}`);
      throw new BadRequestException('更新模板失败');
    }
  }

  /**
   * 删除审批模板
   */
  @CacheEvict({
    pattern: 'approval:templates:*',
  })
  async deleteTemplate(userId: string | undefined, id: string) {
    await this.ensureTemplateExists(id);

    // 检查是否有活跃的审批实例使用此模板
    await this.checkActiveInstances(id);

    try {
      await this.templateDelegate.update({
        where: { id },
        data: { is_deleted: 1 },
      });
      this.logger.log(`Template deleted: ${id} by user: ${userId}`);
      return { success: true, message: '模板删除成功' };
    } catch (error) {
      this.logger.error(`Failed to delete template: ${error}`);
      throw new BadRequestException('删除模板失败');
    }
  }

  /**
   * 启用/禁用审批模板
   */
  @CacheEvict({
    pattern: 'approval:templates:*',
  })
  async toggleTemplateStatus(userId: string | undefined, id: string, status: 'enabled' | 'disabled') {
    await this.ensureTemplateExists(id);

    if (status === 'disabled') {
      // 禁用时检查是否有活跃的审批实例
      await this.checkActiveInstances(id);
    }

    try {
      const updated = await this.templateDelegate.update({
        where: { id },
        data: { status },
      });
      this.logger.log(`Template status changed: ${id} to ${status} by user: ${userId}`);
      return this.mapTemplate(updated);
    } catch (error) {
      this.logger.error(`Failed to toggle template status: ${error}`);
      throw new BadRequestException('更新模板状态失败');
    }
  }

  /**
   * 复制审批模板
   */
  @CacheEvict({
    pattern: 'approval:templates:*',
  })
  async copyTemplate(userId: string | undefined, id: string) {
    const original = await this.getTemplate(userId, id);

    const copyDto: SaveApprovalTemplateDto = {
      id: randomUUID(),
      name: `${original.name} (副本)`,
      type: original.type,
      platformId: original.platformId,
      platformName: original.platformName,
      deptId: original.deptId,
      departmentName: original.departmentName,
      status: 'disabled', // 副本默认为禁用状态
      description: original.description,
      updatedAt: new Date().toISOString(),
      nodes: original.nodes,
      formFields: original.formFields,
    };

    try {
      const copied = await this.createTemplate(userId, copyDto);
      this.logger.log(`Template copied: ${id} -> ${copied.id} by user: ${userId}`);
      return copied;
    } catch (error) {
      this.logger.error(`Failed to copy template: ${error}`);
      throw new BadRequestException('复制模板失败');
    }
  }

  /**
   * 验证表单配置
   */
  validateFormConfig(formFields: any[]): TemplateValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(formFields)) {
      return { isValid: true, errors: [] }; // 表单字段可选
    }

    formFields.forEach((field, index) => {
      if (!field.id) {
        errors.push(`表单字段 ${index + 1} 缺少 id`);
      }
      if (!field.type) {
        errors.push(`表单字段 ${index + 1} 缺少 type`);
      }
      if (!field.label) {
        errors.push(`表单字段 ${index + 1} 缺少 label`);
      }

      // 验证字段类型
      const validTypes = ['text', 'textarea', 'number', 'date', 'select', 'file', 'checkbox', 'radio'];
      if (field.type && !validTypes.includes(field.type)) {
        errors.push(`表单字段 ${index + 1} 类型 ${field.type} 不支持`);
      }

      // 验证必填字段
      if (field.required && typeof field.required !== 'boolean') {
        errors.push(`表单字段 ${index + 1} required 必须是布尔值`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证工作流配置
   */
  validateWorkflowConfig(nodes: any[]): TemplateValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(nodes) || nodes.length === 0) {
      errors.push('工作流节点不能为空');
      return { isValid: false, errors };
    }

    // 检查是否有开始节点
    const startNodes = nodes.filter(node => node.type === 'start');
    if (startNodes.length === 0) {
      errors.push('工作流必须包含开始节点');
    } else if (startNodes.length > 1) {
      errors.push('工作流只能有一个开始节点');
    }

    // 检查是否有结束节点
    const endNodes = nodes.filter(node => node.type === 'end');
    if (endNodes.length === 0) {
      errors.push('工作流必须包含结束节点');
    } else if (endNodes.length > 1) {
      errors.push('工作流只能有一个结束节点');
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

      // 验证节点类型
      const validTypes = ['start', 'approval', 'branch', 'copy', 'end'];
      if (node.type && !validTypes.includes(node.type)) {
        errors.push(`节点 ${index + 1} 类型 ${node.type} 不支持`);
      }

      // 审批节点必须有审批人
      if (node.type === 'approval' && (!node.approvers || node.approvers.length === 0)) {
        errors.push(`审批节点 ${node.name} 必须设置审批人`);
      }

      // 分支节点必须有条件
      if (node.type === 'branch' && !node.condition) {
        errors.push(`分支节点 ${node.name} 必须设置条件`);
      }
    });

    // TODO: 检查节点连接是否形成有效的流程图（无死循环、无孤立节点）

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证模板配置
   */
  private validateTemplateConfig(dto: SaveApprovalTemplateDto): TemplateValidationResult {
    const errors: string[] = [];

    // 基本字段验证
    if (!dto.name?.trim()) {
      errors.push('模板名称不能为空');
    }
    if (!dto.type?.trim()) {
      errors.push('模板类型不能为空');
    }
    if (!dto.platformName?.trim()) {
      errors.push('平台名称不能为空');
    }
    if (!dto.departmentName?.trim()) {
      errors.push('部门名称不能为空');
    }

    // 验证表单配置
    if (dto.formFields) {
      const formValidation = this.validateFormConfig(dto.formFields);
      if (!formValidation.isValid) {
        errors.push(...formValidation.errors);
      }
    }

    // 验证工作流配置
    if (dto.nodes) {
      const workflowValidation = this.validateWorkflowConfig(dto.nodes);
      if (!workflowValidation.isValid) {
        errors.push(...workflowValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 检查模板名称是否唯一
   */
  private async checkTemplateNameUnique(name: string, excludeId?: string) {
    const where: any = {
      name,
      is_deleted: 0,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existing = await this.templateDelegate.findFirst({ where });
    if (existing) {
      throw new BadRequestException('模板名称已存在');
    }
  }

  /**
   * 检查是否有活跃的审批实例使用此模板
   */
  private async checkActiveInstances(templateId: string) {
    const activeCount = await this.instanceDelegate.count({
      where: {
        template_id: templateId,
        status: { in: ['pending', 'processing'] },
        is_deleted: 0,
      },
    });

    if (activeCount > 0) {
      throw new BadRequestException(`该模板正在被 ${activeCount} 个审批实例使用，无法修改或删除`);
    }
  }

  /**
   * 确保模板存在
   */
  private async ensureTemplateExists(id: string) {
    const item = await this.templateDelegate.findFirst({
      where: { id, is_deleted: 0 },
    });
    if (!item) {
      throw new NotFoundException('审批模板不存在');
    }
  }

  /**
   * 规范化模板数据
   */
  private normalizeTemplatePayload(dto: SaveApprovalTemplateDto, id: string, userId?: string) {
    return {
      id,
      name: dto.name.trim(),
      type: dto.type.trim(),
      platform_id: dto.platformId,
      platform_name: dto.platformName.trim(),
      dept_id: dto.deptId,
      department_name: dto.departmentName.trim(),
      status: dto.status,
      description: dto.description?.trim() || '',
      updated_at: dto.updatedAt || new Date().toISOString(),
      nodes: dto.nodes || [],
      form_fields: dto.formFields || [],
      workflow_config: {
        version: '1.0',
        updatedBy: userId,
        updatedAt: new Date().toISOString(),
      },
      creator_id: userId,
      is_deleted: 0,
    };
  }

  /**
   * 映射模板数据
   */
  private mapTemplate(item: Record<string, any>): ApprovalTemplate {
    return {
      id: item.id,
      name: item.name,
      type: item.type,
      platformId: item.platform_id,
      platformName: item.platform_name,
      deptId: item.dept_id,
      departmentName: item.department_name,
      status: item.status,
      description: item.description || '',
      updatedAt: item.updated_at || item.update_time?.toISOString(),
      createdAt: item.create_time?.toISOString(),
      nodes: Array.isArray(item.nodes) ? item.nodes : [],
      formFields: Array.isArray(item.form_fields) ? item.form_fields : [],
      workflowConfig: item.workflow_config,
      creatorId: item.creator_id,
    };
  }
}
