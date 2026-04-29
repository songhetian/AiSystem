import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ApprovalTemplateService } from './approval-template.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { SaveApprovalTemplateDto } from '../dto/save-approval-template.dto';
import { QueryApprovalTemplatesDto } from '../dto/query-approval-templates.dto';

describe('ApprovalTemplateService', () => {
  let service: ApprovalTemplateService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockTemplate = {
    id: 'template-1',
    name: '测试模板',
    type: 'reimbursement',
    platform_id: 'platform-1',
    platform_name: '测试平台',
    dept_id: 'dept-1',
    department_name: '测试部门',
    status: 'enabled',
    description: '测试描述',
    updated_at: '2024-01-01T00:00:00.000Z',
    create_time: new Date('2024-01-01T00:00:00.000Z'),
    update_time: new Date('2024-01-01T00:00:00.000Z'),
    nodes: [
      { id: 'start', name: '开始', type: 'start' },
      { id: 'approval-1', name: '审批', type: 'approval', approvers: [{ id: 'user-1', name: '审批人' }] },
      { id: 'end', name: '结束', type: 'end' },
    ],
    form_fields: [
      { id: 'amount', type: 'number', label: '金额', required: true },
    ],
    workflow_config: { version: '1.0' },
    creator_id: 'user-1',
    is_deleted: 0,
  };

  const mockTemplateDelegate = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };

  const mockInstanceDelegate = {
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalTemplateService,
        {
          provide: PrismaService,
          useValue: {
            approval_template: mockTemplateDelegate,
            approval_instances: mockInstanceDelegate,
          },
        },
      ],
    }).compile();

    service = module.get<ApprovalTemplateService>(ApprovalTemplateService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listTemplates', () => {
    it('should return paginated template list', async () => {
      const query: QueryApprovalTemplatesDto = { page: 1, pageSize: 10 };
      mockTemplateDelegate.findMany.mockResolvedValue([mockTemplate]);
      mockTemplateDelegate.count.mockResolvedValue(1);

      const result = await service.listTemplates('user-1', query);

      expect(result).toEqual({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: 'template-1',
            name: '测试模板',
            type: 'reimbursement',
          }),
        ]),
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
      expect(mockTemplateDelegate.findMany).toHaveBeenCalledWith({
        where: { is_deleted: 0 },
        orderBy: { update_time: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should filter by type and status', async () => {
      const query: QueryApprovalTemplatesDto = {
        type: 'reimbursement',
        status: 'enabled',
        page: 1,
        pageSize: 10,
      };
      mockTemplateDelegate.findMany.mockResolvedValue([mockTemplate]);
      mockTemplateDelegate.count.mockResolvedValue(1);

      await service.listTemplates('user-1', query);

      expect(mockTemplateDelegate.findMany).toHaveBeenCalledWith({
        where: {
          is_deleted: 0,
          type: 'reimbursement',
          status: 'enabled',
        },
        orderBy: { update_time: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should search by keyword', async () => {
      const query: QueryApprovalTemplatesDto = {
        keyword: '测试',
        page: 1,
        pageSize: 10,
      };
      mockTemplateDelegate.findMany.mockResolvedValue([mockTemplate]);
      mockTemplateDelegate.count.mockResolvedValue(1);

      await service.listTemplates('user-1', query);

      expect(mockTemplateDelegate.findMany).toHaveBeenCalledWith({
        where: {
          is_deleted: 0,
          OR: [
            { name: { contains: '测试' } },
            { description: { contains: '测试' } },
            { type: { contains: '测试' } },
          ],
        },
        orderBy: { update_time: 'desc' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('getTemplate', () => {
    it('should return template details', async () => {
      mockTemplateDelegate.findFirst.mockResolvedValue(mockTemplate);

      const result = await service.getTemplate('user-1', 'template-1');

      expect(result).toEqual(
        expect.objectContaining({
          id: 'template-1',
          name: '测试模板',
          type: 'reimbursement',
        }),
      );
      expect(mockTemplateDelegate.findFirst).toHaveBeenCalledWith({
        where: { id: 'template-1', is_deleted: 0 },
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      mockTemplateDelegate.findFirst.mockResolvedValue(null);

      await expect(service.getTemplate('user-1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createTemplate', () => {
    const createDto: SaveApprovalTemplateDto = {
      id: 'new-template',
      name: '新模板',
      type: 'reimbursement',
      platformId: 'platform-1',
      platformName: '测试平台',
      deptId: 'dept-1',
      departmentName: '测试部门',
      status: 'enabled',
      description: '新模板描述',
      updatedAt: '2024-01-01T00:00:00.000Z',
      nodes: [
        { id: 'start', name: '开始', type: 'start', timeoutHours: 0, approvers: [], copies: [] },
        { id: 'end', name: '结束', type: 'end', timeoutHours: 0, approvers: [], copies: [] },
      ],
      formFields: [],
    };

    it('should create template successfully', async () => {
      mockTemplateDelegate.findFirst.mockResolvedValue(null); // 名称不重复
      mockTemplateDelegate.create.mockResolvedValue(mockTemplate);

      const result = await service.createTemplate('user-1', createDto);

      expect(result).toEqual(
        expect.objectContaining({
          id: 'template-1',
          name: '测试模板',
        }),
      );
      expect(mockTemplateDelegate.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for duplicate name', async () => {
      mockTemplateDelegate.findFirst.mockResolvedValue(mockTemplate);

      await expect(service.createTemplate('user-1', createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid workflow config', async () => {
      const invalidDto = {
        ...createDto,
        nodes: [], // 空节点数组
      };
      mockTemplateDelegate.findFirst.mockResolvedValue(null);

      await expect(service.createTemplate('user-1', invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateTemplate', () => {
    const updateDto: SaveApprovalTemplateDto = {
      id: 'template-1',
      name: '更新模板',
      type: 'reimbursement',
      platformId: 'platform-1',
      platformName: '测试平台',
      deptId: 'dept-1',
      departmentName: '测试部门',
      status: 'enabled',
      description: '更新描述',
      updatedAt: '2024-01-01T00:00:00.000Z',
      nodes: [
        { id: 'start', name: '开始', type: 'start', timeoutHours: 0, approvers: [], copies: [] },
        { id: 'end', name: '结束', type: 'end', timeoutHours: 0, approvers: [], copies: [] },
      ],
      formFields: [],
    };

    it('should update template successfully', async () => {
      mockTemplateDelegate.findFirst
        .mockResolvedValueOnce(mockTemplate) // ensureTemplateExists
        .mockResolvedValueOnce(null); // checkTemplateNameUnique
      mockInstanceDelegate.count.mockResolvedValue(0); // no active instances
      mockTemplateDelegate.update.mockResolvedValue({ ...mockTemplate, name: '更新模板' });

      const result = await service.updateTemplate('user-1', 'template-1', updateDto);

      expect(result.name).toBe('更新模板');
      expect(mockTemplateDelegate.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when template has active instances', async () => {
      mockTemplateDelegate.findFirst.mockResolvedValue(mockTemplate);
      mockInstanceDelegate.count.mockResolvedValue(1); // has active instances

      await expect(service.updateTemplate('user-1', 'template-1', updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template successfully', async () => {
      mockTemplateDelegate.findFirst.mockResolvedValue(mockTemplate);
      mockInstanceDelegate.count.mockResolvedValue(0); // no active instances
      mockTemplateDelegate.update.mockResolvedValue({ ...mockTemplate, is_deleted: 1 });

      const result = await service.deleteTemplate('user-1', 'template-1');

      expect(result).toEqual({ success: true, message: '模板删除成功' });
      expect(mockTemplateDelegate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: { is_deleted: 1 },
      });
    });

    it('should throw BadRequestException when template has active instances', async () => {
      mockTemplateDelegate.findFirst.mockResolvedValue(mockTemplate);
      mockInstanceDelegate.count.mockResolvedValue(1); // has active instances

      await expect(service.deleteTemplate('user-1', 'template-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('toggleTemplateStatus', () => {
    it('should enable template successfully', async () => {
      mockTemplateDelegate.findFirst.mockResolvedValue(mockTemplate);
      mockTemplateDelegate.update.mockResolvedValue({ ...mockTemplate, status: 'enabled' });

      const result = await service.toggleTemplateStatus('user-1', 'template-1', 'enabled');

      expect(result.status).toBe('enabled');
      expect(mockTemplateDelegate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: { status: 'enabled' },
      });
    });

    it('should disable template when no active instances', async () => {
      mockTemplateDelegate.findFirst.mockResolvedValue(mockTemplate);
      mockInstanceDelegate.count.mockResolvedValue(0); // no active instances
      mockTemplateDelegate.update.mockResolvedValue({ ...mockTemplate, status: 'disabled' });

      const result = await service.toggleTemplateStatus('user-1', 'template-1', 'disabled');

      expect(result.status).toBe('disabled');
    });

    it('should throw BadRequestException when disabling template with active instances', async () => {
      mockTemplateDelegate.findFirst.mockResolvedValue(mockTemplate);
      mockInstanceDelegate.count.mockResolvedValue(1); // has active instances

      await expect(
        service.toggleTemplateStatus('user-1', 'template-1', 'disabled'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('copyTemplate', () => {
    it('should copy template successfully', async () => {
      mockTemplateDelegate.findFirst
        .mockResolvedValueOnce(mockTemplate) // getTemplate
        .mockResolvedValueOnce(null); // checkTemplateNameUnique
      mockTemplateDelegate.create.mockResolvedValue({
        ...mockTemplate,
        id: 'new-template-id',
        name: '测试模板 (副本)',
        status: 'disabled',
      });

      const result = await service.copyTemplate('user-1', 'template-1');

      expect(result.name).toBe('测试模板 (副本)');
      expect(result.status).toBe('disabled');
      expect(mockTemplateDelegate.create).toHaveBeenCalled();
    });
  });

  describe('validateFormConfig', () => {
    it('should validate form config successfully', () => {
      const validFormFields = [
        { id: 'field1', type: 'text', label: '字段1', required: true },
        { id: 'field2', type: 'number', label: '字段2', required: false },
      ];

      const result = service.validateFormConfig(validFormFields);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid form config', () => {
      const invalidFormFields = [
        { type: 'text', label: '字段1' }, // 缺少 id
        { id: 'field2', label: '字段2' }, // 缺少 type
        { id: 'field3', type: 'invalid', label: '字段3' }, // 无效类型
      ];

      const result = service.validateFormConfig(invalidFormFields);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('表单字段 1 缺少 id');
      expect(result.errors).toContain('表单字段 2 缺少 type');
      expect(result.errors).toContain('表单字段 3 类型 invalid 不支持');
    });
  });

  describe('validateWorkflowConfig', () => {
    it('should validate workflow config successfully', () => {
      const validNodes = [
        { id: 'start', name: '开始', type: 'start' },
        { id: 'approval', name: '审批', type: 'approval', approvers: [{ id: 'user1', name: '用户1' }] },
        { id: 'end', name: '结束', type: 'end' },
      ];

      const result = service.validateWorkflowConfig(validNodes);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid workflow config', () => {
      const invalidNodes = [
        { id: 'approval', name: '审批', type: 'approval' }, // 缺少审批人
        { id: 'branch', name: '分支', type: 'branch' }, // 缺少条件
      ];

      const result = service.validateWorkflowConfig(invalidNodes);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('工作流必须包含开始节点');
      expect(result.errors).toContain('工作流必须包含结束节点');
      expect(result.errors).toContain('审批节点 审批 必须设置审批人');
      expect(result.errors).toContain('分支节点 分支 必须设置条件');
    });

    it('should return error for empty nodes', () => {
      const result = service.validateWorkflowConfig([]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('工作流节点不能为空');
    });
  });
});
