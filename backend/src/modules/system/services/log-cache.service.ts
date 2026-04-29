import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

/**
 * 日志缓存服务 - 系统故障恢复机制
 * Requirements: 19.1, 19.2, 19.3
 *
 * 职责:
 * 1. 检测数据库连接状态
 * 2. 数据库故障时将日志缓存到本地文件系统
 * 3. 数据库恢复后自动同步缓存日志
 * 4. 确保日志零丢失
 */

interface CachedLoginLog {
  user_id?: string | null;
  username: string;
  login_ip?: string | null;
  user_agent?: string | null;
  login_status: number;
  login_message?: string | null;
  platform_id?: string | null;
  dept_id?: string | null;
  shop_id?: string | null;
  cached_at: number;
}

interface CachedOperationLog {
  user_id?: string | null;
  username?: string | null;
  request_method: string;
  api_path: string;
  api_name?: string | null;
  operation_module?: string | null;
  request_ip?: string | null;
  user_agent?: string | null;
  operation_status: number;
  operation_message?: string | null;
  request_params?: unknown;
  response_summary?: unknown;
  diff_content?: unknown;
  platform_id?: string | null;
  dept_id?: string | null;
  shop_id?: string | null;
  execution_time?: number;
  cached_at: number;
}

@Injectable()
export class LogCacheService implements OnModuleInit {
  private readonly logger = new Logger(LogCacheService.name);

  // 缓存目录路径
  private readonly CACHE_DIR = path.join(process.cwd(), 'log-cache');
  private readonly LOGIN_LOG_CACHE_FILE = path.join(this.CACHE_DIR, 'login-logs.jsonl');
  private readonly OPERATION_LOG_CACHE_FILE = path.join(this.CACHE_DIR, 'operation-logs.jsonl');

  // 数据库连接状态
  private isDatabaseHealthy = true;
  private lastHealthCheck = Date.now();
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30秒检查一次

  // 内存队列 (作为文件系统的备份)
  private loginLogQueue: CachedLoginLog[] = [];
  private operationLogQueue: CachedOperationLog[] = [];
  private readonly MAX_QUEUE_SIZE = 10000; // 最大内存队列大小

  // 同步状态
  private isSyncing = false;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // 初始化缓存目录
    await this.initializeCacheDirectory();

    // 启动时检查数据库连接
    await this.checkDatabaseHealth();

    // 启动时尝试同步缓存日志
    void this.syncCachedLogs();

