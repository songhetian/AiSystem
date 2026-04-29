import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { WorkflowEngineService } from './workflow-engine.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../common/services/redis.service';
import { RealtimeService } from '../../../common/services/realtime.service';

describe('WorkflowEngineService Integration Tests', () => {
  let app: INestApplication;
  let service: WorkflowEngineService;
  let prismaService: PrismaService;
  let redisService: RedisService;

  const testTemplate = {
    id: 'test-template-integration',
    name: '集成测试审批模板',
    type: 'purchase',
    platform_id: 'platform-1',
    platform_name: '测试平台',
    dept_id: 'dept-1',
    department_name: '测试部门',
    status: 'enabled',
    description: '用于集成测试的审批模板',
    nodes: [
      {
        id: 'start',
        name: '开始',
        type: 'start',
        nextNodes: ['approval-1'],
      },
      {
        id: 'approval-1',
        name: '部门经理审批',
        type: 'approval',
        approvers: [
          { id: 'manager-1', name: '部门经理' },
        ],
        mode: 'or',
        timeout: 24,
        nextNodes: ['branch-1'],
      },
      {
        id: 'branch-1',
        name: '金额分支',
        type: 'branch',
        conditions: [
          { field: 'amount', operator: '>', value: 10000 },
        ],
        nextNodes: ['approval-2', 'end'],
      },
      {
        id: 'approval-2',
        name: '总经理审批',
        type: 'approval',
        approvers: [
          { id: 'ceo-1', name: '总经理' },
        ],
        mode: 'or',
        timeout: 48,
        nextNodes: ['end'],
      },
      {
        id: 'end',
        name: '结束',
        type: 'end',
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
    is_deleted: 0,
    create_time: new Date(),
    update_time: new Date(),
  };

  const testUsers = [
    {
      id: 'applicant-1',
      name: '申请人',
      username: 'applicant',
      status: 1,
      is_deleted: 0,
    },
    {
      id: 'manager-1',
      name: '部门经理',
      username: 'manager',
      status: 1,
      is_deleted: 0,
    },
    {
      id: 'ceo-1',
      name: '总经理',
      username: 'ceo',
      status: 1,
      is_deleted: 0,
    },
  ];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowEngineService,
        {
          provide: PrismaService,
          useValue: {
            approval_template: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            approval_instances: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
            },
            approval_records: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
            sys_user: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: RealtimeService,
          useValue: {
            emitToUser: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    service = moduleFixture.get<WorkflowEngineService>(WorkflowEngineService);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    redisService = moduleFixture.get<RedisService>(RedisService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Workflow Execution', () => {
    it('should execute a complete approval workflow with low amount (skip CEO approval)', async () => {
      // Setup
      const instanceId = 'integration-test-instance-1';
      const lowAmountData = {
        applicantId: 'applicant-1',
        title: '低金额采购申请',
        formData: { amount: 5000, item: '办公用品' },
        priority: 1,
        platformId: 'platform-1',
        departmentId: 'dept-1',
      };

      // Mock database responses
      (prismaService.approval_template.findUnique as jest.Mock).mockResolvedValue(testTemplate);
      (prismaService.approval_instances.create as jest.Mock).mockResolvedValue({
        id: instanceId,
        template_id: testTemplate.id,
        applicant_id: lowAmountData.applicantId,
        title: lowAmountData.title,
        form_data: lowAmountData.formData,
        current_node_id: 'approval-1',
        status: 'pending',
        priority: 1,
        platform_id: 'platform-1',
        department_id: 'dept-1',
        create_time: new Date(),
        update_time: new Date(),
      });

      (prismaService.approval_instances.findUnique as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === instanceId) {
          return Promise.resolve({
            id: instanceId,
            template_id: testTemplate.id,
            applicant_id: lowAmountData.applicantId,
            title: lowAmountData.title,
            form_data: lowAmountData.formData,
            current_node_id: 'approval-1',
            status: 'pending',
            priority: 1,
            platform_id: 'platform-1',
            department_id: 'dept-1',
          });
        }
        return Promise.resolve(null);
      });

      (prismaService.approval_records.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.approval_records.create as jest.Mock).mockResolvedValue({});
      (prismaService.approval_instances.update as jest.Mock).mockResolvedValue({});
      (redisService.get as jest.Mock).mockResolvedValue(null);
      (redisService.set as jest.Mock).mockResolvedValue('OK');

      // Step 1: Create instance
      const instance = await service.createInstance(testTemplate.id, lowAmountData);

      expect(instance).toBeDefined();
      expect(instance.status).toBe('pending');
      expect(instance.currentNodeId).toBe('approval-1');

      // Step 2: Manager approves (should skip CEO approval due to low amount)
      await service.processNode(instanceId, 'approval-1', {
        action: 'approve',
        comment: '同意采购',
      }, 'manager-1');

      // Verify the workflow completed (skipped CEO approval)
      expect(prismaService.approval_instances.update).toHaveBeenCalledWith({
        where: { id: instanceId },
        data: expect.objectContaining({
          status: 'approved',
          current_node_id: null,
        }),
      });
    });

    it('should execute a complete approval workflow with high amount (require CEO approval)', async () => {
      // Setup
      const instanceId = 'integration-test-instance-2';
      const highAmountData = {
        applicantId: 'applicant-1',
        title: '高金额采购申请',
        formData: { amount: 50000, item: '服务器设备' },
        priority: 2,
        platformId: 'platform-1',
        departmentId: 'dept-1',
      };

      // Mock database responses for high amount scenario
      (prismaService.approval_template.findUnique as jest.Mock).mockResolvedValue(testTemplate);
      (prismaService.approval_instances.create as jest.Mock).mockResolvedValue({
        id: instanceId,
        template_id: testTemplate.id,
        applicant_id: highAmountData.applicantId,
        title: highAmountData.title,
        form_data: highAmountData.formData,
        current_node_id: 'approval-1',
        status: 'pending',
        priority: 2,
        platform_id: 'platform-1',
        department_id: 'dept-1',
        create_time: new Date(),
        update_time: new Date(),
      });

      let currentNodeId = 'approval-1';
      let currentStatus = 'pending';

      (prismaService.approval_instances.findUnique as jest.Mock).mockImplementation(() => {
        return Promise.resolve({
          id: instanceId,
          template_id: testTemplate.id,
          applicant_id: highAmountData.applicantId,
          title: highAmountData.title,
          form_data: highAmountData.formData,
          current_node_id: currentNodeId,
          status: currentStatus,
          priority: 2,
          platform_id: 'platform-1',
          department_id: 'dept-1',
        });
      });

      (prismaService.approval_instances.update as jest.Mock).mockImplementation(({ data }) => {
        if (data.current_node_id !== undefined) {
          currentNodeId = data.current_node_id;
        }
        if (data.status !== undefined) {
          currentStatus = data.status;
        }
        return Promise.resolve({});
      });

      // Step 1: Create instance
      const instance = await service.createInstance(testTemplate.id, highAmountData);
      expect(instance.currentNodeId).toBe('approval-1');

      // Step 2: Manager approves (should advance to CEO approval due to high amount)
      await service.processNode(instanceId, 'approval-1', {
        action: 'approve',
        comment: '同意采购，转总经理审批',
      }, 'manager-1');

      // Verify advanced to CEO approval
      expect(prismaService.approval_instances.update).toHaveBeenCalledWith({
        where: { id: instanceId },
        data: expect.objectContaining({
          current_node_id: 'approval-2',
        }),
      });

      // Step 3: CEO approves (should complete the workflow)
      currentNodeId = 'approval-2'; // Simulate the update
      await service.processNode(instanceId, 'approval-2', {
        action: 'approve',
        comment: '最终批准',
      }, 'ceo-1');

      // Verify the workflow completed
      expect(prismaService.approval_instances.update).toHaveBeenCalledWith({
        where: { id: instanceId },
        data: expect.objectContaining({
          status: 'approved',
          current_node_id: null,
        }),
      });
    });

    it('should handle rejection at any stage', async () => {
      // Setup
      const instanceId = 'integration-test-instance-3';
      const rejectionData = {
        applicantId: 'applicant-1',
        title: '被驳回的申请',
        formData: { amount: 30000, item: '不合规设备' },
        priority: 1,
        platformId: 'platform-1',
        departmentId: 'dept-1',
      };

      // Mock database responses
      (prismaService.approval_template.findUnique as jest.Mock).mockResolvedValue(testTemplate);
      (prismaService.approval_instances.create as jest.Mock).mockResolvedValue({
        id: instanceId,
        template_id: testTemplate.id,
        applicant_id: rejectionData.applicantId,
        title: rejectionData.title,
        form_data: rejectionData.formData,
        current_node_id: 'approval-1',
        status: 'pending',
      });

      (prismaService.approval_instances.findUnique as jest.Mock).mockResolvedValue({
        id: instanceId,
        template_id: testTemplate.id,
        applicant_id: rejectionData.applicantId,
        title: rejectionData.title,
        form_data: rejectionData.formData,
        current_node_id: 'approval-1',
        status: 'pending',
      });

      // Step 1: Create instance
      const instance = await service.createInstance(testTemplate.id, rejectionData);
      expect(instance.status).toBe('pending');

      // Step 2: Manager rejects
      await service.processNode(instanceId, 'approval-1', {
        action: 'reject',
        comment: '不符合采购规范',
      }, 'manager-1');

      // Verify the workflow was rejected
      expect(prismaService.approval_instances.update).toHaveBeenCalledWith({
        where: { id: instanceId },
        data: expect.objectContaining({
          status: 'rejected',
          current_node_id: null,
        }),
      });
    });

    it('should handle transfer operation', async () => {
      // Setup
      const instanceId = 'integration-test-instance-4';
      const transferData = {
        applicantId: 'applicant-1',
        title: '需要转审的申请',
        formData: { amount: 15000, item: '特殊设备' },
        priority: 1,
        platformId: 'platform-1',
        departmentId: 'dept-1',
      };

      // Mock database responses
      (prismaService.approval_template.findUnique as jest.Mock).mockResolvedValue(testTemplate);
      (prismaService.approval_instances.create as jest.Mock).mockResolvedValue({
        id: instanceId,
        template_id: testTemplate.id,
        applicant_id: transferData.applicantId,
        title: transferData.title,
        form_data: transferData.formData,
        current_node_id: 'approval-1',
        status: 'pending',
      });

      (prismaService.approval_instances.findUnique as jest.Mock).mockResolvedValue({
        id: instanceId,
        template_id: testTemplate.id,
        applicant_id: transferData.applicantId,
        title: transferData.title,
        form_data: transferData.formData,
        current_node_id: 'approval-1',
        status: 'pending',
      });

      (prismaService.sys_user.findUnique as jest.Mock).mockResolvedValue({
        id: 'manager-2',
        name: '其他经理',
      });

      // Step 1: Create instance
      const instance = await service.createInstance(testTemplate.id, transferData);

      // Step 2: Manager transfers to another manager
      await service.processNode(instanceId, 'approval-1', {
        action: 'transfer',
        transferTo: 'manager-2',
        comment: '转给专业经理处理',
      }, 'manager-1');

      // Verify transfer was recorded
      expect(prismaService.approval_records.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'transfer',
          comment: '转给专业经理处理',
        }),
      });

      expect(prismaService.sys_user.findUnique).toHaveBeenCalledWith({
        where: { id: 'manager-2' },
      });
    });
  });

  describe('Timeout Handling', () => {
    it('should handle timeout with auto-approve', async () => {
      // Setup template with auto-approve on timeout
      const autoApproveTemplate = {
        ...testTemplate,
        nodes: testTemplate.nodes.map(node =>
          node.id === 'approval-1'
            ? { ...node, autoApprove: true }
            : node
        ),
      };

      const instanceId = 'timeout-test-instance';

      (prismaService.approval_template.findUnique as jest.Mock).mockResolvedValue(autoApproveTemplate);
      (prismaService.approval_instances.findUnique as jest.Mock).mockResolvedValue({
        id: instanceId,
        template_id: autoApproveTemplate.id,
        applicant_id: 'applicant-1',
        current_node_id: 'approval-1',
        status: 'pending',
        form_data: { amount: 5000 },
      });

      (redisService.get as jest.Mock).mockResolvedValue(null);
      (prismaService.approval_records.findMany as jest.Mock).mockResolvedValue([]);

      // Handle timeout
      await service.handleTimeout(instanceId, 'approval-1');

      // Verify auto-approve was triggered
      expect(prismaService.approval_records.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'approve',
          comment: '超时自动审批',
          approver_id: 'system',
        }),
      });
    });

    it('should handle timeout with escalation', async () => {
      const instanceId = 'escalation-test-instance';

      (prismaService.approval_template.findUnique as jest.Mock).mockResolvedValue(testTemplate);
      (prismaService.approval_instances.findUnique as jest.Mock).mockResolvedValue({
        id: instanceId,
        template_id: testTemplate.id,
        applicant_id: 'applicant-1',
        current_node_id: 'approval-1',
        status: 'pending',
        form_data: { amount: 5000 },
      });

      (prismaService.sys_user.findMany as jest.Mock).mockResolvedValue([
        { id: 'admin-1', name: '系统管理员' },
      ]);

      (redisService.get as jest.Mock).mockResolvedValue(null);
      (prismaService.approval_records.findMany as jest.Mock).mockResolvedValue([]);

      // Handle timeout
      await service.handleTimeout(instanceId, 'approval-1');

      // Verify timeout was recorded
      expect(prismaService.approval_records.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'timeout',
          comment: '审批超时',
          approver_id: 'system',
        }),
      });
    });
  });

  describe('Condition Evaluation', () => {
    it('should evaluate complex conditions correctly', async () => {
      const instanceId = 'condition-test-instance';

      (prismaService.approval_instances.findUnique as jest.Mock).mockResolvedValue({
        id: instanceId,
        form_data: {
          amount: 15000,
          category: 'equipment',
          urgent: true,
          department: 'IT',
        },
      });

      (redisService.get as jest.Mock).mockResolvedValue(null);

      // Test multiple conditions with different operators
      const conditions = [
        { field: 'amount', operator: '>', value: 10000 }, // true
        { field: 'category', operator: '==', value: 'equipment', logicalOperator: 'and' }, // true
        { field: 'urgent', operator: '==', value: true, logicalOperator: 'and' }, // true
        { field: 'department', operator: 'in', value: ['IT', 'Finance'], logicalOperator: 'and' }, // true
      ];

      const result = await service.checkConditions(instanceId, conditions);
      expect(result).toBe(true);

      // Test with failing condition
      const failingConditions = [
        { field: 'amount', operator: '>', value: 20000 }, // false
        { field: 'category', operator: '==', value: 'equipment', logicalOperator: 'and' }, // true
      ];

      const failingResult = await service.checkConditions(instanceId, failingConditions);
      expect(failingResult).toBe(false);
    });
  });

  describe('Workflow State Management', () => {
    it('should maintain workflow state consistency across operations', async () => {
      const instanceId = 'state-test-instance';

      // Mock Redis to simulate state persistence
      let savedState: any = null;
      (redisService.set as jest.Mock).mockImplementation((key, value) => {
        if (key === `workflow:state:${instanceId}`) {
          savedState = JSON.parse(value);
        }
        return Promise.resolve('OK');
      });

      (redisService.get as jest.Mock).mockImplementation((key) => {
        if (key === `workflow:state:${instanceId}` && savedState) {
          return Promise.resolve(JSON.stringify(savedState));
        }
        return Promise.resolve(null);
      });

      (prismaService.approval_template.findUnique as jest.Mock).mockResolvedValue(testTemplate);
      (prismaService.approval_instances.create as jest.Mock).mockResolvedValue({
        id: instanceId,
        template_id: testTemplate.id,
        applicant_id: 'applicant-1',
        current_node_id: 'approval-1',
        status: 'pending',
        form_data: { amount: 15000 },
      });

      // Create instance and verify state is saved
      await service.createInstance(testTemplate.id, {
        applicantId: 'applicant-1',
        title: '状态测试申请',
        formData: { amount: 15000 },
      });

      expect(redisService.set).toHaveBeenCalledWith(
        `workflow:state:${instanceId}`,
        expect.any(String),
        86400
      );

      // Verify state can be retrieved
      const workflowState = await service.getWorkflowState(instanceId);
      expect(workflowState.instanceId).toBe(instanceId);
      expect(workflowState.currentNodeId).toBe('approval-1');
      expect(workflowState.nodeStates.size).toBeGreaterThan(0);
    });
  });
});
