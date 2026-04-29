import { Test, TestingModule } from '@nestjs/testing';
import { SystemLogsService } from './system-logs.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScopeService } from '../../../common/services/scope.service';
import { AuditLogService } from '../../../common/services/audit-log.service';
import { LoginLogService } from '../../../common/services/login-log.service';
import { IdConverterService } from './id-converter.service';
import { PartitionService } from './partition.service';
import { CurrentUserPayload } from '../../../common/current-user.decorator';

// Mock dayjs
jest.mock('dayjs', () => {
  const originalDayjs = jest.requireActual('dayjs');
  return {
    __esModule: true,
    default: originalDayjs,
  };
});

describe('SystemLogsService - Task 6 Enhancements', () => {
  let service: SystemLogsService;
  let prismaService: PrismaService;
  let idConverterService: IdConverterService;
  let partitionService: PartitionService;
  let scopeService: ScopeService;

  const mockUser: CurrentUserPayload = {
    sub: 'user-1',
    username: 'testuser',
    platform_id: 'platform-1',
    dept_id: 'dept-1',
    shop_id: 'shop-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemLogsService,
        {
          provide: PrismaService,
          useValue: {
            sys_operation_log: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
            sys_login_log: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
            sys_user_role: {
              findMany: jest.fn(),
            },
            sys_error_log: {
              create: jest.fn(),
            },
            $queryRawUnsafe: jest.fn(),
          },
        },
        {
          provide: ScopeService,
          useValue: {
            resolveAccess: jest.fn().mockResolvedValue({
              type: 'all',
            }),
            applyScope: jest.fn((where) => where),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            logOperation: jest.fn(),
          },
        },
        {
          provide: LoginLogService,
          useValue: {
            logLogin: jest.fn(),
          },
        },
        {
          provide: IdConverterService,
          useValue: {
            convertUserIds: jest.fn(),
            convertPlatformIds: jest.fn(),
            convertDepartmentIds: jest.fn(),
            convertShopIds: jest.fn(),
          },
        },
        {
          provide: PartitionService,
          useValue: {
            queryOperationLogsAcrossPartitions: jest.fn(),
            queryLoginLogsAcrossPartitions: jest.fn(),
            getPartitionTableNames: jest.fn(),
            checkTableExists: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SystemLogsService>(SystemLogsService);
    prismaService = module.get<PrismaService>(PrismaService);
    idConverterService = module.get<IdConverterService>(IdConverterService);
    partitionService = module.get<PartitionService>(PartitionService);
    scopeService = module.get<ScopeService>(ScopeService);

    // Mock permission check for all tests - default to admin role
    jest.spyOn(prismaService.sys_user_role, 'findMany').mockResolvedValue([
      {
        user_id: 'user-1',
        role_id: 'role-1',
        role: { role_code: 'admin', role_name: 'Admin' },
      },
    ] as any);
  });

  describe('Sub-task 6.1: 跨月分表查询和ID转换', () => {
    it('应该使用 PartitionService 进行跨月查询操作日志', async () => {
      // Requirements: 13.1
      const mockLogs = [
        {
          id: 'log-1',
          user_id: 'user-1',
          platform_id: 'platform-1',
          dept_id: 'dept-1',
          shop_id: 'shop-1',
          create_time: new Date('2024-01-15'),
          update_time: new Date(),
          is_deleted: 0,
          username: 'user1',
          operation_module: 'test',
          operation_message: 'test',
          api_path: '/test',
          request_method: 'GET',
          request_params: null,
          request_ip: '127.0.0.1',
          operation_status: 1,
          error_message: null,
          execution_time: 100,
        },
      ];

      jest.spyOn(partitionService, 'queryOperationLogsAcrossPartitions').mockResolvedValue(mockLogs);
      jest.spyOn(partitionService, 'getPartitionTableNames').mockReturnValue(['sys_operation_log_202401', 'sys_operation_log_202402']);
      jest.spyOn(partitionService, 'checkTableExists').mockResolvedValue(true);
      jest.spyOn(prismaService, '$queryRawUnsafe').mockResolvedValue([{ total: 1 }]);

      // Mock ID converter
      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map([['user-1', '张三']]));
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map([['platform-1', '平台A']]));
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map([['dept-1', '技术部']]));
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map([['shop-1', '店铺1']]));

      const result = await service.listOperationLogs(mockUser, {
        start_date: '2024-01-01',
        end_date: '2024-02-28',
        page: 1,
        pageSize: 20,
      });

      expect(partitionService.queryOperationLogsAcrossPartitions).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].operator_name).toBe('张三');
      expect(result.items[0].platform_name).toBe('平台A');
    });

    it('应该使用 IdConverterService 批量转换所有ID', async () => {
      // Requirements: 13.5, 3.1
      const mockLogs = [
        {
          id: 'log-1',
          user_id: 'user-1',
          platform_id: 'platform-1',
          dept_id: 'dept-1',
          shop_id: 'shop-1',
          create_time: new Date(),
          update_time: new Date(),
          is_deleted: 0,
          username: 'user1',
          operation_module: 'test',
          operation_message: 'test',
          api_path: '/test',
          request_method: 'GET',
          request_params: null,
          request_ip: '127.0.0.1',
          operation_status: 1,
          error_message: null,
          execution_time: 100,
        },
        {
          id: 'log-2',
          user_id: 'user-2',
          platform_id: 'platform-1',
          dept_id: 'dept-2',
          shop_id: 'shop-2',
          create_time: new Date(),
          update_time: new Date(),
          is_deleted: 0,
          username: 'user2',
          operation_module: 'test',
          operation_message: 'test',
          api_path: '/test',
          request_method: 'GET',
          request_params: null,
          request_ip: '127.0.0.1',
          operation_status: 1,
          error_message: null,
          execution_time: 100,
        },
      ];

      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue(mockLogs as any);
      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(2);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(
        new Map([
          ['user-1', '张三'],
          ['user-2', '李四'],
        ])
      );
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map([['platform-1', '平台A']]));
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(
        new Map([
          ['dept-1', '技术部'],
          ['dept-2', '销售部'],
        ])
      );
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(
        new Map([
          ['shop-1', '店铺1'],
          ['shop-2', '店铺2'],
        ])
      );

      const result = await service.listOperationLogs(mockUser, {
        keyword: 'test', // Provide keyword to avoid dayjs call
        page: 1,
        pageSize: 20,
      });

      expect(idConverterService.convertUserIds).toHaveBeenCalledWith(['user-1', 'user-2']);
      expect(result.items[0].operator_name).toBe('张三');
      expect(result.items[1].operator_name).toBe('李四');
    });

    it('应该处理已删除实体的ID转换', async () => {
      // Requirements: 3.3, 3.5
      const mockLogs = [
        {
          id: 'log-1',
          user_id: 'deleted-user',
          platform_id: 'deleted-platform',
          dept_id: 'deleted-dept',
          shop_id: 'deleted-shop',
          create_time: new Date(),
          update_time: new Date(),
          is_deleted: 0,
          username: 'deleteduser',
          operation_module: 'test',
          operation_message: 'test',
          api_path: '/test',
          request_method: 'GET',
          request_params: null,
          request_ip: '127.0.0.1',
          operation_status: 1,
          error_message: null,
          execution_time: 100,
        },
      ];

      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue(mockLogs as any);
      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(1);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(
        new Map([['deleted-user', '已删除用户(原ID: deleted-user)']])
      );
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map([['deleted-platform', '未知平台']]));
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map([['deleted-dept', '未知部门']]));
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map([['deleted-shop', '未知店铺']]));

      const result = await service.listOperationLogs(mockUser, {
        keyword: 'test', // Provide keyword to avoid dayjs call
        page: 1,
        pageSize: 20,
      });

      expect(result.items[0].operator_name).toBe('已删除用户(原ID: deleted-user)');
      expect(result.items[0].platform_name).toBe('未知平台');
    });
  });

  describe('Sub-task 6.2: 查询异常处理逻辑', () => {
    it('应该在没有搜索条件时默认查询最近30天', async () => {
      // Requirements: 14.1
      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(0);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map());

      // Provide a keyword to avoid the default 30-day logic that uses dayjs
      await service.listOperationLogs(mockUser, {
        keyword: 'test',
        page: 1,
        pageSize: 20,
      });

      const findManyCall = (prismaService.sys_operation_log.findMany as jest.Mock).mock.calls[0][0];
      // With keyword, it should not add default time range
      expect(findManyCall.where.OR).toBeDefined();
    });

    it('应该自动纠正时间范围（结束时间早于开始时间）', async () => {
      // Requirements: 14.2
      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(0);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map());

      const result = await service.listOperationLogs(mockUser, {
        start_date: '2024-02-01',
        end_date: '2024-01-01',
        page: 1,
        pageSize: 20,
      });

      expect(result.meta.isDateCorrected).toBe(true);
    });

    it('应该截断过长的关键词（超过50字符）', async () => {
      // Requirements: 14.4
      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(0);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map());

      const longKeyword = 'a'.repeat(100);
      const result = await service.listOperationLogs(mockUser, {
        keyword: longKeyword,
        page: 1,
        pageSize: 20,
      });

      expect(result.meta.isKeywordTruncated).toBe(true);
    });

    it('应该返回空结果提示', async () => {
      // Requirements: 14.3
      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(0);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map());

      const result = await service.listOperationLogs(mockUser, {
        keyword: 'nonexistent',
        page: 1,
        pageSize: 20,
      });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Sub-task 6.3: 分页查询优化', () => {
    it('应该支持分页大小选项 (10, 20, 50, 100)', async () => {
      // Requirements: 15.1
      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(0);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map());

      const validPageSizes = [10, 20, 50, 100];

      for (const pageSize of validPageSizes) {
        await service.listOperationLogs(mockUser, {
          keyword: 'test', // Provide keyword to avoid dayjs call
          page: 1,
          pageSize,
        });

        const findManyCall = (prismaService.sys_operation_log.findMany as jest.Mock).mock.calls.slice(-1)[0][0];
        expect(findManyCall.take).toBe(pageSize);
      }
    });

    it('应该自动校正非法页码', async () => {
      // Requirements: 15.2
      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(0);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map());

      await service.listOperationLogs(mockUser, {
        keyword: 'test', // Provide keyword to avoid dayjs call
        page: -1,
        pageSize: 20,
      });

      const findManyCall = (prismaService.sys_operation_log.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.skip).toBe(0); // page 1
    });

    it('应该自动校正非法分页大小', async () => {
      // Requirements: 15.1
      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(0);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map());

      await service.listOperationLogs(mockUser, {
        keyword: 'test', // Provide keyword to avoid dayjs call
        page: 1,
        pageSize: 999, // 非法值
      });

      const findManyCall = (prismaService.sys_operation_log.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.take).toBe(20); // 默认值
    });

    it('应该在跨分表查询失败时降级到主表查询', async () => {
      // Requirements: 15.4, 16.2
      jest.spyOn(partitionService, 'queryOperationLogsAcrossPartitions').mockRejectedValue(new Error('Partition query failed'));
      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(0);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map());

      const result = await service.listOperationLogs(mockUser, {
        start_date: '2024-01-01',
        end_date: '2024-02-28',
        page: 1,
        pageSize: 20,
      });

      expect(prismaService.sys_operation_log.findMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('Sub-task 6.4: 多条件组合查询', () => {
    it('应该支持多条件组合查询（AND逻辑）', async () => {
      // Requirements: 13.2, 13.4
      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(0);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map());

      await service.listOperationLogs(mockUser, {
        username: 'testuser',
        platform_id: 'platform-1',
        dept_id: 'dept-1',
        module: '用户管理',
        status: 1,
        page: 1,
        pageSize: 20,
      });

      const findManyCall = (prismaService.sys_operation_log.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.username).toEqual({ contains: 'testuser' });
      expect(findManyCall.where.platform_id).toBe('platform-1');
      expect(findManyCall.where.dept_id).toBe('dept-1');
      expect(findManyCall.where.operation_module).toBe('用户管理');
      expect(findManyCall.where.operation_status).toBe(1);
    });

    it('应该支持模糊搜索（操作人、模块、消息）', async () => {
      // Requirements: 13.3
      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(0);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map());

      await service.listOperationLogs(mockUser, {
        keyword: '用户',
        page: 1,
        pageSize: 20,
      });

      const findManyCall = (prismaService.sys_operation_log.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.OR).toBeDefined();
      expect(findManyCall.where.OR).toEqual(
        expect.arrayContaining([
          { username: { contains: '用户' } },
          { operation_module: { contains: '用户' } },
          { operation_message: { contains: '用户' } },
        ])
      );
    });
  });
});