    this.logger.log('LogCacheService initialized');
  }

  /**
   * 初始化缓存目录
   * Requirements: 19.1
   */
  private async initializeCacheDirectory(): Promise<void> {
    try {
      if (!existsSync(this.CACHE_DIR)) {
        await fs.mkdir(this.CACHE_DIR, { recursive: true });
        this.logger.log(`Cache directory created: ${this.CACHE_DIR}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create cache directory: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 检查数据库连接健康状态
   * Requirements: 19.1
   *
   * @returns true if database is healthy, false otherwise
   */
  async checkDatabaseHealth(): Promise<boolean> {
    try {
      // 执行简单查询测试数据库连接
      await this.prisma.$queryRaw`SELECT 1`;

      if (!this.isDatabaseHealthy) {
        this.logger.log('Database connection restored');
        // 数据库恢复后触发同步
        void this.syncCachedLogs();
      }

      this.isDatabaseHealthy = true;
      this.lastHealthCheck = Date.now();
      return true;
    } catch (error) {
      if (this.isDatabaseHealthy) {
        this.logger.error(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      this.isDatabaseHealthy = false;
      this.lastHealthCheck = Date.now();
      return false;
    }
  }

  /**
   * 定期检查数据库健康状态 (每30秒)
   * Requirements: 19.1, 19.2
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async periodicHealthCheck(): Promise<void> {
    await this.checkDatabaseHealth();
  }

  /**
   * 缓存登录日志到本地
   * Requirements: 19.1
   *
   * @param log 登录日志数据
   */
  async cacheLoginLog(log: Omit<CachedLoginLog, 'cached_at'>): Promise<void> {
    const cachedLog: CachedLoginLog = {
      ...log,
      cached_at: Date.now(),
    };

    try {
      // 写入文件系统
      await this.appendToFile(this.LOGIN_LOG_CACHE_FILE, cachedLog);
      this.logger.debug('Login log cached to file system');
    } catch (error) {
      this.logger.error(`Failed to cache login log to file: ${error instanceof Error ? error.message : String(error)}`);

      // 文件系统失败时使用内存队列
      if (this.loginLogQueue.length < this.MAX_QUEUE_SIZE) {
        this.loginLogQueue.push(cachedLog);
        this.logger.debug('Login log cached to memory queue');
      } else {
        this.logger.error('Memory queue full, login log may be lost');
      }
    }
  }

  /**
   * 缓存操作日志到本地
   * Requirements: 19.1
   *
   * @param log 操作日志数据
   */
  async cacheOperationLog(log: Omit<CachedOperationLog, 'cached_at'>): Promise<void> {
    const cachedLog: CachedOperationLog = {
      ...log,
      cached_at: Date.now(),
    };

    try {
      // 写入文件系统
      await this.appendToFile(this.OPERATION_LOG_CACHE_FILE, cachedLog);
      this.logger.debug('Operation log cached to file system');
    } catch (error) {
      this.logger.error(`Failed to cache operation log to file: ${error instanceof Error ? error.message : String(error)}`);

      // 文件系统失败时使用内存队列
      if (this.operationLogQueue.length < this.MAX_QUEUE_SIZE) {
        this.operationLogQueue.push(cachedLog);
        this.logger.debug('Operation log cached to memory queue');
      } else {
        this.logger.error('Memory queue full, operation log may be lost');
      }
    }
  }

  /**
   * 将日志追加到文件 (JSONL格式)
   * Requirements: 19.1
   */
  private async appendToFile(filePath: string, data: any): Promise<void> {
    // 确保目录存在
    await this.ensureCacheDirectoryExists();
    const line = JSON.stringify(data) + '\n';
    await fs.appendFile(filePath, line, 'utf-8');
  }

  /**
   * 确保缓存目录存在
   */
  private async ensureCacheDirectoryExists(): Promise<void> {
    if (!existsSync(this.CACHE_DIR)) {
      await fs.mkdir(this.CACHE_DIR, { recursive: true });
    }
  }

  /**
   * 同步缓存日志到数据库
   * Requirements: 19.2, 19.3
   *
   * 当数据库连接恢复后,自动将缓存的日志同步到数据库
   */
  async syncCachedLogs(): Promise<void> {
    // 防止并发同步
    if (this.isSyncing) {
      this.logger.debug('Sync already in progress, skipping');
      return;
    }

    // 检查数据库是否健康
    const isHealthy = await this.checkDatabaseHealth();
    if (!isHealthy) {
      this.logger.debug('Database not healthy, skipping sync');
      return;
    }

    this.isSyncing = true;
    this.logger.log('Starting cached logs synchronization');

    try {
      // 同步登录日志
      await this.syncLoginLogs();

      // 同步操作日志
      await this.syncOperationLogs();

      this.logger.log('Cached logs synchronization completed successfully');
    } catch (error) {
      this.logger.error(`Failed to sync cached logs: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * 同步登录日志
   * Requirements: 19.2, 19.3
   */
  private async syncLoginLogs(): Promise<void> {
    let syncedCount = 0;
    let failedCount = 0;

    // 1. 同步内存队列中的日志
    while (this.loginLogQueue.length > 0) {
      const log = this.loginLogQueue.shift();
      if (!log) break;

      try {
        await this.writeLoginLogToDatabase(log);
        syncedCount++;
      } catch (error) {
        this.logger.error(`Failed to sync login log from memory: ${error instanceof Error ? error.message : String(error)}`);
        // 写入失败,重新放回队列
        this.loginLogQueue.unshift(log);
        failedCount++;
        break; // 停止同步,等待下次重试
      }
    }

    // 2. 同步文件系统中的日志
    if (existsSync(this.LOGIN_LOG_CACHE_FILE)) {
      try {
        const content = await fs.readFile(this.LOGIN_LOG_CACHE_FILE, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());

        const tempFile = this.LOGIN_LOG_CACHE_FILE + '.tmp';
        const failedLogs: string[] = [];

        for (const line of lines) {
          try {
            const log: CachedLoginLog = JSON.parse(line);
            await this.writeLoginLogToDatabase(log);
            syncedCount++;
          } catch (error) {
            this.logger.error(`Failed to sync login log from file: ${error instanceof Error ? error.message : String(error)}`);
            failedLogs.push(line);
            failedCount++;
          }
        }

        // 如果有失败的日志,保留到临时文件
        if (failedLogs.length > 0) {
          await fs.writeFile(tempFile, failedLogs.join('\n') + '\n', 'utf-8');
          await fs.rename(tempFile, this.LOGIN_LOG_CACHE_FILE);
        } else {
          // 所有日志同步成功,删除缓存文件
          await fs.unlink(this.LOGIN_LOG_CACHE_FILE);
        }
      } catch (error) {
        this.logger.error(`Failed to process login log cache file: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (syncedCount > 0 || failedCount > 0) {
      this.logger.log(`Login logs sync: ${syncedCount} succeeded, ${failedCount} failed`);
    }
  }

  /**
   * 同步操作日志
   * Requirements: 19.2, 19.3
   */
  private async syncOperationLogs(): Promise<void> {
    let syncedCount = 0;
    let failedCount = 0;

    // 1. 同步内存队列中的日志
    while (this.operationLogQueue.length > 0) {
      const log = this.operationLogQueue.shift();
      if (!log) break;

      try {
        await this.writeOperationLogToDatabase(log);
        syncedCount++;
      } catch (error) {
        this.logger.error(`Failed to sync operation log from memory: ${error instanceof Error ? error.message : String(error)}`);
        // 写入失败,重新放回队列
        this.operationLogQueue.unshift(log);
        failedCount++;
        break; // 停止同步,等待下次重试
      }
    }

    // 2. 同步文件系统中的日志
    if (existsSync(this.OPERATION_LOG_CACHE_FILE)) {
      try {
        const content = await fs.readFile(this.OPERATION_LOG_CACHE_FILE, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());

        const tempFile = this.OPERATION_LOG_CACHE_FILE + '.tmp';
        const failedLogs: string[] = [];

        for (const line of lines) {
          try {
            const log: CachedOperationLog = JSON.parse(line);
            await this.writeOperationLogToDatabase(log);
            syncedCount++;
          } catch (error) {
            this.logger.error(`Failed to sync operation log from file: ${error instanceof Error ? error.message : String(error)}`);
            failedLogs.push(line);
            failedCount++;
          }
        }

        // 如果有失败的日志,保留到临时文件
        if (failedLogs.length > 0) {
          await fs.writeFile(tempFile, failedLogs.join('\n') + '\n', 'utf-8');
          await fs.rename(tempFile, this.OPERATION_LOG_CACHE_FILE);
        } else {
          // 所有日志同步成功,删除缓存文件
          await fs.unlink(this.OPERATION_LOG_CACHE_FILE);
        }
      } catch (error) {
        this.logger.error(`Failed to process operation log cache file: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (syncedCount > 0 || failedCount > 0) {
      this.logger.log(`Operation logs sync: ${syncedCount} succeeded, ${failedCount} failed`);
    }
  }

  /**
   * 写入登录日志到数据库
   * Requirements: 19.2, 19.3
   */
  private async writeLoginLogToDatabase(log: CachedLoginLog): Promise<void> {
    await this.prisma.sys_login_log.create({
      data: {
        user_id: log.user_id ?? undefined,
        username: log.username,
        login_ip: log.login_ip ?? undefined,
        user_agent: log.user_agent ?? undefined,
        login_status: log.login_status,
        login_message: log.login_message ?? undefined,
        platform_id: log.platform_id ?? undefined,
        dept_id: log.dept_id ?? undefined,
        shop_id: log.shop_id ?? undefined,
      },
    });
  }

  /**
   * 写入操作日志到数据库
   * Requirements: 19.2, 19.3
   */
  private async writeOperationLogToDatabase(log: CachedOperationLog): Promise<void> {
    await this.prisma.sys_operation_log.create({
      data: {
        user_id: log.user_id ?? undefined,
        username: log.username ?? undefined,
        request_method: log.request_method,
        api_path: log.api_path,
        api_name: log.api_name ?? undefined,
        operation_module: log.operation_module ?? undefined,
        request_ip: log.request_ip ?? undefined,
        user_agent: log.user_agent ?? undefined,
        operation_status: log.operation_status,
        operation_message: log.operation_message ?? undefined,
        request_params: log.request_params as any,
        response_summary: log.response_summary as any,
        diff_content: log.diff_content as any,
        platform_id: log.platform_id ?? undefined,
        dept_id: log.dept_id ?? undefined,
        shop_id: log.shop_id ?? undefined,
        execution_time: log.execution_time ?? undefined,
      },
    });
  }

  /**
   * 获取缓存统计信息
   * Requirements: 19.1
   */
  async getCacheStats(): Promise<{
    isDatabaseHealthy: boolean;
    lastHealthCheck: Date;
    memoryQueueSize: {
      loginLogs: number;
      operationLogs: number;
    };
    fileSystemCacheSize: {
      loginLogs: number;
      operationLogs: number;
    };
  }> {
    let loginLogFileCount = 0;
    let operationLogFileCount = 0;

    // 统计文件系统缓存数量
    try {
      if (existsSync(this.LOGIN_LOG_CACHE_FILE)) {
        const content = await fs.readFile(this.LOGIN_LOG_CACHE_FILE, 'utf-8');
        loginLogFileCount = content.trim().split('\n').filter(line => line.trim()).length;
      }
    } catch (error) {
      this.logger.error(`Failed to read login log cache file: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      if (existsSync(this.OPERATION_LOG_CACHE_FILE)) {
        const content = await fs.readFile(this.OPERATION_LOG_CACHE_FILE, 'utf-8');
        operationLogFileCount = content.trim().split('\n').filter(line => line.trim()).length;
      }
    } catch (error) {
      this.logger.error(`Failed to read operation log cache file: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isDatabaseHealthy: this.isDatabaseHealthy,
      lastHealthCheck: new Date(this.lastHealthCheck),
      memoryQueueSize: {
        loginLogs: this.loginLogQueue.length,
        operationLogs: this.operationLogQueue.length,
      },
      fileSystemCacheSize: {
        loginLogs: loginLogFileCount,
        operationLogs: operationLogFileCount,
      },
    };
  }

  /**
   * 手动触发同步 (用于测试或管理)
   * Requirements: 19.2
   */
  async forceSyncCachedLogs(): Promise<void> {
    this.logger.log('Manual sync triggered');
    await this.syncCachedLogs();
  }
}
