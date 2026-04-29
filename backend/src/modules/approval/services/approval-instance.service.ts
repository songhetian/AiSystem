import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../common/services/redis.service';
import { RealtimeService } from '../../../common/services/realtime.service';
import { Cacheable } from '../../../common/decorators/cache.decorator';
import { CacheEvict } from '../../../common/decorators/cache-evict.decorator';
import { QueryOptimize } from '../../../common/decorators/query-optimize.decorator';
import { CreateApprovalInstanceDto } from '../dto/create-approval-instance.dto';
import { QueryApprovalInstancesDto } from '../dto/query-approval-instances.dto';
import { ProcessApprovalInstanceDto } from '../dto/process-approval-instance.dto';
import { WorkflowEngineService } from './workflow-engine.service';
import { ApprovalProcessService } from './approval-process.service';

export interface ApprovalInstanceDetail {
  id: string;
  templateId: string;
  templateName?: string;
  applicantId: string;
  applicantName?: string;
  title: string;
  formData: any;
  currentNodeId?: string;
  currentNodeName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  priority: number;
  priorityName: string;
  platformId?: string;
  departmentId?: string;
  createdAt: Date;
  updatedAt: Date;
  approvalRecords?: ApprovalRecord[];
  template?: {
    id: string;
    name: string;
    type: string;
    nodes: any[];
    formFields?: any[];
  };
}

export interface ApprovalRecord {
  id: string;
  nodeId: string;
  nodeName?: string;
  approverId: string;
  approverName?: string;
  action: 'approve' | 'reject' | 'transfer' | 'delegate';
  comment?: string;
  attachments?: string[];
  processTime: Date;
}

export interface ApprovalInstanceStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  myPending: number;
  myApproved: number;
  myRejected: number;
}

@Injectable()
export class ApprovalInstanceService {
  private readonly logger = new Logger(ApprovalInstanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly realtimeService: RealtimeService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly approvalProcessService: ApprovalProcessService,
  ) {}

