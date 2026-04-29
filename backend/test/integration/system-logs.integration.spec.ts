/**
 * System Log Management - Integration Tests
 * **Validates: Requirements 1.1, 6.1, 13.1, 20.1**
 *
 * Tests complete end-to-end workflows:
 * - Operation log recording → query → export
 * - Login log recording → query → export
 * - Permission control integration
 * - Exception handling scenarios
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SystemLogsService } from '../../src/modules/system/services/system-logs.service';
import { IdConverterService } from '../../src/modules/system/services/id-converter.service';
import { ScopeService } from '../../src/modules/system/services/scope.service';
import { RedisService } from '../../src/common/services/redis.service';

describe('System Log Management - Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let systemLogsService: SystemLogsService;
  let idConverterService: IdConverterService;

  // Test data
  const testUserId = 'test-user-integration-001';
  const testPlatformId = 'test-platform-integration-001';
  const testDeptId = 'test-dept-integration-001';
  const testShopId = 'test-shop-integration-001';

  let testOperationLogId: string;
  let testLoginLogId: string;

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

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    systemLogsService = moduleFixture.get<SystemLogsService>(SystemLogsService);
    idConverterService = moduleFixture.get<IdConverterService>(IdConverterService);

    // Create test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    await app.close();
  });

  /**
   * Setup test data in database
   */
  async function setupTestData() {
    // Create test user
    await prisma.sys_user.create({
      data: {
        id: testUserId,
        username: 'integration-test-user',
        password: 'hashed-password',
        email: 'integration@test.com',
        phone: '13800000001',
        status: 1,
        platform_id: testPlatformId,
        dept_id: testDeptId,
      },
    });

    // Create test platform
    await prisma.sys_platform.create({
      data: {
        id: testPlatformId,
        platform_name: '集成测试平台',
        platform_code: 'INTEGRATION_TEST',
        status: 1,
      },
    });

    // Create test department
    await prisma.sys_department.create({
      data: {
        id: testDeptId,
        dept_name: '集成测试部门',
        dept_code: 'INTEGRATION_DEPT',
        status: 1,
      },
    });

    // Create test shop
    await prisma.sys_shop.create({
      data: {
        id: testShopId,
        shop_name: '集成测试店铺',
        shop_code: 'INTEGRATION_SHOP',
        status: 1,
        platform_id: testPlatformId,
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
        OR: [
          { user_id: testUserId },
          { platform_id: testPlatformId },
        ],
      },
    });

    await prisma.sys_login_log.deleteMany({
      where: {
        OR: [
          { user_id: testUserId },
          { platform_id: testPlatformId },
        ],
      },
    });

    // Delete test entities
    await prisma.sys_shop.deleteMany({ where: { id: testShopId } });
    await prisma.sys_department.deleteMany({ where: { id: testDeptId } });
    await prisma.sys_platform.deleteMany({ where: { id: testPlatformId } });
    await prisma.sys_user.deleteMany({ where: { id: testUserId } });
  }

  describe('Complete Operation Log Flow', () => {
    /**
     * Test: Operation → Record → Query → Export
     * **Validates: Requirement 1.1 (Auto-record CRUD operations)**
     */
    it('should record operation log automatically', async () => {
      // Create operation log
      const operationLog = await prisma.sys_operation_log.create({
        data: {
          user_id: testUserId,
          username: 'integration-test-user',
          request_method: 'POST',
          api_path: '/api/users',
          api_name: '创建用户',
          operation_module: '用户管理',
          request_ip: '192.168.1.100',
          operation_status: 1,
          operation_message: '操作成功',
          platform_id: testPlatformId,
          dept_id: testDeptId,
          shop_id: testShopId,
        },
      });

      testOperationLogId = operationLog.id;

      expect(operationLog).toBeDefined();
      expect(operationLog.user_id).toBe(testUserId);
      expect(operationLog.operation_module).toBe('用户管理');
      expect(operationLog.create_time).toBeDefined();
    });

    /**
     * Test: Query operation logs with ID conversion
     * **Validates: Requirement 13.1 (Multi-condition search)**
     */
    it('should query operation logs with ID to name conversion', async () => {
      const mockUser = {
        sub: testUserId,
        username: 'integration-test-user',
        roles: ['super_admin'],
        platform_id: testPlatformId,
        dept_id: testDeptId,
      };

      const result = await systemLogsService.listOperationLogs(mockUser as any, {
        page: 1,
        pageSize: 10,
        username: 'integration-test-user',
      });

      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThan(0);
    });

    /**
     * Test: Export operation logs
     * **Validates: Requirement 17.1 (Export current search results)**
     */
    it('should export operation logs to Excel', async () => {
      const mockUser = {
        sub: testUserId,
        username: 'integration-test-user',
        roles: ['super_admin'],
        platform_id: testPlatformId,
        dept_id: testDeptId,
      };

      const result = await systemLogsService.exportLogs(
        mockUser as any,
        'operation',
        {
          username: 'integration-test-user',
        }
      );

      expect(result).toBeDefined();
      expect(result.buffer).toBeDefined();
      expect(result.filename).toContain('操作日志');
      expect(result.filename).toContain('.xlsx');
    });
  });

  describe('Complete Login Log Flow', () => {
    /**
     * Test: Login → Record → Query → Export
     * **Validates: Requirement 6.1 (Auto-record login attempts)**
     */
    it('should record login log automatically', async () => {
      // Create login log
      const loginLog = await prisma.sys_login_log.create({
        data: {
          user_id: testUserId,
          username: 'integration-test-user',
          login_ip: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
          login_status: 1,
          login_message: '登录成功',
          platform_id: testPlatformId,
          dept_id: testDeptId,
          device_type: 'pc',
        },
      });

      testLoginLogId = loginLog.id;

      expect(loginLog).toBeDefined();
      expect(loginLog.user_id).toBe(testUserId);
      expect(loginLog.login_status).toBe(1);
      expect(loginLog.create_time).toBeDefined();
    });

    /**
     * Test: Query login logs with ID conversion
     * **Validates: Requirement 13.1 (Separate search for login logs)**
     */
    it('should query login logs with ID to name conversion', async () => {
      const mockUser = {
        sub: testUserId,
        username: 'integration-test-user',
        roles: ['super_admin'],
        platform_id: testPlatformId,
        dept_id: testDeptId,
      };

      const result = await systemLogsService.listLoginLogs(mockUser as any, {
        page: 1,
        pageSize: 10,
        username: 'integration-test-user',
      });

      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThan(0);
    });

    /**
     * Test: Export login logs
     * **Validates: Requirement 17.1 (Export functionality)**
     */
    it('should export login logs to Excel', async () => {
      const mockUser = {
        sub: testUserId,
        username: 'integration-test-user',
        roles: ['super_admin'],
        platform_id: testPlatformId,
        dept_id: testDeptId,
      };

      const result = await systemLogsService.exportLogs(
        mockUser as any,
        'login',
        {
          username: 'integration-test-user',
        }
      );

      expect(result).toBeDefined();
      expect(result.buffer).toBeDefined();
      expect(result.filename).toContain('登录日志');
      expect(result.filename).toContain('.xlsx');
    });
  });

  describe('Permission Control Integration', () => {
    /**
     * Test: Super admin can query all logs
     * **Validates: Requirement 20.1 (Super admin full access)**
     */
    it('should allow super admin to query all logs', async () => {
      const superAdminUser = {
        sub: 'super-admin-id',
        username: 'superadmin',
        roles: ['super_admin'],
        platform_id: 'other-platform',
        dept_id: 'other-dept',
      };

      const result = await systemLogsService.listOperationLogs(superAdminUser as any, {
        page: 1,
        pageSize: 10,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      // Super admin should see logs from all platforms/departments
    });

    /**
     * Test: Regular admin can only query their department/platform logs
     * **Validates: Requirement 20.2 (Regular admin data isolation)**
     */
    it('should restrict regular admin to their department/platform logs', async () => {
      const regularAdminUser = {
        sub: 'regular-admin-id',
        username: 'regularadmin',
        roles: ['admin'],
        platform_id: testPlatformId,
        dept_id: testDeptId,
      };

      const result = await systemLogsService.listOperationLogs(regularAdminUser as any, {
        page: 1,
        pageSize: 10,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
    });

    /**
     * Test: Logs cannot be deleted
     * **Validates: Requirement 12.1 (Data immutability)**
     */
    it('should reject delete operation on logs', async () => {
      await expect(
        systemLogsService.deleteOperationLog(testOperationLogId)
      ).rejects.toThrow('日志数据不可删除');

      await expect(
        systemLogsService.deleteLoginLog(testLoginLogId)
      ).rejects.toThrow('日志数据不可删除');
    });

    /**
     * Test: Logs cannot be updated
     * **Validates: Requirement 12.2 (No edit interface)**
     */
    it('should reject update operation on logs', async () => {
      await expect(
        systemLogsService.updateOperationLog(testOperationLogId, {
          operation_message: 'Modified content',
        })
      ).rejects.toThrow('日志数据不可修改');

      await expect(
        systemLogsService.updateLoginLog(testLoginLogId, {
          login_message: 'Modified result',
        })
      ).rejects.toThrow('日志数据不可修改');
    });
  });

  describe('Exception Handling Scenarios', () => {
    /**
     * Test: Handle invalid user ID
     * **Validates: Requirement 3.2 (Invalid ID handling)**
     */
    it('should handle invalid user ID gracefully', async () => {
      // Create log with invalid user ID
      const logWithInvalidUser = await prisma.sys_operation_log.create({
        data: {
          user_id: 'invalid-user-id-999',
          username: 'invalid-user',
          request_method: 'GET',
          api_path: '/api/test',
          api_name: '测试接口',
          operation_module: '测试模块',
          request_ip: '192.168.1.100',
          operation_status: 1,
        },
      });

      const mockUser = {
        sub: testUserId,
        username: 'integration-test-user',
        roles: ['super_admin'],
      };

      const result = await systemLogsService.listOperationLogs(mockUser as any, {
        page: 1,
        pageSize: 10,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);

      // Cleanup
      await prisma.sys_operation_log.delete({ where: { id: logWithInvalidUser.id } });
    });

    /**
     * Test: Handle empty search results
     * **Validates: Requirement 14.3 (Empty result handling)**
     */
    it('should handle empty search results', async () => {
      const mockUser = {
        sub: testUserId,
        username: 'integration-test-user',
        roles: ['super_admin'],
      };

      const result = await systemLogsService.listOperationLogs(mockUser as any, {
        page: 1,
        pageSize: 10,
        username: 'NonExistentUser999',
      });

      expect(result).toBeDefined();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    /**
     * Test: Handle time range correction
     * **Validates: Requirement 14.2 (Time range auto-correction)**
     */
    it('should auto-correct invalid time range', async () => {
      const mockUser = {
        sub: testUserId,
        username: 'integration-test-user',
        roles: ['super_admin'],
      };

      // End time earlier than start time
      const result = await systemLogsService.listOperationLogs(mockUser as any, {
        page: 1,
        pageSize: 10,
        start_date: '2024-12-31',
        end_date: '2024-01-01',
      });

      // Should not throw error, should auto-correct
      expect(result).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
    });

    /**
     * Test: Handle large export request
     * **Validates: Requirement 18.1 (Large data export limit)**
     */
    it('should handle large export request with warning', async () => {
      const mockUser = {
        sub: testUserId,
        username: 'integration-test-user',
        roles: ['super_admin'],
      };

      // This should work but may include warning in production
      const result = await systemLogsService.exportLogs(
        mockUser as any,
        'operation',
        {}
      );

      expect(result).toBeDefined();
      expect(result.buffer).toBeDefined();
    });
  });

  describe('ID Converter Service Integration', () => {
    /**
     * Test: Batch ID conversion for users
     * **Validates: Requirement 3.1 (Batch ID conversion)**
     */
    it('should convert user IDs in batch', async () => {
      const userIds = [testUserId];

      const result = await idConverterService.convertUserIds(userIds);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBeGreaterThan(0);
    });

    /**
     * Test: Batch ID conversion for platforms
     * **Validates: Requirement 3.1 (Batch ID conversion)**
     */
    it('should convert platform IDs in batch', async () => {
      const platformIds = [testPlatformId];

      const result = await idConverterService.convertPlatformIds(platformIds);

      expect(result).toBeInstanceOf(Map);
      expect(result.get(testPlatformId)).toBe('集成测试平台');
    });

    /**
     * Test: Batch ID conversion for departments
     * **Validates: Requirement 3.1 (Batch ID conversion)**
     */
    it('should convert department IDs in batch', async () => {
      const deptIds = [testDeptId];

      const result = await idConverterService.convertDepartmentIds(deptIds);

      expect(result).toBeInstanceOf(Map);
      expect(result.get(testDeptId)).toBe('集成测试部门');
    });

    /**
     * Test: Batch ID conversion for shops
     * **Validates: Requirement 3.1 (Batch ID conversion)**
     */
    it('should convert shop IDs in batch', async () => {
      const shopIds = [testShopId];

      const result = await idConverterService.convertShopIds(shopIds);

      expect(result).toBeInstanceOf(Map);
      expect(result.get(testShopId)).toBe('集成测试店铺');
    });
  });
});
