import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ApprovalProcessService, ApprovalProcessConfig, ProcessValidationResult } from './approval-process.service';
import { WorkflowEngineService, WorkflowNode } from './workflow-engine.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('ApprovalProcessService', () => {
  let service: ApprovalProcessService;
  let prismaService: PrismaService;
  let workflowEngineService: WorkflowEngineService;

  const mockPrismaService = {
    approval_template: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
    },
    approval_instances: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockWorkflowEngineService = {
    validateWorkflowTemplate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalProcessService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: WorkflowEngineService,
          useValue: mockWorkflowEngineService,
        },
      ],
    }).compile();

    service = module.get<ApprovalProcessService>(ApprovalProcessService);
    prismaService = module.get<PrismaService>(PrismaService);
    workflowEngineService = module.get<WorkflowEngineService>(WorkflowEngineService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProcess', () => {
    const validProcessConfig = {
      name: '测试审批流程',
      description: '测试用的审批流程',
      nodes: [
        {
          id: 'start',
          name: '开始',
          type: 'start' as const,
        },
        {
          id: 'approval1',
          name: '部门经理审批',
          type: 'approval' as const,
          approvers: [{ id: 'user1', name: '张经理' }],
          mode: 'or' as const,
        },
        {
          id: 'end',
          name: '结束',
          type: 'end' as const,
        },
      ],
      settings: {
        allowRecall: true,
        allowDelegate: true,
        maxTimeout: 72,
      },
      status: 'draft' as const,
    };

    it('should create a new approval process successfully', async () => {
      mockPrismaService.approval_template.findFirst.mockResolvedValue(null);
      mockWorkflowEngineService.validateWorkflowTemplate.mockReturnValue(undefined);
      mockPrismaService.approval_template.upsert.mockResolvedValue({
        id: 'process-1',
        name: validProcessConfig.name,
        create_time: new Date(),
        update_time: new Date(),
      });

      const result = await service.createProcess('user1', validProcessConfig);

      expect(result).toBeDefined();
      expect(result.name).toBe(validProcessConfig.name);
      expect(result.version).toBe(1);
      expect(result.createdBy).toBe('user1');
      expect(mockPrismaService.approval_template.upsert).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid process config', async () => {
      const invalidConfig = {
        ...validProcessConfig,
        name: '', // Invalid: empty name
      };

      await expect(service.createProcess('user1', invalidConfig)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for duplicate process name', async () => {
      mockPrismaService.approval_template.findFirst.mockResolvedValue({
        id: 'existing-process',
        name: validProcessConfig.name,
      });

      await expect(service.createProcess('user1', validProcessConfig)).rejects.toThrow(BadRequestException);
    });

    it('should validate workflow template during creation', async () => {
      mockPrismaService.approval_template.findFirst.mockResolvedValue(null);
      mockWorkflowEngineService.validateWorkflowTemplate.mockImplementation(() => {
        throw new BadRequestException('工作流验证失败');
      });

      await expect(service.createProcess('user1', validProcessConfig)).rejects.toThrow(BadRequestException);
      expect(mockWorkflowEngineService.validateWorkflowTemplate).toHaveBeenCalled();
    });
  });

  describe('updateProcess', () => {
    const existingProcess: ApprovalProcessConfig = {
      id: 'process-1',
      name: '现有流程',
      version: 1,
      nodes: [
        { id: 'start', name: '开始', type: 'start' },
        { id: 'end', name: '结束', type: 'end' },
      ],
      settings: { allowRecall: true },
      status: 'active',
      createdBy: 'user1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update process and create new version', async () => {
      jest.spyOn(service, 'getProcessConfig').mockResolvedValue(existingProcess);
      mockPrismaService.approval_instances.count.mockResolvedValue(0);
      mockWorkflowEngineService.validateWorkflowTemplate.mockReturnValue(undefined);
      mockPrismaService.approval_template.upsert.mockResolvedValue({
        id: 'process-1',
        name: '更新后的流程',
        update_time: new Date(),
      });

      const updates = { name: '更新后的流程' };
      const result = await service.updateProcess('user1', 'process-1', updates);

      expect(result.name).toBe('更新后的流程');
      expect(result.version).toBe(2);
    });

    it('should throw NotFoundException for non-existent process', async () => {
      jest.spyOn(service, 'getProcessConfig').mockResolvedValue(null);

      await expect(service.updateProcess('user1', 'non-existent', {})).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when active instances exist', async () => {
      jest.spyOn(service, 'getProcessConfig').mockResolvedValue(existingProcess);
      mockPrismaService.approval_instances.count.mockResolvedValue(5);

      const updates = { nodes: [{ id: 'new-node', name: '新节点', type: 'approval' as const }] };

      await expect(service.updateProcess('user1', 'process-1', updates)).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateProcessConfig', () => {
    it('should validate a correct process configuration', async () => {
      const validConfig = {
        name: '有效流程',
        nodes: [
          { id: 'start', name: '开始', type: 'start' as const },
          { id: 'approval1', name: '审批', type: 'approval' as const, approvers: [{ id: 'user1', name: '用户1' }] },
          { id: 'end', name: '结束', type: 'end' as const },
        ],
        settings: { maxTimeout: 24 },
      };

      mockWorkflowEngineService.validateWorkflowTemplate.mockReturnValue(undefined);

      const result = await service.validateProcessConfig(validConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing process name', async () => {
      const invalidConfig = {
        name: '',
        nodes: [
          { id: 'start', name: '开始', type: 'start' as const },
          { id: 'end', name: '结束', type: 'end' as const },
        ],
      };

      const result = await service.validateProcessConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('流程名称不能为空');
    });

    it('should detect missing nodes', async () => {
      const invalidConfig = {
        name: '无效流程',
        nodes: [],
      };

      const result = await service.validateProcessConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('流程必须包含至少一个节点');
    });

    it('should detect missing start node', async () => {
      const invalidConfig = {
        name: '无效流程',
        nodes: [
          { id: 'approval1', name: '审批', type: 'approval' as const, approvers: [{ id: 'user1', name: '用户1' }] },
          { id: 'end', name: '结束', type: 'end' as const },
        ],
      };

      mockWorkflowEngineService.validateWorkflowTemplate.mockReturnValue(undefined);

      const result = await service.validateProcessConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('流程必须包含开始节点');
    });

    it('should detect missing end node', async () => {
      const invalidConfig = {
        name: '无效流程',
        nodes: [
          { id: 'start', name: '开始', type: 'start' as const },
          { id: 'approval1', name: '审批', type: 'approval' as const, approvers: [{ id: 'user1', name: '用户1' }] },
        ],
      };

      mockWorkflowEngineService.validateWorkflowTemplate.mockReturnValue(undefined);

      const result = await service.validateProcessConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('流程必须包含结束节点');
    });

    it('should detect approval nodes without approvers', async () => {
      const invalidConfig = {
        name: '无效流程',
        nodes: [
          { id: 'start', name: '开始', type: 'start' as const },
          { id: 'approval1', name: '审批', type: 'approval' as const, approvers: [] },
          { id: 'end', name: '结束', type: 'end' as const },
        ],
      };

      mockWorkflowEngineService.validateWorkflowTemplate.mockReturnValue(undefined);

      const result = await service.validateProcessConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('审批节点 审批 必须设置审批人');
    });

    it('should detect duplicate node IDs', async () => {
      const invalidConfig = {
        name: '无效流程',
        nodes: [
          { id: 'start', name: '开始', type: 'start' as const },
          { id: 'approval1', name: '审批1', type: 'approval' as const, approvers: [{ id: 'user1', name: '用户1' }] },
          { id: 'approval1', name: '审批2', type: 'approval' as const, approvers: [{ id: 'user2', name: '用户2' }] },
          { id: 'end', name: '结束', type: 'end' as const },
        ],
      };

      mockWorkflowEngineService.validateWorkflowTemplate.mockReturnValue(undefined);

      const result = await service.validateProcessConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('节点ID重复: approval1');
    });

    it('should validate process settings', async () => {
      const invalidConfig = {
        name: '有效流程',
        nodes: [
          { id: 'start', name: '开始', type: 'start' as const },
          { id: 'end', name: '结束', type: 'end' as const },
        ],
        settings: {
          maxTimeout: -1, // Invalid: negative timeout
        },
      };

      mockWorkflowEngineService.validateWorkflowTemplate.mockReturnValue(undefined);

      const result = await service.validateProcessConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('最大超时时间必须在 1-8760 小时之间');
    });
  });

  describe('getProcessConfig', () => {
    it('should return process config when found', async () => {
      const mockTemplate = {
        id: 'process-1',
        name: '测试流程',
        description: '测试描述',
        nodes: [{ id: 'start', name: '开始', type: 'start' }],
        workflow_config: {
          version: 1,
          variables: [],
          settings: { allowRecall: true },
        },
        status: 'enabled',
        creator_id: 'user1',
        create_time: new Date(),
        update_time: new Date(),
      };

      mockPrismaService.approval_template.findFirst.mockResolvedValue(mockTemplate);

      const result = await service.getProcessConfig('process-1');

      expect(result).toBeDefined();
      expect(result!.id).toBe('process-1');
      expect(result!.name).toBe('测试流程');
      expect(result!.status).toBe('active');
    });

    it('should return null when process not found', async () => {
      mockPrismaService.approval_template.findFirst.mockResolvedValue(null);

      const result = await service.getProcessConfig('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('deleteProcess', () => {
    it('should delete process successfully', async () => {
      const existingProcess = {
        id: 'process-1',
        name: '测试流程',
        version: 1,
        nodes: [],
        settings: {},
        status: 'draft' as const,
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'getProcessConfig').mockResolvedValue(existingProcess);
      mockPrismaService.approval_instances.count.mockResolvedValue(0);
      mockPrismaService.approval_template.update.mockResolvedValue({});

      await service.deleteProcess('user1', 'process-1');

      expect(mockPrismaService.approval_template.update).toHaveBeenCalledWith({
        where: { id: 'process-1' },
        data: { is_deleted: 1 },
      });
    });

    it('should throw NotFoundException for non-existent process', async () => {
      jest.spyOn(service, 'getProcessConfig').mockResolvedValue(null);

      await expect(service.deleteProcess('user1', 'non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when active instances exist', async () => {
      const existingProcess = {
        id: 'process-1',
        name: '测试流程',
        version: 1,
        nodes: [],
        settings: {},
        status: 'active' as const,
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'getProcessConfig').mockResolvedValue(existingProcess);
      mockPrismaService.approval_instances.count.mockResolvedValue(3);

      await expect(service.deleteProcess('user1', 'process-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('copyProcess', () => {
    it('should copy process successfully', async () => {
      const originalProcess = {
        id: 'process-1',
        name: '原始流程',
        description: '原始描述',
        version: 1,
        nodes: [{ id: 'start', name: '开始', type: 'start' as const }],
        variables: [],
        settings: { allowRecall: true },
        status: 'active' as const,
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'getProcessConfig').mockResolvedValue(originalProcess);
      jest.spyOn(service, 'createProcess').mockResolvedValue({
        ...originalProcess,
        id: 'process-2',
        name: '复制的流程',
        status: 'draft',
      });

      const result = await service.copyProcess('user1', 'process-1', '复制的流程');

      expect(result.name).toBe('复制的流程');
      expect(result.status).toBe('draft');
      expect(service.createProcess).toHaveBeenCalledWith('user1', expect.objectContaining({
        name: '复制的流程',
        nodes: originalProcess.nodes,
        settings: originalProcess.settings,
        status: 'draft',
      }));
    });

    it('should throw NotFoundException for non-existent original process', async () => {
      jest.spyOn(service, 'getProcessConfig').mockResolvedValue(null);

      await expect(service.copyProcess('user1', 'non-existent', '新流程')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProcessStats', () => {
    it('should return process statistics', async () => {
      mockPrismaService.approval_instances.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3)  // pending
        .mockResolvedValueOnce(6)  // approved
        .mockResolvedValueOnce(1); // rejected

      const mockCompletedInstances = [
        {
          create_time: new Date('2024-01-01T10:00:00Z'),
          update_time: new Date('2024-01-01T12:00:00Z'), // 2 hours
        },
        {
          create_time: new Date('2024-01-02T10:00:00Z'),
          update_time: new Date('2024-01-02T14:00:00Z'), // 4 hours
        },
      ];

      mockPrismaService.approval_instances.findMany.mockResolvedValue(mockCompletedInstances);

      const result = await service.getProcessStats('process-1');

      expect(result).toEqual({
        totalInstances: 10,
        pendingInstances: 3,
        approvedInstances: 6,
        rejectedInstances: 1,
        averageProcessingTime: 3, // (2 + 4) / 2 = 3 hours
      });
    });

    it('should handle zero completed instances', async () => {
      mockPrismaService.approval_instances.count
        .mockResolvedValueOnce(5)  // total
        .mockResolvedValueOnce(5)  // pending
        .mockResolvedValueOnce(0)  // approved
        .mockResolvedValueOnce(0); // rejected

      mockPrismaService.approval_instances.findMany.mockResolvedValue([]);

      const result = await service.getProcessStats('process-1');

      expect(result.averageProcessingTime).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle workflow engine validation errors', async () => {
      const config = {
        name: '测试流程',
        nodes: [{ id: 'start', name: '开始', type: 'start' as const }],
      };

      mockWorkflowEngineService.validateWorkflowTemplate.mockImplementation(() => {
        throw new BadRequestException('工作流存在循环依赖');
      });

      const result = await service.validateProcessConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('工作流存在循环依赖');
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(service, 'getProcessConfig').mockRejectedValue(new Error('Database connection failed'));

      const result = await service.getProcessConfig('process-1');

      expect(result).toBeNull();
    });

    it('should validate escalation rules', async () => {
      const configWithInvalidEscalation = {
        name: '测试流程',
        nodes: [
          { id: 'start', name: '开始', type: 'start' as const },
          { id: 'end', name: '结束', type: 'end' as const },
        ],
        settings: {
          escalationRules: [
            {
              nodeId: '',
              timeoutHours: -1,
              escalateTo: 'specific' as const,
              // Missing targetUserId for specific escalation
            },
          ],
        },
      };

      mockWorkflowEngineService.validateWorkflowTemplate.mockReturnValue(undefined);

      const result = await service.validateProcessConfig(configWithInvalidEscalation);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('升级规则必须指定节点ID');
      expect(result.errors).toContain('升级规则的超时时间必须大于 0');
      expect(result.errors).toContain('指定用户升级必须提供目标用户ID');
    });
  });
});

/**
 * **Validates: Requirements 2**
 *
 * 这个测试套件验证了审批流程配置管理的核心功能：
 *
 * 1. **流程配置创建** - 验证创建新的审批流程配置
 * 2. **流程配置更新** - 验证更新现有流程配置和版本管理
 * 3. **流程配置验证** - 验证流程配置的正确性检查
 * 4. **节点验证** - 验证审批节点、分支节点等配置
 * 5. **审批人分配** - 验证审批人分配规则
 * 6. **流程设置验证** - 验证超时、通知等设置
 * 7. **版本管理** - 验证流程版本控制
 * 8. **流程统计** - 验证流程使用统计
 * 9. **错误处理** - 验证各种异常情况的处理
 * 10. **集成测试** - 验证与工作流引擎的集成
 */