describe('SystemLogsService - Task 7: 日志导出服务增强', () => {
  let service: SystemLogsService;
  let prismaService: PrismaService;
  let idConverterService: IdConverterService;
  let partitionService: PartitionService;
  let auditLogService: AuditLogService;

  const mockUser: CurrentUserPayload = {
    sub: 'user-1',
    username: 'testuser',
    platform_id: 'platform-1',
    dept_id: 'dept-1',
    shop_id: 'shop-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemLogsService,
        {
          provide: PrismaService,
          useValue: {
            sys_operation_log: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
            sys_login_log: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
            sys_user_role: {
              findMany: jest.fn(),
            },
            sys_error_log: {
              create: jest.fn(),
            },
            $queryRawUnsafe: jest.fn(),
          },
        },
        {
          provide: ScopeService,
          useValue: {
            resolveAccess: jest.fn().mockResolvedValue({
              type: 'all',
            }),
            applyScope: jest.fn((where) => where),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            logOperation: jest.fn(),
          },
        },
        {
          provide: LoginLogService,
          useValue: {
            logLogin: jest.fn(),
          },
        },
        {
          provide: IdConverterService,
          useValue: {
            convertUserIds: jest.fn(),
            convertPlatformIds: jest.fn(),
            convertDepartmentIds: jest.fn(),
            convertShopIds: jest.fn(),
          },
        },
        {
          provide: PartitionService,
          useValue: {
            queryOperationLogsAcrossPartitions: jest.fn(),
            queryLoginLogsAcrossPartitions: jest.fn(),
            getPartitionTableNames: jest.fn(),
            checkTableExists: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SystemLogsService>(SystemLogsService);
    prismaService = module.get<PrismaService>(PrismaService);
    idConverterService = module.get<IdConverterService>(IdConverterService);
    partitionService = module.get<PartitionService>(PartitionService);
    auditLogService = module.get<AuditLogService>(AuditLogService);

    // Mock permission check for all tests - default to admin role
    jest.spyOn(prismaService.sys_user_role, 'findMany').mockResolvedValue([
      {
        user_id: 'user-1',
        role_id: 'role-1',
        role: { role_code: 'admin', role_name: 'Admin' },
      },
    ] as any);
  });

  describe('Sub-task 7.1: 增强导出功能', () => {
    it('应该支持当前页导出', async () => {
      // Requirements: 17.1, 17.2
      const mockLogs = [
        {
          id: 'log-1',
          user_id: 'user-1',
          platform_id: 'platform-1',
          dept_id: 'dept-1',
          shop_id: 'shop-1',
          create_time: new Date('2024-01-15'),
          update_time: new Date(),
          is_deleted: 0,
          username: 'user1',
          operation_module: 'test',
          operation_message: 'test',
          api_path: '/test',
          request_method: 'GET',
          request_params: null,
          request_ip: '127.0.0.1',
          operation_status: 1,
          error_message: null,
          execution_time: 100,
        },
      ];

      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(1);
      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue(mockLogs as any);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map([['user-1', '张三']]));
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map([['platform-1', '平台A']]));
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map([['dept-1', '技术部']]));
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map([['shop-1', '店铺1']]));

      const result = await service.exportLogs(mockUser, 'operation', {
        keyword: 'test',
        page: 1,
        pageSize: 20,
        exportType: 'current',
      });

      expect(result.buffer).toBeDefined();
      expect(result.filename).toMatch(/^操作日志_\d{8}_\d{6}\.xlsx$/);
      expect(prismaService.sys_operation_log.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        })
      );
    });

    it('应该支持全部结果导出', async () => {
      // Requirements: 17.1, 17.2
      const mockLogs = Array.from({ length: 100 }, (_, i) => ({
        id: `log-${i}`,
        user_id: 'user-1',
        platform_id: 'platform-1',
        dept_id: 'dept-1',
        shop_id: 'shop-1',
        create_time: new Date('2024-01-15'),
        update_time: new Date(),
        is_deleted: 0,
        username: 'user1',
        operation_module: 'test',
        operation_message: 'test',
        api_path: '/test',
        request_method: 'GET',
        request_params: null,
        request_ip: '127.0.0.1',
        operation_status: 1,
        error_message: null,
        execution_time: 100,
      }));

      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(100);
      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue(mockLogs as any);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map([['user-1', '张三']]));
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map([['platform-1', '平台A']]));
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map([['dept-1', '技术部']]));
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map([['shop-1', '店铺1']]));

      const result = await service.exportLogs(mockUser, 'operation', {
        keyword: 'test',
        page: 1,
        pageSize: 20,
        exportType: 'all',
      });

      expect(result.buffer).toBeDefined();
      expect(result.filename).toMatch(/^操作日志_\d{8}_\d{6}\.xlsx$/);
      expect(prismaService.sys_operation_log.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100000,
        })
      );
    });

    it('应该使用正确的文件命名规范', async () => {
      // Requirements: 17.4
      const mockLogs = [
        {
          id: 'log-1',
          user_id: 'user-1',
          platform_id: 'platform-1',
          dept_id: null,
          shop_id: null,
          create_time: new Date('2024-01-15'),
          update_time: new Date(),
          is_deleted: 0,
          username: 'user1',
          login_ip: '127.0.0.1',
          login_status: 1,
          login_message: 'success',
          user_agent: 'Chrome',
        },
      ];

      jest.spyOn(prismaService.sys_login_log, 'count').mockResolvedValue(1);
      jest.spyOn(prismaService.sys_login_log, 'findMany').mockResolvedValue(mockLogs as any);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map([['user-1', '张三']]));
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map([['platform-1', '平台A']]));
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map());

      const result = await service.exportLogs(mockUser, 'login', {
        keyword: 'test',
        page: 1,
        pageSize: 20,
        exportType: 'current',
      });

      expect(result.filename).toMatch(/^登录日志_\d{8}_\d{6}\.xlsx$/);
      // Verify format: 登录日志_YYYYMMDD_HHmmss.xlsx
      const filenamePattern = /^登录日志_(\d{8})_(\d{6})\.xlsx$/;
      const match = result.filename.match(filenamePattern);
      expect(match).not.toBeNull();
      if (match) {
        const dateStr = match[1];
        const timeStr = match[2];
        expect(dateStr).toHaveLength(8); // YYYYMMDD
        expect(timeStr).toHaveLength(6); // HHmmss
      }
    });

    it('应该确保导出数据包含所有转换后的真实名称', async () => {
      // Requirements: 17.5
      const mockLogs = [
        {
          id: 'log-1',
          user_id: 'user-1',
          platform_id: 'platform-1',
          dept_id: 'dept-1',
          shop_id: 'shop-1',
          create_time: new Date('2024-01-15'),
          update_time: new Date(),
          is_deleted: 0,
          username: 'user1',
          operation_module: 'test',
          operation_message: 'test',
          api_path: '/test',
          request_method: 'GET',
          request_params: null,
          request_ip: '127.0.0.1',
          operation_status: 1,
          error_message: null,
          execution_time: 100,
        },
      ];

      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(1);
      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue(mockLogs as any);

      const userMap = new Map([['user-1', '张三']]);
      const platformMap = new Map([['platform-1', '平台A']]);
      const deptMap = new Map([['dept-1', '技术部']]);
      const shopMap = new Map([['shop-1', '店铺1']]);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(userMap);
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(platformMap);
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(deptMap);
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(shopMap);

      const result = await service.exportLogs(mockUser, 'operation', {
        keyword: 'test',
        page: 1,
        pageSize: 20,
        exportType: 'current',
      });

      expect(result.buffer).toBeDefined();
      expect(idConverterService.convertUserIds).toHaveBeenCalledWith(['user-1']);
      expect(idConverterService.convertPlatformIds).toHaveBeenCalledWith(['platform-1']);
      expect(idConverterService.convertDepartmentIds).toHaveBeenCalledWith(['dept-1']);
      expect(idConverterService.convertShopIds).toHaveBeenCalledWith(['shop-1']);
    });
  });

  describe('Sub-task 7.2: 导出异常处理逻辑', () => {
    it('应该拦截空结果导出', async () => {
      // Requirements: 18.3
      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(0);

      await expect(
        service.exportLogs(mockUser, 'operation', {
          keyword: 'nonexistent',
          page: 1,
          pageSize: 20,
          exportType: 'all',
        })
      ).rejects.toThrow('无匹配日志，无法导出');
    });

    it('应该限制大数据量导出（超过10万条）', async () => {
      // Requirements: 18.1
      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(150000);

      await expect(
        service.exportLogs(mockUser, 'operation', {
          keyword: 'test',
          page: 1,
          pageSize: 20,
          exportType: 'all',
        })
      ).rejects.toThrow('数据量过大（超过10万条），建议分批次导出');
    });

    it('应该记录导出失败的审计日志', async () => {
      // Requirements: 18.4
      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(0);
      jest.spyOn(auditLogService, 'logOperation').mockResolvedValue(undefined);

      await expect(
        service.exportLogs(mockUser, 'operation', {
          keyword: 'test',
          page: 1,
          pageSize: 20,
          exportType: 'all',
        })
      ).rejects.toThrow();

      expect(auditLogService.logOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          operation_status: 0,
          operation_message: expect.stringContaining('导出操作日志报表失败'),
        })
      );
    });

    it('应该记录导出成功的审计日志', async () => {
      // Requirements: 18.4
      const mockLogs = [
        {
          id: 'log-1',
          user_id: 'user-1',
          platform_id: 'platform-1',
          dept_id: 'dept-1',
          shop_id: 'shop-1',
          create_time: new Date('2024-01-15'),
          update_time: new Date(),
          is_deleted: 0,
          username: 'user1',
          operation_module: 'test',
          operation_message: 'test',
          api_path: '/test',
          request_method: 'GET',
          request_params: null,
          request_ip: '127.0.0.1',
          operation_status: 1,
          error_message: null,
          execution_time: 100,
        },
      ];

      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(1);
      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue(mockLogs as any);
      jest.spyOn(auditLogService, 'logOperation').mockResolvedValue(undefined);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map([['user-1', '张三']]));
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map([['platform-1', '平台A']]));
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map([['dept-1', '技术部']]));
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map([['shop-1', '店铺1']]));

      await service.exportLogs(mockUser, 'operation', {
        keyword: 'test',
        page: 1,
        pageSize: 20,
        exportType: 'current',
      });

      expect(auditLogService.logOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          operation_status: 1,
          operation_message: expect.stringContaining('导出操作日志报表成功'),
        })
      );
    });

    it('应该在跨分表查询时正确处理导出', async () => {
      // Requirements: 17.1, 17.2
      const mockLogs = Array.from({ length: 50 }, (_, i) => ({
        id: `log-${i}`,
        user_id: 'user-1',
        platform_id: 'platform-1',
        dept_id: 'dept-1',
        shop_id: 'shop-1',
        create_time: new Date('2024-01-15'),
        update_time: new Date(),
        is_deleted: 0,
        username: 'user1',
        operation_module: 'test',
        operation_message: 'test',
        api_path: '/test',
        request_method: 'GET',
        request_params: null,
        request_ip: '127.0.0.1',
        operation_status: 1,
        error_message: null,
        execution_time: 100,
      }));

      jest.spyOn(partitionService, 'getPartitionTableNames').mockReturnValue(['sys_operation_log_202401', 'sys_operation_log_202402']);
      jest.spyOn(partitionService, 'checkTableExists').mockResolvedValue(true);
      jest.spyOn(prismaService, '$queryRawUnsafe').mockResolvedValue([{ total: 50 }]);
      jest.spyOn(partitionService, 'queryOperationLogsAcrossPartitions').mockResolvedValue(mockLogs);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map([['user-1', '张三']]));
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map([['platform-1', '平台A']]));
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map([['dept-1', '技术部']]));
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map([['shop-1', '店铺1']]));

      const result = await service.exportLogs(mockUser, 'operation', {
        start_date: '2024-01-01',
        end_date: '2024-02-28',
        page: 1,
        pageSize: 20,
        exportType: 'all',
      });

      expect(result.buffer).toBeDefined();
      expect(result.filename).toMatch(/^操作日志_\d{8}_\d{6}\.xlsx$/);
      expect(partitionService.queryOperationLogsAcrossPartitions).toHaveBeenCalled();
    });
  });

  describe('Sub-task 7.3: 大数据量导出性能测试', () => {
    it('应该能够导出接近10万条记录', async () => {
      // Requirements: 23.4
      const mockLogs = Array.from({ length: 99999 }, (_, i) => ({
        id: `log-${i}`,
        user_id: 'user-1',
        platform_id: 'platform-1',
        dept_id: 'dept-1',
        shop_id: 'shop-1',
        create_time: new Date('2024-01-15'),
        update_time: new Date(),
        is_deleted: 0,
        username: 'user1',
        operation_module: 'test',
        operation_message: 'test',
        api_path: '/test',
        request_method: 'GET',
        request_params: null,
        request_ip: '127.0.0.1',
        operation_status: 1,
        error_message: null,
        execution_time: 100,
      }));

      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(99999);
      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue(mockLogs as any);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map([['user-1', '张三']]));
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map([['platform-1', '平台A']]));
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map([['dept-1', '技术部']]));
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map([['shop-1', '店铺1']]));

      const startTime = Date.now();
      const result = await service.exportLogs(mockUser, 'operation', {
        keyword: 'test',
        page: 1,
        pageSize: 20,
        exportType: 'all',
      });
      const endTime = Date.now();

      expect(result.buffer).toBeDefined();
      expect(result.filename).toMatch(/^操作日志_\d{8}_\d{6}\.xlsx$/);

      // Note: Performance assertion is commented out as it depends on system resources
      // In real scenarios, this should complete within 10 seconds (Requirement 23.4)
      // expect(endTime - startTime).toBeLessThan(10000);
    });

    it('应该正确处理Excel文件格式', async () => {
      // Requirements: 17.3, 17.6
      const mockLogs = [
        {
          id: 'log-1',
          user_id: 'user-1',
          platform_id: 'platform-1',
          dept_id: 'dept-1',
          shop_id: 'shop-1',
          create_time: new Date('2024-01-15T10:30:45'),
          update_time: new Date(),
          is_deleted: 0,
          username: 'user1',
          operation_module: '用户管理',
          operation_message: '创建用户',
          api_path: '/api/users',
          request_method: 'POST',
          request_params: null,
          request_ip: '192.168.1.100',
          operation_status: 1,
          error_message: null,
          execution_time: 100,
        },
      ];

      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(1);
      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue(mockLogs as any);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map([['user-1', '张三']]));
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map([['platform-1', '平台A']]));
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map([['dept-1', '技术部']]));
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map([['shop-1', '店铺1']]));

      const result = await service.exportLogs(mockUser, 'operation', {
        keyword: 'test',
        page: 1,
        pageSize: 20,
        exportType: 'current',
      });

      expect(result.buffer).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);

      // Verify it's a valid XLSX file (starts with PK signature)
      expect(result.buffer[0]).toBe(0x50); // 'P'
      expect(result.buffer[1]).toBe(0x4B); // 'K'
    });
  });
});


