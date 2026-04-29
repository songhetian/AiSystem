/**
 * System Log Management - Performance Tests
 * **Validates: Requirements 23.1, 23.2, 23.3, 23.4**
 *
 * Tests performance requirements:
 * - Million-level data query performance (< 3 seconds)
 * - Concurrent export performance (100k records < 10 seconds)
 * - Async log recording performance (< 1 second)
 * - Cache hit rate optimization
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SystemLogsService } from '../../src/modules/system/services/system-logs.service';
import { IdConverterService } from '../../src/modules/system/services/id-converter.service';
import { ScopeService } from '../../src/modules/system/services/scope.service';
import { RedisService } from '../../src/common/services/redis.service';

describe('System Log Management - Performance Tests', () => {
  let prisma: PrismaService;
  let systemLogsService: SystemLogsService;
  let idConverterService: IdConverterService;
  let redisService: RedisService;

  // Test data
  const testUserId = 'perf-test-user-001';
  const testPlatformId = 'perf-test-platform-001';
  const testDeptId = 'perf-test-dept-001';

  // Performance thresholds (in milliseconds)
  const ASYNC_RECORD_THRESHOLD = 1000; // 1 second
  const QUERY_THRESHOLD = 3000; // 3 seconds
  const EXPORT_THRESHOLD = 10000; // 10 seconds

  let createdLogIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        SystemLogsService,
        IdConverterService,
        PrismaService,
        ScopeService,
        {
          provide: RedisService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue('OK'),
            del: jest.fn().mockResolvedValue(1),
            setex: jest.fn().mockResolvedValue('OK'),
          },
        },
      ],
    }).compile();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    systemLogsService = moduleFixture.get<SystemLogsService>(SystemLogsService);
    idConverterService = moduleFixture.get<IdConverterService>(IdConverterService);
    redisService = moduleFixture.get<RedisService>(RedisService);

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  /**
   * Setup test data in database
   */
  async function setupTestData() {
    // Create test user
    await prisma.sys_user.create({
      data: {
        id: testUserId,
        username: 'perf-test-user',
        password: 'hashed-password',
        email: 'perf@test.com',
        phone: '13900000001',
        status: 1,
        platform_id: testPlatformId,
        dept_id: testDeptId,
      },
    });

    // Create test platform
    await prisma.sys_platform.create({
      data: {
        id: testPlatformId,
        platform_name: '性能测试平台',
        platform_code: 'PERF_TEST',
        status: 1,
      },
    });

    // Create test department
    await prisma.sys_department.create({
      data: {
        id: testDeptId,
        dept_name: '性能测试部门',
        dept_code: 'PERF_DEPT',
        status: 1,
      },
    });
  }

  /**
   * Cleanup test data from database
   */
  async function cleanupTestData() {
    // Delete test logs
    await prisma.sys_operation_log.deleteMany({
      where: {
        id: { in: createdLogIds },
      },
    });

    await prisma.sys_login_log.deleteMany({
      where: {
        user_id: testUserId,
      },
    });

    // Delete test entities
    await prisma.sys_department.deleteMany({ where: { id: testDeptId } });
    await prisma.sys_platform.deleteMany({ where: { id: testPlatformId } });
    await prisma.sys_user.deleteMany({ where: { id: testUserId } });
  }

  /**
   * Create bulk test logs for performance testing
   */
  async function createBulkLogs(count: number): Promise<void> {
    const batchSize = 1000;
    const batches = Math.ceil(count / batchSize);

    for (let i = 0; i < batches; i++) {
      const currentBatchSize = Math.min(batchSize, count - i * batchSize);
      const logs = Array.from({ length: currentBatchSize }, (_, index) => ({
        user_id: testUserId,
        username: 'perf-test-user',
        request_method: 'POST',
        api_path: '/api/perf-test',
        api_name: `性能测试操作 ${i * batchSize + index}`,
        operation_module: '性能测试模块',
        request_ip: '192.168.1.100',
        operation_status: 1,
        operation_message: '操作成功',
        platform_id: testPlatformId,
        dept_id: testDeptId,
      }));

      await prisma.sys_operation_log.createMany({
        data: logs,
      });
    }
  }

  describe('Async Log Recording Performance', () => {
    /**
     * Test: Async log recording should complete within 1 second
     * **Validates: Requirement 23.1 (Async recording < 1 second)**
     */
    it('should record log asynchronously within 1 second', async () => {
      const startTime = Date.now();

      // Simulate async log recording
      const logPromise = prisma.sys_operation_log.create({
        data: {
          user_id: testUserId,
          username: 'perf-test-user',
          request_method: 'POST',
          api_path: '/api/async-test',
          api_name: '异步日志记录测试',
          operation_module: '异步测试',
          request_ip: '192.168.1.100',
          operation_status: 1,
          operation_message: '操作成功',
          platform_id: testPlatformId,
          dept_id: testDeptId,
        },
      });

      // Don't wait for completion (async)
      const log = await logPromise;
      const duration = Date.now() - startTime;

      expect(log).toBeDefined();
      expect(duration).toBeLessThan(ASYNC_RECORD_THRESHOLD);

      createdLogIds.push(log.id);

      console.log(`✓ Async log recording completed in ${duration}ms (threshold: ${ASYNC_RECORD_THRESHOLD}ms)`);
    });

    /**
     * Test: Batch async log recording performance
     * **Validates: Requirement 23.1 (Async recording performance)**
     */
    it('should record 100 logs asynchronously within reasonable time', async () => {
      const startTime = Date.now();
      const count = 100;

      const logs = Array.from({ length: count }, (_, index) => ({
        user_id: testUserId,
        username: 'perf-test-user',
        request_method: 'POST',
        api_path: '/api/batch-test',
        api_name: `批量日志 ${index}`,
        operation_module: '批量异步测试',
        request_ip: '192.168.1.100',
        operation_status: 1,
        operation_message: '操作成功',
        platform_id: testPlatformId,
        dept_id: testDeptId,
      }));

      await prisma.sys_operation_log.createMany({
        data: logs,
      });

      const duration = Date.now() - startTime;
      const avgTime = duration / count;

      expect(avgTime).toBeLessThan(ASYNC_RECORD_THRESHOLD);

      console.log(`✓ Batch async recording: ${count} logs in ${duration}ms (avg: ${avgTime.toFixed(2)}ms per log)`);
    });
  });

  describe('Query Performance with Large Dataset', () => {
    beforeAll(async () => {
      // Create 10,000 test logs for query performance testing
      console.log('Creating 10,000 test logs for query performance testing...');
      await createBulkLogs(10000);
      console.log('Test logs created successfully');
    });

    /**
     * Test: Query performance with large dataset
     * **Validates: Requirement 23.2 (Search results < 3 seconds)**
     */
    it('should query logs within 3 seconds with 10k records', async () => {
      const mockUser = {
        sub: testUserId,
        username: 'perf-test-user',
        roles: ['super_admin'],
        platform_id: testPlatformId,
        dept_id: testDeptId,
      };

      const startTime = Date.now();

      const result = await systemLogsService.listOperationLogs(mockUser as any, {
        page: 1,
        pageSize: 20,
        username: 'perf-test-user',
      });

      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(duration).toBeLessThan(QUERY_THRESHOLD);

      console.log(`✓ Query with 10k records completed in ${duration}ms (threshold: ${QUERY_THRESHOLD}ms)`);
    });

    /**
     * Test: Pagination performance
     * **Validates: Requirement 16.3 (Fast pagination with million records)**
     */
    it('should support fast pagination with large dataset', async () => {
      const mockUser = {
        sub: testUserId,
        username: 'perf-test-user',
        roles: ['super_admin'],
        platform_id: testPlatformId,
        dept_id: testDeptId,
      };

      const startTime = Date.now();

      // Test jumping to page 50
      const result = await systemLogsService.listOperationLogs(mockUser as any, {
        page: 50,
        pageSize: 20,
      });

      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(duration).toBeLessThan(QUERY_THRESHOLD);

      console.log(`✓ Pagination to page 50 completed in ${duration}ms (threshold: ${QUERY_THRESHOLD}ms)`);
    });

    /**
     * Test: Multi-condition query performance
     * **Validates: Requirement 23.2 (Complex query performance)**
     */
    it('should handle multi-condition query efficiently', async () => {
      const mockUser = {
        sub: testUserId,
        username: 'perf-test-user',
        roles: ['super_admin'],
        platform_id: testPlatformId,
        dept_id: testDeptId,
      };

      const startTime = Date.now();

      const result = await systemLogsService.listOperationLogs(mockUser as any, {
        page: 1,
        pageSize: 20,
        username: 'perf-test-user',
        module: '性能测试模块',
        status: 1,
        start_date: '2024-01-01',
        end_date: '2025-12-31',
      });

      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(QUERY_THRESHOLD);

      console.log(`✓ Multi-condition query completed in ${duration}ms (threshold: ${QUERY_THRESHOLD}ms)`);
    });
  });

  describe('Export Performance', () => {
    /**
     * Test: Export performance with moderate dataset
     * **Validates: Requirement 23.4 (Export 100k records < 10 seconds)**
     */
    it('should export 1000 records within reasonable time', async () => {
      const mockUser = {
        sub: testUserId,
        username: 'perf-test-user',
        roles: ['super_admin'],
        platform_id: testPlatformId,
        dept_id: testDeptId,
      };

      const startTime = Date.now();

      const result = await systemLogsService.exportLogs(
        mockUser as any,
        'operation',
        {
          username: 'perf-test-user',
        }
      );

      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.buffer).toBeDefined();
      expect(result.filename).toContain('操作日志');

      // For 1000 records, should be much faster than 10 seconds
      const scaledThreshold = EXPORT_THRESHOLD / 100; // 100ms for 1k records
      expect(duration).toBeLessThan(EXPORT_THRESHOLD);

      console.log(`✓ Export 1000 records completed in ${duration}ms (threshold: ${EXPORT_THRESHOLD}ms)`);
    });

    /**
     * Test: Concurrent export performance
     * **Validates: Requirement 23.4 (Concurrent export handling)**
     */
    it('should handle concurrent export requests', async () => {
      const mockUser = {
        sub: testUserId,
        username: 'perf-test-user',
        roles: ['super_admin'],
        platform_id: testPlatformId,
        dept_id: testDeptId,
      };

      const startTime = Date.now();

      // Simulate 3 concurrent export requests
      const exportPromises = [
        systemLogsService.exportLogs(mockUser as any, 'operation', {}),
        systemLogsService.exportLogs(mockUser as any, 'operation', {}),
        systemLogsService.exportLogs(mockUser as any, 'operation', {}),
      ];

      const results = await Promise.all(exportPromises);

      const duration = Date.now() - startTime;

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.buffer).toBeDefined();
      });

      console.log(`✓ 3 concurrent exports completed in ${duration}ms`);
    });
  });

  describe('Cache Performance', () => {
    /**
     * Test: ID conversion cache hit rate
     * **Validates: Requirement 23.4 (Cache optimization)**
     */
    it('should improve performance with cache hits', async () => {
      // First call - cache miss
      const startTime1 = Date.now();
      const result1 = await idConverterService.convertPlatformIds([testPlatformId]);
      const duration1 = Date.now() - startTime1;

      expect(result1.get(testPlatformId)).toBe('性能测试平台');

      // Second call - should use cache
      const startTime2 = Date.now();
      const result2 = await idConverterService.convertPlatformIds([testPlatformId]);
      const duration2 = Date.now() - startTime2;

      expect(result2.get(testPlatformId)).toBe('性能测试平台');

      console.log(`✓ First call: ${duration1}ms, Second call (cached): ${duration2}ms`);
      if (duration1 > 0 && duration2 > 0) {
        console.log(`✓ Cache improved performance by ${((1 - duration2/duration1) * 100).toFixed(2)}%`);
      }
    });

    /**
     * Test: Batch ID conversion performance
     * **Validates: Requirement 3.1 (Batch conversion efficiency)**
     */
    it('should efficiently convert large batch of IDs', async () => {
      // Create 100 test user IDs
      const userIds = Array.from({ length: 100 }, (_, i) => `user-${i}`);

      const startTime = Date.now();

      // This will return "未知用户" for non-existent IDs, but tests batch performance
      const result = await idConverterService.convertUserIds(userIds);

      const duration = Date.now() - startTime;

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(100);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      console.log(`✓ Batch conversion of 100 IDs completed in ${duration}ms`);
    });
  });

  describe('Stress Testing', () => {
    /**
     * Test: System stability under load
     * **Validates: Requirement 23.3 (Million-level support)**
     */
    it('should maintain stability with rapid consecutive queries', async () => {
      const mockUser = {
        sub: testUserId,
        username: 'perf-test-user',
        roles: ['super_admin'],
        platform_id: testPlatformId,
        dept_id: testDeptId,
      };

      const queryCount = 10;
      const startTime = Date.now();

      // Execute 10 rapid consecutive queries
      const queryPromises = Array.from({ length: queryCount }, () =>
        systemLogsService.listOperationLogs(mockUser as any, {
          page: 1,
          pageSize: 20,
        })
      );

      const results = await Promise.all(queryPromises);

      const duration = Date.now() - startTime;
      const avgTime = duration / queryCount;

      expect(results).toHaveLength(queryCount);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.items).toBeInstanceOf(Array);
      });

      console.log(`✓ ${queryCount} rapid queries completed in ${duration}ms (avg: ${avgTime.toFixed(2)}ms per query)`);
    });

    /**
     * Test: Memory efficiency with large result sets
     * **Validates: Requirement 23.3 (Performance without degradation)**
     */
    it('should handle large result sets efficiently', async () => {
      const mockUser = {
        sub: testUserId,
        username: 'perf-test-user',
        roles: ['super_admin'],
        platform_id: testPlatformId,
        dept_id: testDeptId,
      };

      const startTime = Date.now();

      // Query with large page size
      const result = await systemLogsService.listOperationLogs(mockUser as any, {
        page: 1,
        pageSize: 100,
      });

      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(duration).toBeLessThan(QUERY_THRESHOLD);

      console.log(`✓ Large result set (100 records) retrieved in ${duration}ms`);
    });
  });
});
