import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WorkflowEngineService, WorkflowNode, WorkflowCondition, ApprovalAction } from './workflow-engine.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../common/services/redis.service';
import { RealtimeService } from '../../../common/services/realtime.service';

describe('WorkflowEngineService', () => {
  let service: WorkflowEngineService;
  let prismaService: any;
  let redisService: any;
  let realtimeService: any;

  const mockTemplate = {
    id: 'template-1',
    name: '测试审批模板',
    status: 'enabled',
    nodes: [
      {
        id: 'start',
        name: '开始',
        type: 'start' as const,
        nextNodes: ['approval-1'],
      },
      {
        id: 'approval-1',
        name: '部门经理审批',
        type: 'approval' as const,
        approvers: [
          { id: 'user-1', name: '张经理' },
        ],
        mode: 'or' as const,
        timeout: 24,
        nextNodes: ['approval-2'],
      },
      {
        id: 'approval-2',
        name: '总经理审批',
        type: 'approval' as const,
        approvers: [
          { id: 'user-2', name: '李总' },
        ],
        mode: 'or' as const,
        timeout: 48,
        conditions: [
          { field: 'amount', operator: '>' as const, value: 10000 },
        ],
        nextNodes: ['end'],
      },
      {
        id: 'end',
        name: '结束',
        type: 'end' as const,
      },
    ],
    workflow_config: {
      variables: [
        { name: 'amount', type: 'number', defaultValue: 0 },
      ],
      settings: {
        allowRecall: true,
        allowDelegate: true,
        maxTimeout: 168,
      },
    },
  };

  const mockInstance = {
    id: 'instance-1',
    template_id: 'template-1',
    applicant_id: 'user-3',
    title: '测试审批申请',
    form_data: { amount: 15000, reason: '采购设备' },
    current_node_id: 'approval-1',
    status: 'pending',
    priority: 1,
    platform_id: 'platform-1',
    department_id: 'dept-1',
    create_time: new Date(),
    update_time: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      approval_template: {
        findUnique: jest.fn(),
      },
      approval_instances: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      approval_records: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      sys_user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const mockRealtimeService = {
      emitToUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowEngineService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: RealtimeService, useValue: mockRealtimeService },
      ],
    }).compile();

    service = module.get<WorkflowEngineService>(WorkflowEngineService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
    realtimeService = module.get(RealtimeService);
  });

  describe('createInstance', () => {
    it('should create approval instance successfully', async () => {
      // Arrange
      prismaService.approval_template.findUnique.mockResolvedValue(mockTemplate);
      prismaService.approval_instances.create.mockResolvedValue(mockInstance);
      redisService.set.mockResolvedValue('OK');

      const createData = {
        applicantId: 'user-3',
        title: '测试审批申请',
        formData: { amount: 15000, reason: '采购设备' },
        priority: 1,
        platformId: 'platform-1',
        departmentId: 'dept-1',
      };

      // Act
      const result = await service.createInstance('template-1', createData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('instance-1');
      expect(result.templateId).toBe('template-1');
      expect(result.status).toBe('pending');
      expect(prismaService.approval_instances.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          template_id: 'template-1',
          applicant_id: 'user-3',
          title: '测试审批申请',
          current_node_id: 'approval-1',
          status: 'pending',
        }),
      });
      expect(realtimeService.emitToUser).toHaveBeenCalledWith(
        'user-1',
        'approval_notification',
        expect.objectContaining({
          instanceId: 'instance-1',
          type: 'new_task',
        })
      );
    });

    it('should throw error when template not found', async () => {
      // Arrange
      prismaService.approval_template.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createInstance('invalid-template', {})
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when template is disabled', async () => {
      // Arrange
      const disabledTemplate = { ...mockTemplate, status: 'disabled' };
      prismaService.approval_template.findUnique.mockResolvedValue(disabledTemplate);

      // Act & Assert
      await expect(
        service.createInstance('template-1', {})
      ).rejects.toThrow('审批模板已禁用');
    });

    it('should throw error when no approval nodes exist', async () => {
      // Arrange
      const templateWithoutApproval = {
        ...mockTemplate,
        nodes: [
          { id: 'start', name: '开始', type: 'start' },
          { id: 'end', name: '结束', type: 'end' },
        ],
      };
      prismaService.approval_template.findUnique.mockResolvedValue(templateWithoutApproval);

      // Act & Assert
      await expect(
        service.createInstance('template-1', {})
      ).rejects.toThrow('审批模板未配置有效的审批节点');
    });
  });

  describe('processNode', () => {
    beforeEach(() => {
      prismaService.approval_instances.findUnique.mockResolvedValue(mockInstance);
      prismaService.approval_template.findUnique.mockResolvedValue(mockTemplate);
      redisService.get.mockResolvedValue(null); // No cached state
      prismaService.approval_records.findMany.mockResolvedValue([]);
      prismaService.approval_records.create.mockResolvedValue({});
    });

    it('should process approve action successfully', async () => {
      // Arrange
      const action: ApprovalAction = {
        action: 'approve',
        comment: '同意申请',
      };

      // Act
      await service.processNode('instance-1', 'approval-1', action, 'user-1');

      // Assert
      expect(prismaService.approval_records.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          instance_id: 'instance-1',
          node_id: 'approval-1',
          approver_id: 'user-1',
          action: 'approve',
          comment: '同意申请',
        }),
      });
    });

    it('should process reject action successfully', async () => {
      // Arrange
      const action: ApprovalAction = {
        action: 'reject',
        comment: '不符合要求',
      };

      // Act
      await service.processNode('instance-1', 'approval-1', action, 'user-1');

      // Assert
      expect(prismaService.approval_records.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'reject',
          comment: '不符合要求',
        }),
      });
      expect(prismaService.approval_instances.update).toHaveBeenCalledWith({
        where: { id: 'instance-1' },
        data: expect.objectContaining({
          status: 'rejected',
        }),
      });
    });

    it('should process transfer action successfully', async () => {
      // Arrange
      const action: ApprovalAction = {
        action: 'transfer',
        transferTo: 'user-4',
        comment: '转给其他人处理',
      };

      prismaService.sys_user.findUnique.mockResolvedValue({
        id: 'user-4',
        name: '王经理',
      });

      // Act
      await service.processNode('instance-1', 'approval-1', action, 'user-1');

      // Assert
      expect(prismaService.sys_user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-4' },
      });
      expect(realtimeService.emitToUser).toHaveBeenCalledWith(
        'user-4',
        'approval_notification',
        expect.objectContaining({
          type: 'transferred',
        })
      );
    });

    it('should throw error when instance not found', async () => {
      // Arrange
      prismaService.approval_instances.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.processNode('invalid-instance', 'approval-1', { action: 'approve' }, 'user-1')
      ).rejects.toThrow('审批实例不存在');
    });

    it('should throw error when instance not in pending status', async () => {
      // Arrange
      const completedInstance = { ...mockInstance, status: 'approved' };
      prismaService.approval_instances.findUnique.mockResolvedValue(completedInstance);

      // Act & Assert
      await expect(
        service.processNode('instance-1', 'approval-1', { action: 'approve' }, 'user-1')
      ).rejects.toThrow('审批实例不在待处理状态');
    });

    it('should throw error when node mismatch', async () => {
      // Act & Assert
      await expect(
        service.processNode('instance-1', 'wrong-node', { action: 'approve' }, 'user-1')
      ).rejects.toThrow('当前节点不匹配');
    });
  });

  describe('checkConditions', () => {
    beforeEach(() => {
      prismaService.approval_instances.findUnique.mockResolvedValue(mockInstance);
      redisService.get.mockResolvedValue(null);
    });

    it('should return true when no conditions', async () => {
      // Act
      const result = await service.checkConditions('instance-1', []);

      // Assert
      expect(result).toBe(true);
    });

    it('should evaluate numeric conditions correctly', async () => {
      // Arrange
      const conditions: WorkflowCondition[] = [
        { field: 'amount', operator: '>', value: 10000 },
      ];

      // Act
      const result = await service.checkConditions('instance-1', conditions);

      // Assert
      expect(result).toBe(true); // 15000 > 10000
    });

    it('should evaluate string conditions correctly', async () => {
      // Arrange
      const instanceWithStringData = {
        ...mockInstance,
        form_data: { status: 'urgent', reason: '紧急采购' },
      };
      prismaService.approval_instances.findUnique.mockResolvedValue(instanceWithStringData);

      const conditions: WorkflowCondition[] = [
        { field: 'status', operator: '==', value: 'urgent' },
        { field: 'reason', operator: 'contains', value: '紧急' },
      ];

      // Act
      const result = await service.checkConditions('instance-1', conditions);

      // Assert
      expect(result).toBe(true);
    });

    it('should handle logical operators correctly', async () => {
      // Arrange
      const conditions: WorkflowCondition[] = [
        { field: 'amount', operator: '>', value: 20000 }, // false
        { field: 'amount', operator: '>', value: 5000, logicalOperator: 'or' }, // true
      ];

      // Act
      const result = await service.checkConditions('instance-1', conditions);

      // Assert
      expect(result).toBe(true); // false OR true = true
    });
  });

  describe('handleTimeout', () => {
    beforeEach(() => {
      prismaService.approval_instances.findUnique.mockResolvedValue(mockInstance);
      prismaService.approval_template.findUnique.mockResolvedValue(mockTemplate);
      redisService.get.mockResolvedValue(null);
      prismaService.approval_records.findMany.mockResolvedValue([]);
      prismaService.approval_records.create.mockResolvedValue({});
    });

    it('should handle timeout correctly', async () => {
      // Act
      await service.handleTimeout('instance-1', 'approval-1');

      // Assert
      expect(prismaService.approval_records.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          instance_id: 'instance-1',
          node_id: 'approval-1',
          approver_id: 'system',
          action: 'timeout',
          comment: '审批超时',
        }),
      });
      expect(realtimeService.emitToUser).toHaveBeenCalledWith(
        'user-1',
        'approval_notification',
        expect.objectContaining({
          type: 'timeout_reminder',
        })
      );
    });

    it('should not process timeout for completed instance', async () => {
      // Arrange
      const completedInstance = { ...mockInstance, status: 'approved' };
      prismaService.approval_instances.findUnique.mockResolvedValue(completedInstance);

      // Act
      await service.handleTimeout('instance-1', 'approval-1');

      // Assert
      expect(prismaService.approval_records.create).not.toHaveBeenCalled();
    });

    it('should handle auto-approve on timeout', async () => {
      // Arrange
      const templateWithAutoApprove = {
        ...mockTemplate,
        nodes: mockTemplate.nodes.map(node =>
          node.id === 'approval-1'
            ? { ...node, autoApprove: true }
            : node
        ),
      };
      prismaService.approval_template.findUnique.mockResolvedValue(templateWithAutoApprove);

      // Act
      await service.handleTimeout('instance-1', 'approval-1');

      // Assert
      expect(prismaService.approval_records.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'approve',
          comment: '超时自动审批',
          approver_id: 'system',
        }),
      });
    });
  });

  describe('validateWorkflowTemplate', () => {
    it('should validate template successfully', () => {
      // Act & Assert
      expect(() => service.validateWorkflowTemplate({
        id: 'template-1',
        name: '测试模板',
        version: 1,
        nodes: mockTemplate.nodes,
      })).not.toThrow();
    });

    it('should throw error when no nodes', () => {
      // Act & Assert
      expect(() => service.validateWorkflowTemplate({
        id: 'template-1',
        name: '测试模板',
        version: 1,
        nodes: [],
      })).toThrow('工作流模板必须包含至少一个节点');
    });

    it('should throw error when no start node', () => {
      // Act & Assert
      expect(() => service.validateWorkflowTemplate({
        id: 'template-1',
        name: '测试模板',
        version: 1,
        nodes: [
          { id: 'approval-1', name: '审批', type: 'approval' },
          { id: 'end', name: '结束', type: 'end' },
        ],
      })).toThrow('工作流模板必须包含开始节点');
    });

    it('should throw error when multiple start nodes', () => {
      // Act & Assert
      expect(() => service.validateWorkflowTemplate({
        id: 'template-1',
        name: '测试模板',
        version: 1,
        nodes: [
          { id: 'start-1', name: '开始1', type: 'start' },
          { id: 'start-2', name: '开始2', type: 'start' },
          { id: 'end', name: '结束', type: 'end' },
        ],
      })).toThrow('工作流模板只能包含一个开始节点');
    });

    it('should throw error when no end node', () => {
      // Act & Assert
      expect(() => service.validateWorkflowTemplate({
        id: 'template-1',
        name: '测试模板',
        version: 1,
        nodes: [
          { id: 'start', name: '开始', type: 'start' },
          { id: 'approval-1', name: '审批', type: 'approval' },
        ],
      })).toThrow('工作流模板必须包含结束节点');
    });

    it('should throw error when duplicate node IDs', () => {
      // Act & Assert
      expect(() => service.validateWorkflowTemplate({
        id: 'template-1',
        name: '测试模板',
        version: 1,
        nodes: [
          { id: 'start', name: '开始', type: 'start' },
          { id: 'approval-1', name: '审批1', type: 'approval' },
          { id: 'approval-1', name: '审批2', type: 'approval' },
          { id: 'end', name: '结束', type: 'end' },
        ],
      })).toThrow('工作流节点ID重复: approval-1');
    });

    it('should throw error when invalid node reference', () => {
      // Act & Assert
      expect(() => service.validateWorkflowTemplate({
        id: 'template-1',
        name: '测试模板',
        version: 1,
        nodes: [
          { id: 'start', name: '开始', type: 'start', nextNodes: ['invalid-node'] },
          { id: 'end', name: '结束', type: 'end' },
        ],
      })).toThrow('节点 start 引用了不存在的下一个节点: invalid-node');
    });

    it('should throw error when circular dependency exists', () => {
      // Act & Assert
      expect(() => service.validateWorkflowTemplate({
        id: 'template-1',
        name: '测试模板',
        version: 1,
        nodes: [
          { id: 'start', name: '开始', type: 'start', nextNodes: ['approval-1'] },
          { id: 'approval-1', name: '审批1', type: 'approval', nextNodes: ['approval-2'] },
          { id: 'approval-2', name: '审批2', type: 'approval', nextNodes: ['approval-1'] }, // 循环
          { id: 'end', name: '结束', type: 'end' },
        ],
      })).toThrow('工作流存在循环依赖');
    });
  });

  describe('getNextNodes', () => {
    beforeEach(() => {
      prismaService.approval_instances.findUnique.mockResolvedValue(mockInstance);
      prismaService.approval_template.findUnique.mockResolvedValue(mockTemplate);
    });

    it('should return next approval nodes', async () => {
      // Act
      const result = await service.getNextNodes('instance-1', 'approval-1');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('approval-2');
      expect(result[0].type).toBe('approval');
    });

    it('should return empty array when at end', async () => {
      // Arrange
      const instanceAtEnd = { ...mockInstance, current_node_id: 'end' };
      prismaService.approval_instances.findUnique.mockResolvedValue(instanceAtEnd);

      // Act
      const result = await service.getNextNodes('instance-1', 'end');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should skip nodes based on conditions', async () => {
      // Arrange
      const instanceWithLowAmount = {
        ...mockInstance,
        form_data: { amount: 5000 }, // 不满足 > 10000 的条件
      };
      prismaService.approval_instances.findUnique.mockResolvedValue(instanceWithLowAmount);

      // Act
      const result = await service.getNextNodes('instance-1', 'approval-1');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('end'); // 跳过 approval-2，直接到结束
    });
  });

  describe('workflow state management', () => {
    it('should save and retrieve workflow state', async () => {
      // Arrange
      const workflowState = {
        instanceId: 'instance-1',
        currentNodeId: 'approval-1',
        nodeStates: new Map([
          ['approval-1', {
            nodeId: 'approval-1',
            status: 'pending',
            approvers: [{ id: 'user-1', name: '张经理', status: 'pending' }],
            startedAt: new Date(),
          }],
        ]),
        variables: new Map([['amount', 15000]]),
        history: [],
      };

      redisService.set.mockResolvedValue('OK');
      redisService.get.mockResolvedValue(JSON.stringify({
        ...workflowState,
        nodeStates: Object.fromEntries(workflowState.nodeStates),
        variables: Object.fromEntries(workflowState.variables),
      }));

      // Act
      await service.saveWorkflowState(workflowState);
      const retrievedState = await service.getWorkflowState('instance-1');

      // Assert
      expect(redisService.set).toHaveBeenCalledWith(
        'workflow:state:instance-1',
        expect.any(String),
        86400 // 24 hours
      );
      expect(retrievedState.instanceId).toBe('instance-1');
      expect(retrievedState.currentNodeId).toBe('approval-1');
      expect(retrievedState.nodeStates.size).toBe(1);
      expect(retrievedState.variables.size).toBe(1);
    });
  });
});