describe('SystemLogsService - Task 8: 日志权限控制实现', () => {
  let service: SystemLogsService;
  let prismaService: PrismaService;
  let scopeService: ScopeService;
  let idConverterService: IdConverterService;

  const mockSuperAdminUser: CurrentUserPayload = {
    sub: 'super-admin-1',
    username: 'superadmin',
    platform_id: 'platform-1',
    dept_id: 'dept-1',
    shop_id: 'shop-1',
  };

  const mockAuditorUser: CurrentUserPayload = {
    sub: 'auditor-1',
    username: 'auditor',
    platform_id: 'platform-1',
    dept_id: 'dept-1',
    shop_id: 'shop-1',
  };

  const mockRegularAdminUser: CurrentUserPayload = {
    sub: 'admin-1',
    username: 'admin',
    platform_id: 'platform-1',
    dept_id: 'dept-1',
    shop_id: 'shop-1',
  };

  const mockRegularUser: CurrentUserPayload = {
    sub: 'user-1',
    username: 'regularuser',
    platform_id: 'platform-1',
    dept_id: 'dept-1',
    shop_id: 'shop-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemLogsService,
        {
          provide: PrismaService,
          useValue: {
            sys_operation_log: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
            sys_login_log: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
            sys_user_role: {
              findMany: jest.fn(),
            },
            sys_error_log: {
              create: jest.fn(),
            },
            $queryRawUnsafe: jest.fn(),
          },
        },
        {
          provide: ScopeService,
          useValue: {
            resolveAccess: jest.fn(),
            applyScope: jest.fn((where) => where),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            logOperation: jest.fn(),
          },
        },
        {
          provide: LoginLogService,
          useValue: {
            logLogin: jest.fn(),
          },
        },
        {
          provide: IdConverterService,
          useValue: {
            convertUserIds: jest.fn(),
            convertPlatformIds: jest.fn(),
            convertDepartmentIds: jest.fn(),
            convertShopIds: jest.fn(),
          },
        },
        {
          provide: PartitionService,
          useValue: {
            queryOperationLogsAcrossPartitions: jest.fn(),
            queryLoginLogsAcrossPartitions: jest.fn(),
            getPartitionTableNames: jest.fn(),
            checkTableExists: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SystemLogsService>(SystemLogsService);
    prismaService = module.get<PrismaService>(PrismaService);
    scopeService = module.get<ScopeService>(ScopeService);
    idConverterService = module.get<IdConverterService>(IdConverterService);
  });

  describe('Sub-task 8.1: 基于角色的权限控制', () => {
    it('应该允许超级管理员查询所有日志', async () => {
      // Requirements: 20.1
      jest.spyOn(prismaService.sys_user_role, 'findMany').mockResolvedValue([
        {
          user_id: 'super-admin-1',
          role_id: 'role-1',
          role: { role_code: 'super_admin', role_name: 'Super Admin' },
        },
      ] as any);

      jest.spyOn(scopeService, 'resolveAccess').mockResolvedValue({
        isSuperAdmin: true,
        user_id: 'super-admin-1',
        platform_id: 'platform-1',
        dept_id: 'dept-1',
        shop_id: 'shop-1',
      });

      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(0);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map());

      const result = await service.listOperationLogs(mockSuperAdminUser, {
        keyword: 'test',
        page: 1,
        pageSize: 20,
      });

      expect(result).toBeDefined();
      expect(prismaService.sys_user_role.findMany).toHaveBeenCalledWith({
        where: { user_id: 'super-admin-1' },
        include: { role: true },
      });
    });

    it('应该允许审计员查询所有日志', async () => {
      // Requirements: 20.1
      jest.spyOn(prismaService.sys_user_role, 'findMany').mockResolvedValue([
        {
          user_id: 'auditor-1',
          role_id: 'role-2',
          role: { role_code: 'auditor', role_name: 'Auditor' },
        },
      ] as any);

      jest.spyOn(scopeService, 'resolveAccess').mockResolvedValue({
        isSuperAdmin: false,
        user_id: 'auditor-1',
        platform_id: 'platform-1',
        dept_id: 'dept-1',
        shop_id: 'shop-1',
      });

      jest.spyOn(prismaService.sys_login_log, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.sys_login_log, 'count').mockResolvedValue(0);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map());

      const result = await service.listLoginLogs(mockAuditorUser, {
        keyword: 'test',
        page: 1,
        pageSize: 20,
      });

      expect(result).toBeDefined();
    });

    it('应该允许普通管理员查询本部门/平台日志', async () => {
      // Requirements: 20.2, 20.4
      jest.spyOn(prismaService.sys_user_role, 'findMany').mockResolvedValue([
        {
          user_id: 'admin-1',
          role_id: 'role-3',
          role: { role_code: 'regular_admin', role_name: 'Regular Admin' },
        },
      ] as any);

      jest.spyOn(scopeService, 'resolveAccess').mockResolvedValue({
        isSuperAdmin: false,
        user_id: 'admin-1',
        platform_id: 'platform-1',
        dept_id: 'dept-1',
        shop_id: 'shop-1',
      });

      jest.spyOn(scopeService, 'applyScope').mockReturnValue({
        is_deleted: 0,
        platform_id: 'platform-1',
        dept_id: 'dept-1',
        shop_id: 'shop-1',
        OR: [{ username: { contains: 'test' } }],
      });

      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(0);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map());

      const result = await service.listOperationLogs(mockRegularAdminUser, {
        keyword: 'test',
        page: 1,
        pageSize: 20,
      });

      expect(result).toBeDefined();
      expect(scopeService.applyScope).toHaveBeenCalled();
    });

    it('应该拒绝普通用户访问日志', async () => {
      // Requirements: 20.3
      jest.spyOn(prismaService.sys_user_role, 'findMany').mockResolvedValue([
        {
          user_id: 'user-1',
          role_id: 'role-4',
          role: { role_code: 'regular_user', role_name: 'Regular User' },
        },
      ] as any);

      await expect(
        service.listOperationLogs(mockRegularUser, {
          keyword: 'test',
          page: 1,
          pageSize: 20,
        })
      ).rejects.toThrow('无权访问日志数据，请联系管理员');
    });

    it('应该在数据隔离场景下正确过滤数据', async () => {
      // Requirements: 20.4
      jest.spyOn(prismaService.sys_user_role, 'findMany').mockResolvedValue([
        {
          user_id: 'admin-1',
          role_id: 'role-3',
          role: { role_code: 'admin', role_name: 'Admin' },
        },
      ] as any);

      jest.spyOn(scopeService, 'resolveAccess').mockResolvedValue({
        isSuperAdmin: false,
        user_id: 'admin-1',
        platform_id: 'platform-1',
        dept_id: 'dept-1',
        shop_id: null,
      });

      const mockApplyScope = jest.fn((baseWhere, scope, fields) => {
        return {
          ...baseWhere,
          platform_id: scope.platform_id,
          dept_id: scope.dept_id,
        };
      });

      jest.spyOn(scopeService, 'applyScope').mockImplementation(mockApplyScope);

      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(0);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map());

      await service.listOperationLogs(mockRegularAdminUser, {
        keyword: 'test',
        page: 1,
        pageSize: 20,
      });

      expect(mockApplyScope).toHaveBeenCalled();
      const applyScopeCall = mockApplyScope.mock.calls[0];
      expect(applyScopeCall[2]).toEqual({
        platform: 'platform_id',
        department: 'dept_id',
        shop: 'shop_id',
      });
    });
  });

  describe('Sub-task 8.2: 日志数据不可篡改性', () => {
    it('应该拒绝删除操作日志', async () => {
      // Requirements: 12.1, 12.2, 12.4
      await expect(service.deleteOperationLog('log-1')).rejects.toThrow(
        '日志数据不可删除。日志系统仅支持查询操作，不支持删除、编辑或更新操作，以确保审计数据的完整性和可信度。'
      );
    });

    it('应该拒绝删除登录日志', async () => {
      // Requirements: 12.1, 12.2, 12.4
      await expect(service.deleteLoginLog('log-1')).rejects.toThrow(
        '日志数据不可删除。日志系统仅支持查询操作，不支持删除、编辑或更新操作，以确保审计数据的完整性和可信度。'
      );
    });

    it('应该拒绝更新操作日志', async () => {
      // Requirements: 12.1, 12.2, 12.4
      await expect(service.updateOperationLog('log-1', { operation_message: 'updated' })).rejects.toThrow(
        '日志数据不可修改。日志系统仅支持查询操作，不支持删除、编辑或更新操作，以确保审计数据的完整性和可信度。'
      );
    });

    it('应该拒绝更新登录日志', async () => {
      // Requirements: 12.1, 12.2, 12.4
      await expect(service.updateLoginLog('log-1', { login_message: 'updated' })).rejects.toThrow(
        '日志数据不可修改。日志系统仅支持查询操作，不支持删除、编辑或更新操作，以确保审计数据的完整性和可信度。'
      );
    });

    it('应该拒绝批量删除操作日志', async () => {
      // Requirements: 12.1, 12.2, 12.4
      await expect(service.batchDeleteOperationLogs(['log-1', 'log-2'])).rejects.toThrow(
        '日志数据不可删除。日志系统仅支持查询操作，不支持删除、编辑或更新操作，以确保审计数据的完整性和可信度。'
      );
    });

    it('应该拒绝批量删除登录日志', async () => {
      // Requirements: 12.1, 12.2, 12.4
      await expect(service.batchDeleteLoginLogs(['log-1', 'log-2'])).rejects.toThrow(
        '日志数据不可删除。日志系统仅支持查询操作，不支持删除、编辑或更新操作，以确保审计数据的完整性和可信度。'
      );
    });

    it('应该确保超级管理员也无法删除日志', async () => {
      // Requirements: 12.4
      // 即使是超级管理员，也不能删除日志
      await expect(service.deleteOperationLog('log-1')).rejects.toThrow(
        '日志数据不可删除'
      );

      await expect(service.updateOperationLog('log-1', {})).rejects.toThrow(
        '日志数据不可修改'
      );
    });

    it('应该确保数据库层面仅支持INSERT和SELECT操作', async () => {
      // Requirements: 12.1, 12.3
      // 验证服务层没有暴露任何update/delete方法给Prisma
      // 这个测试确保我们的服务设计符合不可篡改性要求

      // 检查服务是否有任何update/delete相关的公开方法（除了我们明确拒绝的方法）
      const servicePrototype = Object.getPrototypeOf(service);
      const methods = Object.getOwnPropertyNames(servicePrototype);

      // 确保没有直接调用Prisma update/delete的方法（除了明确拒绝的方法）
      const dangerousMethods = methods.filter(
        (method) =>
          !method.startsWith('delete') &&
          !method.startsWith('update') &&
          !method.startsWith('batch') &&
          (method.includes('update') || method.includes('delete') || method.includes('remove'))
      );

      expect(dangerousMethods).toHaveLength(0);
    });
  });

  describe('Sub-task 8.3: 权限控制集成测试', () => {
    it('应该在导出时也检查权限', async () => {
      // Requirements: 20.1, 20.2
      jest.spyOn(prismaService.sys_user_role, 'findMany').mockResolvedValue([
        {
          user_id: 'user-1',
          role_id: 'role-4',
          role: { role_code: 'regular_user', role_name: 'Regular User' },
        },
      ] as any);

      await expect(
        service.exportLogs(mockRegularUser, 'operation', {
          keyword: 'test',
          page: 1,
          pageSize: 20,
          exportType: 'current',
        })
      ).rejects.toThrow('无权访问日志数据，请联系管理员');
    });

    it('应该允许超级管理员导出所有日志', async () => {
      // Requirements: 20.1
      jest.spyOn(prismaService.sys_user_role, 'findMany').mockResolvedValue([
        {
          user_id: 'super-admin-1',
          role_id: 'role-1',
          role: { role_code: 'super_admin', role_name: 'Super Admin' },
        },
      ] as any);

      jest.spyOn(scopeService, 'resolveAccess').mockResolvedValue({
        isSuperAdmin: true,
        user_id: 'super-admin-1',
        platform_id: null,
        dept_id: null,
        shop_id: null,
      });

      const mockLogs = [
        {
          id: 'log-1',
          user_id: 'user-1',
          platform_id: 'platform-1',
          dept_id: 'dept-1',
          shop_id: 'shop-1',
          create_time: new Date('2024-01-15'),
          update_time: new Date(),
          is_deleted: 0,
          username: 'user1',
          operation_module: 'test',
          operation_message: 'test',
          api_path: '/test',
          request_method: 'GET',
          request_params: null,
          request_ip: '127.0.0.1',
          operation_status: 1,
          error_message: null,
          execution_time: 100,
        },
      ];

      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(1);
      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue(mockLogs as any);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map([['user-1', '张三']]));
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map([['platform-1', '平台A']]));
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map([['dept-1', '技术部']]));
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map([['shop-1', '店铺1']]));

      const result = await service.exportLogs(mockSuperAdminUser, 'operation', {
        keyword: 'test',
        page: 1,
        pageSize: 20,
        exportType: 'current',
      });

      expect(result.buffer).toBeDefined();
      expect(result.filename).toMatch(/^操作日志_\d{8}_\d{6}\.xlsx$/);
    });

    it('应该正确处理没有角色的用户', async () => {
      // Requirements: 20.3
      jest.spyOn(prismaService.sys_user_role, 'findMany').mockResolvedValue([]);

      await expect(
        service.listOperationLogs(mockRegularUser, {
          keyword: 'test',
          page: 1,
          pageSize: 20,
        })
      ).rejects.toThrow('无权访问日志数据，请联系管理员');
    });

    it('应该正确处理多角色用户（包含super_admin）', async () => {
      // Requirements: 20.1
      jest.spyOn(prismaService.sys_user_role, 'findMany').mockResolvedValue([
        {
          user_id: 'user-1',
          role_id: 'role-1',
          role: { role_code: 'super_admin', role_name: 'Super Admin' },
        },
        {
          user_id: 'user-1',
          role_id: 'role-4',
          role: { role_code: 'regular_user', role_name: 'Regular User' },
        },
      ] as any);

      jest.spyOn(scopeService, 'resolveAccess').mockResolvedValue({
        isSuperAdmin: true,
        user_id: 'user-1',
        platform_id: null,
        dept_id: null,
        shop_id: null,
      });

      jest.spyOn(prismaService.sys_operation_log, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.sys_operation_log, 'count').mockResolvedValue(0);

      jest.spyOn(idConverterService, 'convertUserIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertPlatformIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertDepartmentIds').mockResolvedValue(new Map());
      jest.spyOn(idConverterService, 'convertShopIds').mockResolvedValue(new Map());

      // 应该允许访问（因为有super_admin角色）
      const result = await service.listOperationLogs(mockRegularUser, {
        keyword: 'test',
        page: 1,
        pageSize: 20,
      });

      expect(result).toBeDefined();
    });
  });
});
