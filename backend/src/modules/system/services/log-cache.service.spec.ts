import { Test, TestingModule } from '@nestjs/testing';
import { LogCacheService } from './log-cache.service';
import { PrismaService } from '../../../prisma/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

/**
 * 日志缓存服务单元测试
 * Requirements: 19.1, 19.2, 19.3
 *
 * 测试场景:
 * 1. 数据库断连场景
 * 2. 本地缓存写入
 * 3. 恢复后同步逻辑
 * 4. 零丢失保证
 */

describe('LogCacheService', () => {
  let service: LogCacheService;
  let prismaService: PrismaService;

  const CACHE_DIR = path.join(process.cwd(), 'log-cache');
  const LOGIN_LOG_CACHE_FILE = path.join(CACHE_DIR, 'login-logs.jsonl');
  const OPERATION_LOG_CACHE_FILE = path.join(CACHE_DIR, 'operation-logs.jsonl');

  // Mock Prisma Service
  const mockPrismaService = {
    $queryRaw: jest.fn(),
    sys_login_log: {
      create: jest.fn(),
    },
    sys_operation_log: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    // 清理缓存目录
    await cleanupCacheDirectory();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogCacheService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LogCacheService>(LogCacheService);
    prismaService = module.get<PrismaService>(PrismaService);

    // 初始化服务 (调用 onModuleInit)
    await service.onModuleInit();

    // 重置所有 mock
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // 清理缓存目录
    await cleanupCacheDirectory();
  });

  /**
   * 清理缓存目录
   */
  async function cleanupCacheDirectory() {
    try {
      if (existsSync(CACHE_DIR)) {
        const files = await fs.readdir(CACHE_DIR);
        for (const file of files) {
          await fs.unlink(path.join(CACHE_DIR, file));
        }
        await fs.rmdir(CACHE_DIR);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  describe('数据库连接健康检查', () => {
    /**
     * Requirements: 19.1
     * 测试数据库连接正常场景
     */
    it('should detect healthy database connection', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const isHealthy = await service.checkDatabaseHealth();

      expect(isHealthy).toBe(true);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    /**
     * Requirements: 19.1
     * 测试数据库连接失败场景
     */
    it('should detect database connection failure', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Connection refused'));

      const isHealthy = await service.checkDatabaseHealth();

      expect(isHealthy).toBe(false);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    /**
     * Requirements: 19.1, 19.2
     * 测试数据库恢复后触发同步
     */
    it('should trigger sync when database recovers', async () => {
      // 模拟数据库断连
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Connection refused'));
      await service.checkDatabaseHealth();

      // 模拟数据库恢复
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      // Spy on syncCachedLogs
      const syncSpy = jest.spyOn(service, 'syncCachedLogs');

      await service.checkDatabaseHealth();

      expect(syncSpy).toHaveBeenCalled();
    });
  });

  describe('本地缓存写入', () => {
    /**
     * Requirements: 19.1
     * 测试登录日志缓存到文件系统
     */
    it('should cache login log to file system', async () => {
      const loginLog = {
        user_id: 'user-123',
        username: 'testuser',
        login_ip: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        login_status: 1,
        login_message: 'Login successful',
        platform_id: 'platform-1',
        dept_id: null,
        shop_id: null,
      };

      await service.cacheLoginLog(loginLog);

      // 验证文件是否创建
      expect(existsSync(LOGIN_LOG_CACHE_FILE)).toBe(true);

      // 验证文件内容
      const content = await fs.readFile(LOGIN_LOG_CACHE_FILE, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(1);

      const cachedLog = JSON.parse(lines[0]);
      expect(cachedLog.username).toBe('testuser');
      expect(cachedLog.login_ip).toBe('192.168.1.1');
      expect(cachedLog.cached_at).toBeDefined();
    });

    /**
     * Requirements: 19.1
     * 测试操作日志缓存到文件系统
     */
    it('should cache operation log to file system', async () => {
      const operationLog = {
        user_id: 'user-123',
        username: 'testuser',
        request_method: 'POST',
        api_path: '/api/users',
        operation_module: '用户管理',
        operation_status: 1,
        operation_message: 'User created successfully',
        platform_id: 'platform-1',
        dept_id: null,
        shop_id: null,
      };

      await service.cacheOperationLog(operationLog);

      // 验证文件是否创建
      expect(existsSync(OPERATION_LOG_CACHE_FILE)).toBe(true);

      // 验证文件内容
      const content = await fs.readFile(OPERATION_LOG_CACHE_FILE, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(1);

      const cachedLog = JSON.parse(lines[0]);
      expect(cachedLog.username).toBe('testuser');
      expect(cachedLog.api_path).toBe('/api/users');
      expect(cachedLog.cached_at).toBeDefined();
    });

    /**
     * Requirements: 19.1
     * 测试多条日志缓存
     */
    it('should cache multiple logs to file system', async () => {
      const loginLog1 = {
        username: 'user1',
        login_status: 1,
      };
      const loginLog2 = {
        username: 'user2',
        login_status: 0,
      };

      await service.cacheLoginLog(loginLog1);
      await service.cacheLoginLog(loginLog2);

      const content = await fs.readFile(LOGIN_LOG_CACHE_FILE, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(2);
    });
  });

  describe('数据库恢复后同步', () => {
    /**
     * Requirements: 19.2, 19.3
     * 测试登录日志同步到数据库
     */
    it('should sync cached login logs to database when connection is restored', async () => {
      // 1. 缓存日志
      const loginLog = {
        user_id: 'user-123',
        username: 'testuser',
        login_ip: '192.168.1.1',
        login_status: 1,
        platform_id: 'platform-1',
      };
      await service.cacheLoginLog(loginLog);

      // 2. 模拟数据库恢复
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrismaService.sys_login_log.create.mockResolvedValue({});

      // 3. 触发同步
      await service.syncCachedLogs();

      // 4. 验证数据库写入
      expect(mockPrismaService.sys_login_log.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: 'testuser',
          login_ip: '192.168.1.1',
          login_status: 1,
        }),
      });

      // 5. 验证缓存文件已删除
      expect(existsSync(LOGIN_LOG_CACHE_FILE)).toBe(false);
    });

    /**
     * Requirements: 19.2, 19.3
     * 测试操作日志同步到数据库
     */
    it('should sync cached operation logs to database when connection is restored', async () => {
      // 1. 缓存日志
      const operationLog = {
        user_id: 'user-123',
        username: 'testuser',
        request_method: 'POST',
        api_path: '/api/users',
        operation_status: 1,
      };
      await service.cacheOperationLog(operationLog);

      // 2. 模拟数据库恢复
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrismaService.sys_operation_log.create.mockResolvedValue({});

      // 3. 触发同步
      await service.syncCachedLogs();

      // 4. 验证数据库写入
      expect(mockPrismaService.sys_operation_log.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: 'testuser',
          request_method: 'POST',
          api_path: '/api/users',
          operation_status: 1,
        }),
      });

      // 5. 验证缓存文件已删除
      expect(existsSync(OPERATION_LOG_CACHE_FILE)).toBe(false);
    });

    /**
     * Requirements: 19.2, 19.3
     * 测试同步失败时保留缓存
     */
    it('should keep cached logs when sync fails', async () => {
      // 1. 缓存日志
      const loginLog = {
        username: 'testuser',
        login_status: 1,
      };
      await service.cacheLoginLog(loginLog);

      // 2. 模拟数据库健康但写入失败
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrismaService.sys_login_log.create.mockRejectedValue(new Error('Write failed'));

      // 3. 触发同步
      await service.syncCachedLogs();

      // 4. 验证缓存文件仍然存在
      expect(existsSync(LOGIN_LOG_CACHE_FILE)).toBe(true);

      // 5. 验证缓存内容未丢失
      const content = await fs.readFile(LOGIN_LOG_CACHE_FILE, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(1);
    });

    /**
     * Requirements: 19.2, 19.3
     * 测试部分同步成功场景
     */
    it('should handle partial sync success', async () => {
      // 1. 缓存多条日志
      await service.cacheLoginLog({ username: 'user1', login_status: 1 });
      await service.cacheLoginLog({ username: 'user2', login_status: 1 });
      await service.cacheLoginLog({ username: 'user3', login_status: 1 });

      // 2. 模拟第二条写入失败
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrismaService.sys_login_log.create
        .mockResolvedValueOnce({}) // 第一条成功
        .mockRejectedValueOnce(new Error('Write failed')) // 第二条失败
        .mockResolvedValueOnce({}); // 第三条不会执行

      // 3. 触发同步
      await service.syncCachedLogs();

      // 4. 验证至少第一条被写入 (可能会有更多,因为内存队列也会同步)
      expect(mockPrismaService.sys_login_log.create).toHaveBeenCalled();

      // 5. 验证失败的日志仍在缓存中
      const content = await fs.readFile(LOGIN_LOG_CACHE_FILE, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBeGreaterThan(0); // 至少有失败的日志
    });
  });

  describe('零丢失保证', () => {
    /**
     * Requirements: 19.3
     * 测试数据库断连时日志不丢失
     */
    it('should not lose logs when database is down', async () => {
      // 1. 模拟数据库断连
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Connection refused'));

      // 2. 缓存日志
      const loginLog = {
        username: 'testuser',
        login_status: 1,
      };
      await service.cacheLoginLog(loginLog);

      // 3. 验证日志已缓存
      expect(existsSync(LOGIN_LOG_CACHE_FILE)).toBe(true);

      // 4. 模拟数据库恢复
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrismaService.sys_login_log.create.mockResolvedValue({});

      // 5. 同步日志
      await service.syncCachedLogs();

      // 6. 验证日志已写入数据库
      expect(mockPrismaService.sys_login_log.create).toHaveBeenCalled();

      // 7. 验证缓存已清空
      expect(existsSync(LOGIN_LOG_CACHE_FILE)).toBe(false);
    });

    /**
     * Requirements: 19.3
     * 测试文件系统失败时使用内存队列
     */
    it('should use memory queue when file system fails', async () => {
      // 1. Mock fs.appendFile to fail
      const originalAppendFile = fs.appendFile;
      (fs.appendFile as any) = jest.fn().mockRejectedValue(new Error('Disk full'));

      // 2. 缓存日志
      const loginLog = {
        username: 'testuser',
        login_status: 1,
      };
      await service.cacheLoginLog(loginLog);

      // 3. 获取缓存统计
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      const stats = await service.getCacheStats();

      // 4. 验证内存队列有数据
      expect(stats.memoryQueueSize.loginLogs).toBe(1);

      // 5. 恢复 fs.appendFile
      (fs.appendFile as any) = originalAppendFile;

      // 6. 模拟数据库恢复并同步
      mockPrismaService.sys_login_log.create.mockResolvedValue({});
      await service.syncCachedLogs();

      // 7. 验证内存队列中的日志已写入数据库
      expect(mockPrismaService.sys_login_log.create).toHaveBeenCalled();
    });

    /**
     * Requirements: 19.3
     * 测试并发写入场景
     */
    it('should handle concurrent log caching', async () => {
      // 1. 并发缓存多条日志
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          service.cacheLoginLog({
            username: `user${i}`,
            login_status: 1,
          })
        );
      }
      await Promise.all(promises);

      // 2. 验证所有日志都已缓存
      const content = await fs.readFile(LOGIN_LOG_CACHE_FILE, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(10);
    });

    /**
     * Requirements: 19.3
     * 测试大量日志缓存和同步
     */
    it('should handle large number of cached logs', async () => {
      // 1. 缓存大量日志
      const logCount = 100;
      for (let i = 0; i < logCount; i++) {
        await service.cacheLoginLog({
          username: `user${i}`,
          login_status: 1,
        });
      }

      // 2. 验证所有日志都已缓存
      const content = await fs.readFile(LOGIN_LOG_CACHE_FILE, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(logCount);

      // 3. 模拟数据库恢复
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrismaService.sys_login_log.create.mockResolvedValue({});

      // 4. 同步日志
      await service.syncCachedLogs();

      // 5. 验证所有日志都已写入数据库
      expect(mockPrismaService.sys_login_log.create).toHaveBeenCalledTimes(logCount);

      // 6. 验证缓存已清空
      expect(existsSync(LOGIN_LOG_CACHE_FILE)).toBe(false);
    });
  });

  describe('缓存统计', () => {
    /**
     * Requirements: 19.1
     * 测试获取缓存统计信息
     */
    it('should return cache statistics', async () => {
      // 1. 缓存一些日志
      await service.cacheLoginLog({ username: 'user1', login_status: 1 });
      await service.cacheOperationLog({
        username: 'user1',
        request_method: 'POST',
        api_path: '/api/test',
        operation_status: 1,
      });

      // 2. 模拟数据库健康
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      // 3. 获取统计信息
      const stats = await service.getCacheStats();

      // 4. 验证统计信息
      expect(stats.isDatabaseHealthy).toBe(true);
      expect(stats.lastHealthCheck).toBeInstanceOf(Date);
      expect(stats.fileSystemCacheSize.loginLogs).toBe(1);
      expect(stats.fileSystemCacheSize.operationLogs).toBe(1);
    });
  });

  describe('手动同步', () => {
    /**
     * Requirements: 19.2
     * 测试手动触发同步
     */
    it('should allow manual sync trigger', async () => {
      // 1. 缓存日志
      await service.cacheLoginLog({ username: 'testuser', login_status: 1 });

      // 2. 模拟数据库健康
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrismaService.sys_login_log.create.mockResolvedValue({});

      // 3. 手动触发同步
      await service.forceSyncCachedLogs();

      // 4. 验证同步已执行
      expect(mockPrismaService.sys_login_log.create).toHaveBeenCalled();
    });
  });
});