  /**
   * 创建审批实例
   */
  @CacheEvict({
    pattern: 'approval:instances:*',
  })
  async createInstance(
    userId: string,
    dto: CreateApprovalInstanceDto,
  ): Promise<ApprovalInstanceDetail> {
    // 验证模板是否存在且可用
    const template = await this.prisma.approval_template.findFirst({
      where: {
        id: dto.templateId,
        is_deleted: 0,
        status: 'enabled',
      },
    });

    if (!template) {
      throw new NotFoundException('审批模板不存在或已禁用');
    }

    // 获取申请人信息
    const applicant = await this.prisma.sys_user.findFirst({
      where: {
        id: userId,
        is_deleted: 0,
        status: 1,
      },
      include: {
        dept: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!applicant) {
      throw new NotFoundException('申请人信息不存在');
    }

    // 使用工作流引擎创建实例
    const instanceData = {
      applicantId: userId,
      title: dto.title,
      formData: dto.formData,
      priority: dto.priority || 1,
      platformId: dto.platformId || applicant.platform_id,
      departmentId: dto.departmentId || applicant.dept_id,
    };

    const instance = await this.workflowEngine.createInstance(dto.templateId, instanceData);

    this.logger.log(`Created approval instance: ${instance.id} by user: ${userId}`);

    // 发送实时通知给申请人
    this.realtimeService.emitToUser(userId, 'approval_instance_created', {
      instanceId: instance.id,
      title: dto.title,
      status: instance.status,
    });

    return this.getInstanceDetail(userId, instance.id);
  }

  /**
   * 获取审批实例列表
   */
  @Cacheable({
    prefix: 'approval:instances',
    ttl: 300,
    keyGenerator: (userId: string, query: QueryApprovalInstancesDto) =>
      `${userId}:${query.view || 'all'}:${query.status || 'all'}:${query.page || 1}:${query.pageSize || 20}:${query.keyword || ''}`,
  })
  @QueryOptimize()
  async getInstanceList(
    userId: string,
    query: QueryApprovalInstancesDto,
  ): Promise<{
    data: ApprovalInstanceDetail[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page = 1, pageSize = 20, view = 'all' } = query;
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: Prisma.approval_instancesWhereInput = {
      is_deleted: 0,
    };

    // 根据视图类型过滤
    switch (view) {
      case 'my':
        where.applicant_id = userId;
        break;
      case 'pending':
        // 待我审批：需要查询当前节点的审批人包含当前用户
        where.status = 'pending';
        // 这里需要通过审批记录或模板配置来判断当前用户是否为当前节点的审批人
        // 暂时简化处理，后续可以优化
        break;
      case 'completed':
        // 已审批：查询审批记录中包含当前用户操作的实例
        where.approval_records = {
          some: {
            approver_id: userId,
            action: {
              in: ['approve', 'reject'],
            },
          },
        };
        break;
    }

    // 其他过滤条件
    if (query.status) {
      where.status = query.status;
    }

    if (query.templateId) {
      where.template_id = query.templateId;
    }

    if (query.applicantId) {
      where.applicant_id = query.applicantId;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.platformId) {
      where.platform_id = query.platformId;
    }

    if (query.departmentId) {
      where.department_id = query.departmentId;
    }

    if (query.keyword) {
      where.OR = [
        {
          title: {
            contains: query.keyword,
          },
        },
        {
          template: {
            name: {
              contains: query.keyword,
            },
          },
        },
      ];
    }

    if (query.startDate || query.endDate) {
      where.create_time = {};
      if (query.startDate) {
        where.create_time.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.create_time.lte = new Date(query.endDate);
      }
    }

    // 执行查询
    const [instances, total] = await Promise.all([
      this.prisma.approval_instances.findMany({
        where,
        include: {
          approval_records: {
            orderBy: {
              process_time: 'desc',
            },
          },
          template: {
            select: {
              id: true,
              name: true,
              type: true,
              nodes: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { create_time: 'desc' },
        ],
        skip,
        take: pageSize,
      }),
      this.prisma.approval_instances.count({ where }),
    ]);

    // 获取模板信息和用户信息
    const templateIds = [...new Set(instances.map(i => i.template_id))];
    const userIds = [...new Set([
      ...instances.map(i => i.applicant_id),
      ...instances.flatMap(i => i.approval_records?.map(r => r.approver_id) || []),
    ])];

    const [templates, users] = await Promise.all([
      this.prisma.approval_template.findMany({
        where: {
          id: { in: templateIds },
          is_deleted: 0,
        },
        select: {
          id: true,
          name: true,
          type: true,
          nodes: true,
        },
      }),
      this.prisma.sys_user.findMany({
        where: {
          id: { in: userIds },
          is_deleted: 0,
        },
        select: {
          id: true,
          name: true,
          username: true,
        },
      }),
    ]);

    const templateMap = new Map(templates.map(t => [t.id, t]));
    const userMap = new Map(users.map(u => [u.id, u]));

    // 映射结果
    const data = instances.map(instance => this.mapInstanceToDetail(instance, templateMap, userMap));

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取我的审批列表
   */
  async getMyInstances(
    userId: string,
    query: Omit<QueryApprovalInstancesDto, 'view'>,
  ): Promise<{
    data: ApprovalInstanceDetail[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.getInstanceList(userId, { ...query, view: 'my' });
  }

  /**
   * 获取待我审批列表
   */
  async getPendingInstances(
    userId: string,
    query: Omit<QueryApprovalInstancesDto, 'view'>,
  ): Promise<{
    data: ApprovalInstanceDetail[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    // 需要通过更复杂的查询来获取待当前用户审批的实例
    const { page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    // 首先获取所有待审批的实例
    const pendingInstances = await this.prisma.approval_instances.findMany({
      where: {
        is_deleted: 0,
        status: 'pending',
      },
      include: {
        approval_records: true,
      },
    });

    // 获取模板信息以判断当前节点的审批人
    const templateIds = [...new Set(pendingInstances.map(i => i.template_id))];
    const templates = await this.prisma.approval_template.findMany({
      where: {
        id: { in: templateIds },
        is_deleted: 0,
      },
    });

    const templateMap = new Map(templates.map(t => [t.id, t]));

    // 过滤出当前用户需要审批的实例
    const userPendingInstances: any[] = [];
    for (const instance of pendingInstances) {
      const template = templateMap.get(instance.template_id);
      if (template && instance.current_node_id) {
        const currentNode = (template.nodes as any[])?.find(n => n.id === instance.current_node_id);
        if (currentNode?.approvers?.some((a: any) => a.id === userId)) {
          userPendingInstances.push(instance);
        }
      }
    }

    // 应用其他过滤条件
    let filteredInstances = userPendingInstances;

    if (query.keyword) {
      filteredInstances = filteredInstances.filter(instance =>
        instance.title.includes(query.keyword!) ||
        templateMap.get(instance.template_id)?.name?.includes(query.keyword!)
      );
    }

    if (query.priority) {
      filteredInstances = filteredInstances.filter(instance => instance.priority === query.priority);
    }

    if (query.templateId) {
      filteredInstances = filteredInstances.filter(instance => instance.template_id === query.templateId);
    }

    // 分页
    const total = filteredInstances.length;
    const paginatedInstances = filteredInstances.slice(skip, skip + pageSize);

    // 获取用户信息
    const userIds = [...new Set([
      ...paginatedInstances.map(i => i.applicant_id),
      ...paginatedInstances.flatMap(i => i.approval_records?.map(r => r.approver_id) || []),
    ])];

    const users = await this.prisma.sys_user.findMany({
      where: {
        id: { in: userIds },
        is_deleted: 0,
      },
      select: {
        id: true,
        name: true,
        username: true,
      },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    // 映射结果
    const data = paginatedInstances.map(instance => this.mapInstanceToDetail(instance, templateMap, userMap));

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取已审批列表
   */
  async getCompletedInstances(
    userId: string,
    query: Omit<QueryApprovalInstancesDto, 'view'>,
  ): Promise<{
    data: ApprovalInstanceDetail[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.getInstanceList(userId, { ...query, view: 'completed' });
  }

  /**
   * 获取审批实例详情
   */
  @Cacheable({
    prefix: 'approval:instance-detail',
    ttl: 180,
    keyGenerator: (userId: string, instanceId: string) => `${userId}:${instanceId}`,
  })
  async getInstanceDetail(userId: string, instanceId: string): Promise<ApprovalInstanceDetail> {
    const instance = await this.prisma.approval_instances.findFirst({
      where: {
        id: instanceId,
        is_deleted: 0,
      },
      include: {
        approval_records: {
          orderBy: {
            process_time: 'asc',
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            type: true,
            nodes: true,
            form_fields: true,
          },
        },
      },
    });

    if (!instance) {
      throw new NotFoundException('审批实例不存在');
    }

    // 检查权限：申请人、审批人或管理员可以查看
    const hasPermission = await this.checkInstanceViewPermission(userId, instance);
    if (!hasPermission) {
      throw new ForbiddenException('无权限查看此审批实例');
    }

    // 获取模板信息
    const template = await this.prisma.approval_template.findFirst({
      where: {
        id: instance.template_id,
        is_deleted: 0,
      },
    });

    // 获取用户信息
    const userIds = [
      instance.applicant_id,
      ...instance.approval_records.map(r => r.approver_id),
    ];

    const users = await this.prisma.sys_user.findMany({
      where: {
        id: { in: userIds },
        is_deleted: 0,
      },
      select: {
        id: true,
        name: true,
        username: true,
      },
    });

    const userMap = new Map(users.map(u => [u.id, u]));
    const templateMap = new Map(template ? [[template.id, template]] : []);

    return this.mapInstanceToDetail(instance, templateMap, userMap);
  }

  /**
   * 处理审批操作
   */
  @CacheEvict({
    pattern: 'approval:instances:*',
  })
  async processInstance(
    userId: string,
    instanceId: string,
    dto: ProcessApprovalInstanceDto,
  ): Promise<ApprovalInstanceDetail> {
    // 获取实例信息
    const instance = await this.prisma.approval_instances.findFirst({
      where: {
        id: instanceId,
        is_deleted: 0,
      },
    });

    if (!instance) {
      throw new NotFoundException('审批实例不存在');
    }

    if (instance.status !== 'pending') {
      throw new BadRequestException('该审批实例不在待处理状态');
    }

    // 验证操作权限
    await this.validateProcessPermission(userId, instance, dto.nodeId);

    // 验证必填字段
    if (dto.action === 'transfer' && !dto.transferTo) {
      throw new BadRequestException('转审操作必须指定转审目标用户');
    }

    if (dto.action === 'delegate' && !dto.delegateTo) {
      throw new BadRequestException('委托操作必须指定委托目标用户');
    }

    // 使用工作流引擎处理审批操作
    const action = {
      action: dto.action,
      comment: dto.comment,
      transferTo: dto.transferTo,
      delegateTo: dto.delegateTo,
      attachments: dto.attachments,
    };

    await this.workflowEngine.processNode(instanceId, dto.nodeId, action, userId);

    this.logger.log(`Processed approval instance: ${instanceId} by user: ${userId} with action: ${dto.action}`);

    // 发送实时通知
    this.realtimeService.emitToUser(instance.applicant_id, 'approval_instance_updated', {
      instanceId,
      action: dto.action,
      comment: dto.comment,
    });

    return this.getInstanceDetail(userId, instanceId);
  }

  /**
   * 取消审批申请
   */
  @CacheEvict({
    pattern: 'approval:instances:*',
  })
  async cancelInstance(userId: string, instanceId: string): Promise<ApprovalInstanceDetail> {
    const instance = await this.prisma.approval_instances.findFirst({
      where: {
        id: instanceId,
        is_deleted: 0,
      },
    });

    if (!instance) {
      throw new NotFoundException('审批实例不存在');
    }

    // 只有申请人可以取消
    if (instance.applicant_id !== userId) {
      throw new ForbiddenException('只有申请人可以取消审批申请');
    }

    // 只有待审批状态可以取消
    if (instance.status !== 'pending') {
      throw new BadRequestException('只有待审批状态的申请可以取消');
    }

    // 更新状态
    await this.prisma.approval_instances.update({
      where: { id: instanceId },
      data: {
        status: 'cancelled',
        update_time: new Date(),
      },
    });

    this.logger.log(`Cancelled approval instance: ${instanceId} by user: ${userId}`);

    // 发送实时通知
    this.realtimeService.emitToUser(userId, 'approval_instance_cancelled', {
      instanceId,
    });

    return this.getInstanceDetail(userId, instanceId);
  }

  /**
   * 获取审批统计信息
   */
  @Cacheable({
    prefix: 'approval:instance-stats',
    ttl: 300,
    keyGenerator: (userId: string) => userId,
  })
  async getInstanceStats(userId: string): Promise<ApprovalInstanceStats> {
    const [
      total,
      pending,
      approved,
      rejected,
      cancelled,
      myPending,
      myApproved,
      myRejected,
    ] = await Promise.all([
      // 总数
      this.prisma.approval_instances.count({
        where: {
          applicant_id: userId,
          is_deleted: 0,
        },
      }),
      // 待审批
      this.prisma.approval_instances.count({
        where: {
          applicant_id: userId,
          status: 'pending',
          is_deleted: 0,
        },
      }),
      // 已通过
      this.prisma.approval_instances.count({
        where: {
          applicant_id: userId,
          status: 'approved',
          is_deleted: 0,
        },
      }),
      // 已驳回
      this.prisma.approval_instances.count({
        where: {
          applicant_id: userId,
          status: 'rejected',
          is_deleted: 0,
        },
      }),
      // 已取消
      this.prisma.approval_instances.count({
        where: {
          applicant_id: userId,
          status: 'cancelled',
          is_deleted: 0,
        },
      }),
      // 待我审批（简化查询，实际需要通过模板配置判断）
      this.prisma.approval_instances.count({
        where: {
          status: 'pending',
          is_deleted: 0,
          // 这里需要更复杂的查询逻辑
        },
      }),
      // 我已审批通过
      this.prisma.approval_instances.count({
        where: {
          approval_records: {
            some: {
              approver_id: userId,
              action: 'approve',
            },
          },
          is_deleted: 0,
        },
      }),
      // 我已审批驳回
      this.prisma.approval_instances.count({
        where: {
          approval_records: {
            some: {
              approver_id: userId,
              action: 'reject',
            },
          },
          is_deleted: 0,
        },
      }),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      cancelled,
      myPending,
      myApproved,
      myRejected,
    };
  }

  /**
   * 检查实例查看权限
   */
  private async checkInstanceViewPermission(userId: string, instance: any): Promise<boolean> {
    // 申请人可以查看
    if (instance.applicant_id === userId) {
      return true;
    }

    // 审批人可以查看
    const hasApprovalRecord = instance.approval_records?.some((record: any) => record.approver_id === userId);
    if (hasApprovalRecord) {
      return true;
    }

    // 当前节点的审批人可以查看
    if (instance.current_node_id) {
      const template = await this.prisma.approval_template.findFirst({
        where: {
          id: instance.template_id,
          is_deleted: 0,
        },
      });

      if (template) {
        const currentNode = (template.nodes as any[])?.find(n => n.id === instance.current_node_id);
        if (currentNode?.approvers?.some((a: any) => a.id === userId)) {
          return true;
        }
      }
    }

    // TODO: 检查管理员权限

    return false;
  }

  /**
   * 验证处理权限
   */
  private async validateProcessPermission(userId: string, instance: any, nodeId: string): Promise<void> {
    // 检查是否为当前节点的审批人
    if (instance.current_node_id !== nodeId) {
      throw new BadRequestException('节点ID不匹配当前审批节点');
    }

    const template = await this.prisma.approval_template.findFirst({
      where: {
        id: instance.template_id,
        is_deleted: 0,
      },
    });

    if (!template) {
      throw new NotFoundException('审批模板不存在');
    }

    const currentNode = (template.nodes as any[])?.find(n => n.id === nodeId);
    if (!currentNode) {
      throw new BadRequestException('审批节点不存在');
    }

    const isApprover = currentNode.approvers?.some((a: any) => a.id === userId);
    if (!isApprover) {
      throw new ForbiddenException('您不是当前节点的审批人');
    }
  }

  /**
   * 映射实例数据到详情对象
   */
  private mapInstanceToDetail(
    instance: any,
    templateMap?: Map<string, any>,
    userMap?: Map<string, any>,
  ): ApprovalInstanceDetail {
    // Use the included template if available, otherwise use templateMap
    const template = instance.template || (templateMap && templateMap.get(instance.template_id));
    const applicant = userMap && userMap.get(instance.applicant_id);

    const priorityNames = {
      1: '普通',
      2: '紧急',
      3: '特急',
    };

    let currentNodeName: string | undefined;
    if (instance.current_node_id && template) {
      const currentNode = (template.nodes as any[])?.find(n => n.id === instance.current_node_id);
      currentNodeName = currentNode?.name;
    }

    const approvalRecords: ApprovalRecord[] = instance.approval_records?.map((record: any) => {
      const approver = userMap && userMap.get(record.approver_id);
      let nodeName: string | undefined;
      if (template) {
        const node = (template.nodes as any[])?.find(n => n.id === record.node_id);
        nodeName = node?.name;
      }

      return {
        id: record.id,
        nodeId: record.node_id,
        nodeName,
        approverId: record.approver_id,
        approverName: approver?.name,
        action: record.action,
        comment: record.comment,
        attachments: record.attachments,
        processTime: record.process_time,
      };
    }) || [];

    return {
      id: instance.id,
      templateId: instance.template_id,
      templateName: template?.name,
      applicantId: instance.applicant_id,
      applicantName: applicant?.name,
      title: instance.title,
      formData: instance.form_data,
      currentNodeId: instance.current_node_id,
      currentNodeName,
      status: instance.status,
      priority: instance.priority,
      priorityName: priorityNames[instance.priority as keyof typeof priorityNames] || '普通',
      platformId: instance.platform_id,
      departmentId: instance.department_id,
      createdAt: instance.create_time,
      updatedAt: instance.update_time,
      approvalRecords,
      template: template ? {
        id: template.id,
        name: template.name,
        type: template.type,
        nodes: template.nodes || [],
        formFields: template.form_fields || [],
      } : undefined,
    };
  }
}
