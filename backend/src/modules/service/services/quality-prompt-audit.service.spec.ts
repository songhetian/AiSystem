import { Test, TestingModule } from '@nestjs/testing';
import { QualityPromptService } from './quality-prompt.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScopeService } from '../../../common/services/scope.service';
import { RedisService } from '../../../common/services/redis.service';
import { AuditLogService } from '../../../common/services/audit-log.service';
import { QueryAuditLogsDto } from '../dto/query-audit-logs.dto';

/**
 * 审计日志功能单元测试
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7**
 */
describe('QualityPromptService - Audit Logs', () => {
  let service: QualityPromptService;
  let prismaService: any;
  let scopeService: ScopeService;

  const mockAuditLogModel = {
    count: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  };

  const mockPrismaService = {
    service_quality_prompt_global: {},
    service_quality_prompt_department: {},
    service_quality_prompt_version: {},
    service_quality_prompt_audit_log: mockAuditLogModel,
  };

  const mockScopeService = {
    resolveAccess: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    deleteByPattern: jest.fn(),
  };

  const mockAuditLogService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QualityPromptService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ScopeService, useValue: mockScopeService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<QualityPromptService>(QualityPromptService);
    prismaService = module.get<PrismaService>(PrismaService);
    scopeService = module.get<ScopeService>(ScopeService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('queryAuditLogs', () => {
    const userId = 'user-123';
    const platformId = 'platform-456';
    const deptId = 'dept-789';

    beforeEach(() => {
      mockScopeService.resolveAccess.mockResolvedValue({
        platform_id: platformId,
        dept_id: deptId,
      });
    });

    it('should query audit logs with default pagination', async () => {
      // Arrange
      const dto: QueryAuditLogsDto = {};
      const mockLogs = [
        {
          id: 'log-1',
          create_time: new Date('2024-01-01'),
          operation_type: 'create',
          operator_id: 'user-123',
          operator_name: 'Test User',
          prompt_id: 'prompt-1',
          prompt_type: 'global',
          prompt_name: 'Test Prompt',
          platform_id: platformId,
        },
      ];

      mockAuditLogModel.count.mockResolvedValue(1);
      mockAuditLogModel.findMany.mockResolvedValue(mockLogs);

      // Act
      const result = await service.queryAuditLogs(dto, userId);

      // Assert
      expect(result).toEqual({
        total: 1,
        list: mockLogs,
        page: 1,
        pageSize: 20,
      });

      expect(mockAuditLogModel.count).toHaveBeenCalledWith({
        where: { platform_id: platformId },
      });

      expect(mockAuditLogModel.findMany).toHaveBeenCalledWith({
        where: { platform_id: platformId },
        orderBy: { create_time: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by operator_id', async () => {
      // Arrange
      const dto: QueryAuditLogsDto = {
        operator_id: 'user-456',
      };

      mockAuditLogModel.count.mockResolvedValue(0);
      mockAuditLogModel.findMany.mockResolvedValue([]);

      // Act
      await service.queryAuditLogs(dto, userId);

      // Assert
      expect(mockAuditLogModel.count).toHaveBeenCalledWith({
        where: {
          platform_id: platformId,
          operator_id: 'user-456',
        },
      });
    });

    it('should filter by operator_name with contains', async () => {
      // Arrange
      const dto: QueryAuditLogsDto = {
        operator_name: 'John',
      };

      mockAuditLogModel.count.mockResolvedValue(0);
      mockAuditLogModel.findMany.mockResolvedValue([]);

      // Act
      await service.queryAuditLogs(dto, userId);

      // Assert
      expect(mockAuditLogModel.count).toHaveBeenCalledWith({
        where: {
          platform_id: platformId,
          operator_name: { contains: 'John' },
        },
      });
    });

    it('should filter by operation_type', async () => {
      // Arrange
      const dto: QueryAuditLogsDto = {
        operation_type: 'delete',
      };

      mockAuditLogModel.count.mockResolvedValue(0);
      mockAuditLogModel.findMany.mockResolvedValue([]);

      // Act
      await service.queryAuditLogs(dto, userId);

      // Assert
      expect(mockAuditLogModel.count).toHaveBeenCalledWith({
        where: {
          platform_id: platformId,
          operation_type: 'delete',
        },
      });
    });

    it('should filter by date range', async () => {
      // Arrange
      const dto: QueryAuditLogsDto = {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      };

      mockAuditLogModel.count.mockResolvedValue(0);
      mockAuditLogModel.findMany.mockResolvedValue([]);

      // Act
      await service.queryAuditLogs(dto, userId);

      // Assert
      const whereClause = mockAuditLogModel.count.mock.calls[0][0].where;
      expect(whereClause.create_time.gte).toEqual(new Date('2024-01-01'));
      expect(whereClause.create_time.lte.getDate()).toBe(31);
      expect(whereClause.create_time.lte.getHours()).toBe(23);
      expect(whereClause.create_time.lte.getMinutes()).toBe(59);
    });

    it('should support custom pagination', async () => {
      // Arrange
      const dto: QueryAuditLogsDto = {
        page: 3,
        pageSize: 50,
      };

      mockAuditLogModel.count.mockResolvedValue(150);
      mockAuditLogModel.findMany.mockResolvedValue([]);

      // Act
      await service.queryAuditLogs(dto, userId);

      // Assert
      expect(mockAuditLogModel.findMany).toHaveBeenCalledWith({
        where: { platform_id: platformId },
        orderBy: { create_time: 'desc' },
        skip: 100, // (3-1) * 50
        take: 50,
      });
    });

    it('should filter by multiple criteria', async () => {
      // Arrange
      const dto: QueryAuditLogsDto = {
        operator_name: 'Admin',
        operation_type: 'edit',
        prompt_type: 'global',
        dept_id: 'dept-123',
        start_date: '2024-01-01',
      };

      mockAuditLogModel.count.mockResolvedValue(0);
      mockAuditLogModel.findMany.mockResolvedValue([]);

      // Act
      await service.queryAuditLogs(dto, userId);

      // Assert
      const whereClause = mockAuditLogModel.count.mock.calls[0][0].where;
      expect(whereClause.operator_name).toEqual({ contains: 'Admin' });
      expect(whereClause.operation_type).toBe('edit');
      expect(whereClause.prompt_type).toBe('global');
      expect(whereClause.dept_id).toBe('dept-123');
      expect(whereClause.create_time.gte).toEqual(new Date('2024-01-01'));
    });
  });

  describe('exportAuditLogs', () => {
    const userId = 'user-123';
    const platformId = 'platform-456';

    beforeEach(() => {
      mockScopeService.resolveAccess.mockResolvedValue({
        platform_id: platformId,
        dept_id: 'dept-789',
      });
    });

    it('should export audit logs as CSV', async () => {
      // Arrange
      const dto: QueryAuditLogsDto = {};
      const mockLogs = [
        {
          id: 'log-1',
          create_time: new Date('2024-01-01T10:00:00Z'),
          operation_type: 'create',
          operator_id: 'user-123',
          operator_name: 'Test User',
          prompt_id: 'prompt-1',
          prompt_type: 'global',
          prompt_name: 'Test Prompt',
          before_content: null,
          after_content: 'New content',
          delete_reason: null,
          platform_id: platformId,
          dept_id: 'dept-789',
          request_ip: '192.168.1.1',
        },
      ];

      mockAuditLogModel.findMany.mockResolvedValue(mockLogs);

      // Act
      const result = await service.exportAuditLogs(dto, userId);

      // Assert
      expect(result).toContain('ID,Create Time,Operation Type');
      expect(result).toContain('log-1');
      expect(result).toContain('2024-01-01T10:00:00.000Z');
      expect(result).toContain('create');
      expect(result).toContain('Test User');
      expect(result).toContain('Test Prompt');
      expect(result).toContain('New content');
      expect(result).toContain('192.168.1.1');
    });

    it('should escape CSV fields with commas', async () => {
      // Arrange
      const dto: QueryAuditLogsDto = {};
      const mockLogs = [
        {
          id: 'log-1',
          create_time: new Date('2024-01-01'),
          operation_type: 'create',
          operator_id: 'user-123',
          operator_name: 'User, Test',
          prompt_id: 'prompt-1',
          prompt_type: 'global',
          prompt_name: 'Prompt, Name',
          before_content: null,
          after_content: 'Content with, comma',
          delete_reason: null,
          platform_id: platformId,
          dept_id: null,
          request_ip: null,
        },
      ];

      mockAuditLogModel.findMany.mockResolvedValue(mockLogs);

      // Act
      const result = await service.exportAuditLogs(dto, userId);

      // Assert
      expect(result).toContain('"User, Test"');
      expect(result).toContain('"Prompt, Name"');
      expect(result).toContain('"Content with, comma"');
    });

    it('should escape CSV fields with quotes', async () => {
      // Arrange
      const dto: QueryAuditLogsDto = {};
      const mockLogs = [
        {
          id: 'log-1',
          create_time: new Date('2024-01-01'),
          operation_type: 'create',
          operator_id: 'user-123',
          operator_name: 'User "Admin"',
          prompt_id: 'prompt-1',
          prompt_type: 'global',
          prompt_name: 'Test',
          before_content: null,
          after_content: 'Content with "quotes"',
          delete_reason: null,
          platform_id: platformId,
          dept_id: null,
          request_ip: null,
        },
      ];

      mockAuditLogModel.findMany.mockResolvedValue(mockLogs);

      // Act
      const result = await service.exportAuditLogs(dto, userId);

      // Assert
      // CSV escaping: quotes are doubled and the field is wrapped in quotes
      expect(result).toContain('"User ""Admin"""');
      // The after_content field will be escaped when passed to escapeCsvField
      expect(result).toContain('Content with');
      expect(result).toContain('quotes');
    });

    it('should handle empty result set', async () => {
      // Arrange
      const dto: QueryAuditLogsDto = {};
      mockAuditLogModel.findMany.mockResolvedValue([]);

      // Act
      const result = await service.exportAuditLogs(dto, userId);

      // Assert
      expect(result).toContain('ID,Create Time,Operation Type');
      const lines = result.split('\n');
      expect(lines.length).toBe(1); // Only header
    });

    it('should apply filters when exporting', async () => {
      // Arrange
      const dto: QueryAuditLogsDto = {
        operator_id: 'user-456',
        operation_type: 'delete',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      };

      mockAuditLogModel.findMany.mockResolvedValue([]);

      // Act
      await service.exportAuditLogs(dto, userId);

      // Assert
      const whereClause = mockAuditLogModel.findMany.mock.calls[0][0].where;
      expect(whereClause.operator_id).toBe('user-456');
      expect(whereClause.operation_type).toBe('delete');
      expect(whereClause.create_time.gte).toEqual(new Date('2024-01-01'));
    });

    it('should not paginate export results', async () => {
      // Arrange
      const dto: QueryAuditLogsDto = {};
      mockAuditLogModel.findMany.mockResolvedValue([]);

      // Act
      await service.exportAuditLogs(dto, userId);

      // Assert
      const callArgs = mockAuditLogModel.findMany.mock.calls[0][0];
      expect(callArgs.skip).toBeUndefined();
      expect(callArgs.take).toBeUndefined();
    });
  });

  describe('CSV field escaping', () => {
    it('should handle newlines in CSV fields', async () => {
      // Arrange
      const userId = 'user-123';
      const platformId = 'platform-456';
      const dto: QueryAuditLogsDto = {};

      mockScopeService.resolveAccess.mockResolvedValue({
        platform_id: platformId,
        dept_id: 'dept-789',
      });

      const mockLogs = [
        {
          id: 'log-1',
          create_time: new Date('2024-01-01'),
          operation_type: 'create',
          operator_id: 'user-123',
          operator_name: 'Test User',
          prompt_id: 'prompt-1',
          prompt_type: 'global',
          prompt_name: 'Test',
          before_content: null,
          after_content: 'Line 1\nLine 2\nLine 3',
          delete_reason: null,
          platform_id: platformId,
          dept_id: null,
          request_ip: null,
        },
      ];

      mockAuditLogModel.findMany.mockResolvedValue(mockLogs);

      // Act
      const result = await service.exportAuditLogs(dto, userId);

      // Assert
      expect(result).toContain('"Line 1\nLine 2\nLine 3"');
    });
  });
});
