import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { LogBackupService } from './log-backup.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('LogBackupService', () => {
  let service: LogBackupService;
  let prismaService: PrismaService;

  const createMockOperationLog = (id: number, createTime: Date) => ({
    id,
    create_time: createTime,
    update_time: createTime,
    is_deleted: 0,
    user_id: 1,
    username: 'testuser',
    request_method: 'POST',
    api_path: '/api/test',
    api_name: 'Test API',
    operation_module: 'test',
    request_ip: '127.0.0.1',
    user_agent: 'Mozilla/5.0',
    operation_status: 1,
    operation_message: 'success',
    request_params: {},
    response_summary: {},
    platform_id: 1,
    dept_id: 1,
    shop_id: 1,
  });

  const createMockLoginLog = (id: number, createTime: Date) => ({
    id,
    create_time: createTime,
    update_time: createTime,
    is_deleted: 0,
    user_id: 1,
    username: 'testuser',
    login_ip: '127.0.0.1',
    user_agent: 'Mozilla/5.0',
    login_status: 1,
    login_message: 'success',
    platform_id: 1,
    dept_id: 1,
    shop_id: 1,
  });

  beforeEach(async () => {
    const mockPrismaService = {
      sys_operation_log: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      sys_login_log: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      sys_operation_log_archive: {
        findMany: jest.fn(),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      sys_login_log_archive: {
        findMany: jest.fn(),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogBackupService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LogBackupService>(LogBackupService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('runDailyBackup', () => {
    it('should execute full backup pipeline successfully', async () => {
      jest.spyOn(service, 'archiveOldLogs').mockResolvedValue({ operationCount: 10, loginCount: 5 });
      jest.spyOn(service, 'performDailyBackup').mockResolvedValue({ operationCount: 3, loginCount: 2 });
      jest.spyOn(service, 'enforceRetentionPolicy').mockResolvedValue({ deletedOperationLogs: 1, deletedLoginLogs: 1 });

      await service.runDailyBackup();

      expect(service['archiveOldLogs']).toHaveBeenCalled();
      expect(service['performDailyBackup']).toHaveBeenCalled();
      expect(service['enforceRetentionPolicy']).toHaveBeenCalled();

      const status = await service.getBackupStatus();
      expect(status.lastRunSuccess).toBe(true);
      expect(status.archivedOperationLogs).toBe(10);
      expect(status.archivedLoginLogs).toBe(5);
      expect(status.lastRunMessage).toContain('10');
    });

    it('should handle errors gracefully and update status', async () => {
      const testError = new Error('Database connection failed');
      jest.spyOn(service, 'archiveOldLogs').mockRejectedValue(testError);

      await service.runDailyBackup();

      const status = await service.getBackupStatus();
      expect(status.lastRunSuccess).toBe(false);
      expect(status.lastRunMessage).toContain('Database connection failed');
    });

    it('should update lastRunAt timestamp', async () => {
      jest.useFakeTimers();
      const mockDate = new Date('2024-01-15T02:00:00Z');
      jest.setSystemTime(mockDate);

      jest.spyOn(service, 'archiveOldLogs').mockResolvedValue({ operationCount: 0, loginCount: 0 });
      jest.spyOn(service, 'performDailyBackup').mockResolvedValue({ operationCount: 0, loginCount: 0 });
      jest.spyOn(service, 'enforceRetentionPolicy').mockResolvedValue({ deletedOperationLogs: 0, deletedLoginLogs: 0 });

      await service.runDailyBackup();

      const status = await service.getBackupStatus();
      expect(status.lastRunAt).toEqual(mockDate);
    });
  });

  describe('performDailyBackup', () => {
    it('should backup todays operation and login logs', async () => {
      jest.useFakeTimers();
      const today = new Date('2024-01-15T10:30:00Z');
      jest.setSystemTime(today);

      const mockOperationLogs = [
        createMockOperationLog(1, today),
        createMockOperationLog(2, today),
      ];
      const mockLoginLogs = [
        createMockLoginLog(1, today),
      ];

      (prismaService.sys_operation_log.findMany as jest.Mock).mockResolvedValue(mockOperationLogs);
      (prismaService.sys_operation_log_archive.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.sys_operation_log_archive.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      (prismaService.sys_login_log.findMany as jest.Mock).mockResolvedValue(mockLoginLogs);
      (prismaService.sys_login_log_archive.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.sys_login_log_archive.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await service.performDailyBackup();

      expect(result.operationCount).toBe(2);
      expect(result.loginCount).toBe(1);
      expect(prismaService.sys_operation_log_archive.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ id: 1 }),
          expect.objectContaining({ id: 2 }),
        ]),
      });
    });

    it('should skip already archived logs', async () => {
      jest.useFakeTimers();
      const today = new Date('2024-01-15T10:30:00Z');
      jest.setSystemTime(today);

      const mockOperationLogs = [
        createMockOperationLog(1, today),
        createMockOperationLog(2, today),
        createMockOperationLog(3, today),
      ];

      (prismaService.sys_operation_log.findMany as jest.Mock).mockResolvedValue(mockOperationLogs);
      (prismaService.sys_operation_log_archive.findMany as jest.Mock).mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);
      (prismaService.sys_operation_log_archive.createMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prismaService.sys_login_log.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.performDailyBackup();

      expect(result.operationCount).toBe(1);
    });

    it('should handle empty result sets', async () => {
      (prismaService.sys_operation_log.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.sys_login_log.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.performDailyBackup();

      expect(result.operationCount).toBe(0);
      expect(result.loginCount).toBe(0);
      expect(prismaService.sys_operation_log_archive.createMany).not.toHaveBeenCalled();
    });
  });

  describe('archiveOldLogs', () => {
    it('should archive logs older than 365 days', async () => {
      jest.useFakeTimers();
      const today = new Date('2024-01-15T00:00:00Z');
      jest.setSystemTime(today);

      const oldDate = new Date('2022-12-01T00:00:00Z');
      const mockOldLogs = [
        createMockOperationLog(1, oldDate),
        createMockOperationLog(2, oldDate),
      ];

      (prismaService.sys_operation_log.findMany as jest.Mock).mockResolvedValueOnce(mockOldLogs).mockResolvedValueOnce([]);
      (prismaService.sys_login_log.findMany as jest.Mock).mockResolvedValue([]);

      (prismaService.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          sys_operation_log_archive: {
            findMany: jest.fn().mockResolvedValue([]),
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
          sys_operation_log: {
            deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        };
        return callback(mockTx);
      });

      const result = await service.archiveOldLogs();

      expect(result.operationCount).toBe(2);
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should not archive logs newer than 365 days', async () => {
      jest.useFakeTimers();
      const today = new Date('2024-01-15T00:00:00Z');
      jest.setSystemTime(today);

      (prismaService.sys_operation_log.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.sys_login_log.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.archiveOldLogs();

      expect(result.operationCount).toBe(0);
      expect(result.loginCount).toBe(0);
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('enforceRetentionPolicy', () => {
    it('should delete archive records older than 365 days', async () => {
      jest.useFakeTimers();
      const today = new Date('2024-01-15T00:00:00Z');
      jest.setSystemTime(today);

      (prismaService.sys_operation_log_archive.deleteMany as jest.Mock).mockResolvedValue({ count: 10 });
      (prismaService.sys_login_log_archive.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await service.enforceRetentionPolicy();

      expect(result.deletedOperationLogs).toBe(10);
      expect(result.deletedLoginLogs).toBe(5);
    });

    it('should handle zero deletions', async () => {
      (prismaService.sys_operation_log_archive.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prismaService.sys_login_log_archive.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await service.enforceRetentionPolicy();

      expect(result.deletedOperationLogs).toBe(0);
      expect(result.deletedLoginLogs).toBe(0);
    });
  });

  describe('restoreFromBackup', () => {
    it('should restore operation logs from archive', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');

      const mockArchiveLogs = [
        createMockOperationLog(1, new Date('2024-01-15T10:00:00Z')),
        createMockOperationLog(2, new Date('2024-01-20T10:00:00Z')),
      ];

      (prismaService.sys_operation_log_archive.findMany as jest.Mock)
        .mockResolvedValueOnce(mockArchiveLogs)
        .mockResolvedValueOnce([]);

      (prismaService.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          sys_operation_log: {
            findMany: jest.fn().mockResolvedValue([]),
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        };
        return callback(mockTx);
      });

      const result = await service.restoreFromBackup(startDate, endDate, 'operation');

      expect(result.restoredCount).toBe(2);
    });

    it('should throw error when startDate > endDate', async () => {
      const startDate = new Date('2024-01-31T00:00:00Z');
      const endDate = new Date('2024-01-01T00:00:00Z');

      await expect(service.restoreFromBackup(startDate, endDate, 'operation')).rejects.toThrow();
    });
  });

  describe('getBackupStatus', () => {
    it('should return correct backup status', async () => {
      (prismaService.sys_operation_log_archive.count as jest.Mock).mockResolvedValue(1000);
      (prismaService.sys_login_log_archive.count as jest.Mock).mockResolvedValue(500);

      const status = await service.getBackupStatus();

      expect(status.archiveOperationLogTotal).toBe(1000);
      expect(status.archiveLoginLogTotal).toBe(500);
      expect(status.retentionDays).toBe(365);
    });
  });
});
