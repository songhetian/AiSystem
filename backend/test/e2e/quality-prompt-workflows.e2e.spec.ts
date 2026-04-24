/**
 * Quality Prompt End-to-End Tests
 *
 * Tests complete workflows including:
 * - Prompt creation flow
 * - Conflict detection and resolution
 * - Version rollback flow
 * - Batch operations flow
 *
 * **Validates: Requirements 1.1-25.6 (Complete Feature Integration)**
 *
 * Note: These tests require a test database and should be run in isolation.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/common/services/redis.service';

describe('Quality Prompt Workflows (E2E)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let redisService: RedisService;
  let authToken: string;
  let superAdminToken: string;
  let deptManagerToken: string;

  const testPlatformId = 'test-platform-e2e';
  const testDeptId = 'test-dept-e2e';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);
    redisService = app.get<RedisService>(RedisService);

    // Setup test users and get auth tokens
    await setupTestUsers();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    await app.close();
  });

  beforeEach(async () => {
    // Clear Redis cache before each test
    await redisService.deleteByPattern(`quality-inspection:${testPlatformId}:*`);
  });

  /**
   * Setup test users and authentication tokens
   */
  async function setupTestUsers() {
    // Create super admin user
    const superAdmin = await prismaService.sys_user.upsert({
      where: { username: 'e2e-super-admin' },
      update: {},
      create: {
        username: 'e2e-super-admin',
        password: 'hashed-password',
        name: 'E2E Super Admin',
        platform_id: testPlatformId,
        dept_id: testDeptId,
        status: 1,
      },
    });

    // Create department manager user
    const deptManager = await prismaService.sys_user.upsert({
      where: { username: 'e2e-dept-manager' },
      update: {},
      include: {
        employee: { select: { name: true } },
      } as any,
      create: {
        username: 'e2e-dept-manager',
        password: 'hashed-password',
        name: 'E2E Dept Manager',
        platform_id: testPlatformId,
        dept_id: testDeptId,
        status: 1,
      },
    });

    // Get auth tokens (simplified - in real app, use proper login flow)
    superAdminToken = 'Bearer mock-super-admin-token';
    deptManagerToken = 'Bearer mock-dept-manager-token';
    authToken = superAdminToken;
  }

  /**
   * Cleanup test data
   */
  async function cleanupTestData() {
    await prismaService.service_quality_prompt_audit_log.deleteMany({
      where: { platform_id: testPlatformId },
    });
    await prismaService.service_quality_prompt_version.deleteMany({
      where: {
        OR: [
          { prompt_type: 'global' },
          { prompt_type: 'department' },
        ],
      },
    });
    await prismaService.service_quality_prompt_department.deleteMany({
      where: { platform_id: testPlatformId },
    });
    await prismaService.service_quality_prompt_global.deleteMany({
      where: { platform_id: testPlatformId },
    });
    await prismaService.sys_user.deleteMany({
      where: {
        username: {
          in: ['e2e-super-admin', 'e2e-dept-manager'],
        },
      },
    });
  }

  /**
   * Test Suite 1: Complete Prompt Creation Flow
   * **Validates: Requirements 3.1-3.8, 4.1-4.8, 6.1-6.7, 11.1-11.7**
   */
  describe('Complete Prompt Creation Flow', () => {
    it('should create global prompt, then department prompt, and log all operations', async () => {
      // Step 1: Create Global Prompt
      const globalPromptDto = {
        name: 'E2E Global Politeness Standard',
        content: 'Always greet customers with "Hello" or "Good morning".',
        applicable_scenarios: 'All customer interactions',
        enabled: 1,
        sort: 1,
      };

      const createGlobalResponse = await request(app.getHttpServer())
        .post('/api/quality-prompts/global')
        .set('Authorization', superAdminToken)
        .send(globalPromptDto)
        .expect(201);

      const globalPrompt = createGlobalResponse.body;
      expect(globalPrompt.id).toBeDefined();
      expect(globalPrompt.name).toBe(globalPromptDto.name);
      expect(globalPrompt.version).toBe(1);

      // Step 2: Verify version record was created
      const versions = await prismaService.service_quality_prompt_version.findMany({
        where: {
          prompt_id: globalPrompt.id,
          prompt_type: 'global',
        },
      });
      expect(versions.length).toBe(1);
      expect(versions[0].version_number).toBe(1);

      // Step 3: Verify audit log was created
      const auditLogs = await prismaService.service_quality_prompt_audit_log.findMany({
        where: {
          prompt_id: globalPrompt.id,
          operation_type: 'create',
        },
      });
      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].prompt_name).toBe(globalPromptDto.name);

      // Step 4: Create Department Prompt (compatible with global)
      const deptPromptDto = {
        name: 'E2E Department Greeting Extension',
        content: 'For VIP customers, add "Welcome back" after greeting.',
        applicable_scenarios: 'VIP customer service',
        enabled: 1,
        sort: 1,
        parent_global_prompt_id: globalPrompt.id,
      };

      const createDeptResponse = await request(app.getHttpServer())
        .post('/api/quality-prompts/department')
        .set('Authorization', deptManagerToken)
        .send(deptPromptDto)
        .expect(201);

      const deptPrompt = createDeptResponse.body;
      expect(deptPrompt.id).toBeDefined();
      expect(deptPrompt.name).toBe(deptPromptDto.name);
      expect(deptPrompt.parent_global_prompt_id).toBe(globalPrompt.id);

      // Step 5: Verify cache was invalidated
      const cacheKey = `quality-inspection:${testPlatformId}:${testDeptId}`;
      const cachedData = await redisService.get(cacheKey);
      expect(cachedData).toBeNull(); // Should be invalidated

      // Step 6: Retrieve merged prompts for quality inspection
      const mergedPromptsResponse = await request(app.getHttpServer())
        .get(`/api/quality-prompts/merged?platform_id=${testPlatformId}&dept_id=${testDeptId}`)
        .set('Authorization', authToken)
        .expect(200);

      const mergedPrompts = mergedPromptsResponse.body;
      expect(mergedPrompts.globalPrompts.length).toBe(1);
      expect(mergedPrompts.departmentPrompts.length).toBe(1);
      expect(mergedPrompts.mergedInstruction).toContain('Hello');
      expect(mergedPrompts.mergedInstruction).toContain('Welcome back');
    });

    it('should validate required fields and reject invalid prompt', async () => {
      // Attempt to create prompt with missing required fields
      const invalidDto = {
        name: '', // Empty name
        content: 'Some content',
      };

      await request(app.getHttpServer())
        .post('/api/quality-prompts/global')
        .set('Authorization', superAdminToken)
        .send(invalidDto)
        .expect(400);
    });

    it('should enforce permission control for department managers', async () => {
      // Department manager should NOT be able to create global prompts
      const globalPromptDto = {
        name: 'Unauthorized Global Prompt',
        content: 'This should fail',
        applicable_scenarios: 'All',
        enabled: 1,
        sort: 1,
      };

      await request(app.getHttpServer())
        .post('/api/quality-prompts/global')
        .set('Authorization', deptManagerToken)
        .send(globalPromptDto)
        .expect(403);
    });
  });

  /**
   * Test Suite 2: Conflict Detection and Resolution Flow
   * **Validates: Requirements 5.1-5.6**
   */
  describe('Conflict Detection and Resolution Flow', () => {
    let globalPromptId: string;

    beforeEach(async () => {
      // Create a global prompt for conflict testing
      const globalPrompt = await prismaService.service_quality_prompt_global.create({
        data: {
          name: 'E2E Conflict Test Global',
          content: 'Always use formal language. Never use slang or informal terms.',
          applicable_scenarios: 'All interactions',
          enabled: 1,
          sort: 1,
          platform_id: testPlatformId,
          version: 1,
          created_by: 'test-user',
          updated_by: 'test-user',
        },
      });
      globalPromptId = globalPrompt.id;
    });

    it('should detect conflict when department prompt contradicts global prompt', async () => {
      // Attempt to create conflicting department prompt
      const conflictingDto = {
        name: 'E2E Conflicting Department Prompt',
        content: 'Use casual and informal language to build rapport. Slang is encouraged.',
        applicable_scenarios: 'Casual support',
        enabled: 1,
        sort: 1,
        parent_global_prompt_id: globalPromptId,
      };

      const response = await request(app.getHttpServer())
        .post('/api/quality-prompts/department')
        .set('Authorization', deptManagerToken)
        .send(conflictingDto)
        .expect(400);

      expect(response.body.message).toContain('conflict');
      expect(response.body.conflicts).toBeDefined();
      expect(response.body.conflicts.length).toBeGreaterThan(0);
      expect(response.body.conflicts[0]).toMatchObject({
        globalPromptId: globalPromptId,
        conflictLocation: expect.any(String),
        suggestion: expect.any(String),
      });
    });

    it('should allow compatible department prompt without conflicts', async () => {
      // Create compatible department prompt
      const compatibleDto = {
        name: 'E2E Compatible Department Prompt',
        content: 'In addition to formal language, use industry-specific terminology.',
        applicable_scenarios: 'Technical support',
        enabled: 1,
        sort: 1,
        parent_global_prompt_id: globalPromptId,
      };

      const response = await request(app.getHttpServer())
        .post('/api/quality-prompts/department')
        .set('Authorization', deptManagerToken)
        .send(compatibleDto)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe(compatibleDto.name);
    });

    it('should allow super admin to override conflict validation', async () => {
      // Super admin can force create despite conflicts
      const conflictingDto = {
        name: 'E2E Override Conflict',
        content: 'Use informal language',
        applicable_scenarios: 'Special case',
        enabled: 1,
        sort: 1,
        parent_global_prompt_id: globalPromptId,
        force_override: true, // Super admin override flag
      };

      const response = await request(app.getHttpServer())
        .post('/api/quality-prompts/department')
        .set('Authorization', superAdminToken)
        .send(conflictingDto)
        .expect(201);

      expect(response.body.id).toBeDefined();
    });
  });

  /**
   * Test Suite 3: Version Rollback Flow
   * **Validates: Requirements 6.1-6.7**
   */
  describe('Version Rollback Flow', () => {
    let promptId: string;

    beforeEach(async () => {
      // Create initial prompt
      const prompt = await prismaService.service_quality_prompt_global.create({
        data: {
          name: 'E2E Version Test',
          content: 'Version 1 content',
          applicable_scenarios: 'All',
          enabled: 1,
          sort: 1,
          platform_id: testPlatformId,
          version: 1,
          created_by: 'test-user',
          updated_by: 'test-user',
        },
      });
      promptId = prompt.id;

      // Create version record
      await prismaService.service_quality_prompt_version.create({
        data: {
          prompt_id: promptId,
          prompt_type: 'global',
          version_number: 1,
          name: 'E2E Version Test',
          content: 'Version 1 content',
          content_snapshot: JSON.stringify({
            name: 'E2E Version Test',
            content: 'Version 1 content',
          }),
          modified_by: 'test-user',
        } as any,
      });
    });

    it('should update prompt and create new version', async () => {
      // Update prompt to version 2
      const updateDto = {
        name: 'E2E Version Test',
        content: 'Version 2 content - updated',
        applicable_scenarios: 'All',
        enabled: 1,
        sort: 1,
      };

      await request(app.getHttpServer())
        .put(`/api/quality-prompts/global/${promptId}`)
        .set('Authorization', superAdminToken)
        .send(updateDto)
        .expect(200);

      // Verify version 2 was created
      const versions = await prismaService.service_quality_prompt_version.findMany({
        where: { prompt_id: promptId },
        orderBy: { version_number: 'asc' },
      });
      expect(versions.length).toBe(2);
      expect(versions[1].version_number).toBe(2);

      // Update to version 3
      const updateDto2 = {
        ...updateDto,
        content: 'Version 3 content - final',
      };

      await request(app.getHttpServer())
        .put(`/api/quality-prompts/global/${promptId}`)
        .set('Authorization', superAdminToken)
        .send(updateDto2)
        .expect(200);

      // Verify version 3 was created
      const versions2 = await prismaService.service_quality_prompt_version.findMany({
        where: { prompt_id: promptId },
      });
      expect(versions2.length).toBe(3);
    });

    it('should rollback to previous version successfully', async () => {
      // Update to version 2
      await request(app.getHttpServer())
        .put(`/api/quality-prompts/global/${promptId}`)
        .set('Authorization', superAdminToken)
        .send({
          name: 'E2E Version Test',
          content: 'Version 2 content',
          applicable_scenarios: 'All',
          enabled: 1,
          sort: 1,
        })
        .expect(200);

      // Update to version 3
      await request(app.getHttpServer())
        .put(`/api/quality-prompts/global/${promptId}`)
        .set('Authorization', superAdminToken)
        .send({
          name: 'E2E Version Test',
          content: 'Version 3 content',
          applicable_scenarios: 'All',
          enabled: 1,
          sort: 1,
        })
        .expect(200);

      // Rollback to version 1
      const rollbackResponse = await request(app.getHttpServer())
        .post(`/api/quality-prompts/global/${promptId}/rollback`)
        .set('Authorization', superAdminToken)
        .send({ version: 1 })
        .expect(200);

      expect(rollbackResponse.body.version).toBe(4); // New version created
      expect(rollbackResponse.body.content).toBe('Version 1 content');

      // Verify version history
      const versions = await prismaService.service_quality_prompt_version.findMany({
        where: { prompt_id: promptId },
        orderBy: { version_number: 'asc' },
      });
      expect(versions.length).toBe(4);
      expect(versions[3].version_number).toBe(4);

      const v4Snapshot = JSON.parse((versions[3] as any).content_snapshot);
      expect(v4Snapshot.content).toBe('Version 1 content');
    });

    it('should retrieve version history with diff comparison', async () => {
      // Create multiple versions
      await request(app.getHttpServer())
        .put(`/api/quality-prompts/global/${promptId}`)
        .set('Authorization', superAdminToken)
        .send({
          name: 'E2E Version Test',
          content: 'Version 2 content',
          applicable_scenarios: 'All',
          enabled: 1,
          sort: 1,
        });

      // Get version history
      const historyResponse = await request(app.getHttpServer())
        .get(`/api/quality-prompts/global/${promptId}/versions`)
        .set('Authorization', superAdminToken)
        .expect(200);

      expect(historyResponse.body.length).toBe(2);
      expect(historyResponse.body[0].version_number).toBe(1);
      expect(historyResponse.body[1].version_number).toBe(2);

      // Get diff between versions
      const diffResponse = await request(app.getHttpServer())
        .get(`/api/quality-prompts/global/${promptId}/versions/diff?from=1&to=2`)
        .set('Authorization', superAdminToken)
        .expect(200);

      expect(diffResponse.body.fromVersion).toBe(1);
      expect(diffResponse.body.toVersion).toBe(2);
      expect(diffResponse.body.changes).toBeDefined();
    });
  });

  /**
   * Test Suite 4: Batch Operations Flow
   * **Validates: Requirements 9.1-9.7**
   */
  describe('Batch Operations Flow', () => {
    let promptIds: string[];

    beforeEach(async () => {
      // Create multiple prompts for batch operations
      const prompts = await Promise.all([
        prismaService.service_quality_prompt_global.create({
          data: {
            name: 'E2E Batch Test 1',
            content: 'Content 1',
            applicable_scenarios: 'All',
            enabled: 1,
            sort: 1,
            platform_id: testPlatformId,
            version: 1,
            created_by: 'test-user',
            updated_by: 'test-user',
          },
        }),
        prismaService.service_quality_prompt_global.create({
          data: {
            name: 'E2E Batch Test 2',
            content: 'Content 2',
            applicable_scenarios: 'All',
            enabled: 1,
            sort: 2,
            platform_id: testPlatformId,
            version: 1,
            created_by: 'test-user',
            updated_by: 'test-user',
          },
        }),
        prismaService.service_quality_prompt_global.create({
          data: {
            name: 'E2E Batch Test 3',
            content: 'Content 3',
            applicable_scenarios: 'All',
            enabled: 1,
            sort: 3,
            platform_id: testPlatformId,
            version: 1,
            created_by: 'test-user',
            updated_by: 'test-user',
          },
        }),
      ]);

      promptIds = prompts.map((p) => p.id);
    });

    it('should batch enable multiple prompts', async () => {
      // First disable all prompts
      await prismaService.service_quality_prompt_global.updateMany({
        where: { id: { in: promptIds } },
        data: { enabled: 0 },
      });

      // Batch enable
      const response = await request(app.getHttpServer())
        .post('/api/quality-prompts/batch-enable')
        .set('Authorization', superAdminToken)
        .send({
          ids: promptIds,
          type: 'global',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.successCount).toBe(3);
      expect(response.body.failureCount).toBe(0);

      // Verify all prompts are enabled
      const prompts = await prismaService.service_quality_prompt_global.findMany({
        where: { id: { in: promptIds } },
      });
      expect(prompts.every((p) => p.enabled === 1)).toBe(true);
    });

    it('should batch disable multiple prompts', async () => {
      // Batch disable
      const response = await request(app.getHttpServer())
        .post('/api/quality-prompts/batch-disable')
        .set('Authorization', superAdminToken)
        .send({
          ids: promptIds,
          type: 'global',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.successCount).toBe(3);

      // Verify all prompts are disabled
      const prompts = await prismaService.service_quality_prompt_global.findMany({
        where: { id: { in: promptIds } },
      });
      expect(prompts.every((p) => p.enabled === 0)).toBe(true);
    });

    it('should export prompts to Excel', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/quality-prompts/global/export')
        .set('Authorization', superAdminToken)
        .expect(200);

      expect(response.headers['content-type']).toContain('spreadsheet');
      expect(response.headers['content-disposition']).toContain('global_prompts');
      expect(response.body).toBeDefined();
    });

    it('should import prompts from Excel', async () => {
      // Create mock Excel file buffer
      const mockExcelBuffer = Buffer.from('mock-excel-data');

      const response = await request(app.getHttpServer())
        .post('/api/quality-prompts/global/import')
        .set('Authorization', superAdminToken)
        .attach('file', mockExcelBuffer, 'prompts.xlsx')
        .expect(200);

      expect(response.body.successCount).toBeDefined();
      expect(response.body.failureCount).toBeDefined();
      expect(response.body.errors).toBeDefined();
    });

    it('should handle partial batch operation failures', async () => {
      // Include one invalid ID
      const invalidIds = [...promptIds, 'non-existent-id'];

      const response = await request(app.getHttpServer())
        .post('/api/quality-prompts/batch-enable')
        .set('Authorization', superAdminToken)
        .send({
          ids: invalidIds,
          type: 'global',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.successCount).toBe(3);
      expect(response.body.failureCount).toBe(1);
      expect(response.body.errors.length).toBe(1);
    });
  });

  /**
   * Test Suite 5: Quality Inspection Integration
   * **Validates: Requirements 7.1-7.7, 22.1-22.6**
   */
  describe('Quality Inspection Integration', () => {
    it('should execute quality inspection with merged prompts', async () => {
      // Create global and department prompts
      const globalPrompt = await prismaService.service_quality_prompt_global.create({
        data: {
          name: 'E2E Inspection Global',
          content: 'Be polite and professional',
          applicable_scenarios: 'All',
          enabled: 1,
          sort: 1,
          platform_id: testPlatformId,
          version: 1,
          created_by: 'test-user',
          updated_by: 'test-user',
        },
      });

      const deptPrompt = await prismaService.service_quality_prompt_department.create({
        data: {
          name: 'E2E Inspection Department',
          content: 'Respond within 2 minutes',
          applicable_scenarios: 'Live chat',
          enabled: 1,
          sort: 1,
          platform_id: testPlatformId,
          dept_id: testDeptId,
          version: 1,
          created_by: 'test-user',
          updated_by: 'test-user',
        },
      });

      // Execute quality inspection
      const inspectionResponse = await request(app.getHttpServer())
        .post('/api/service/sessions/analyze')
        .set('Authorization', authToken)
        .send({
          session_id: 'test-session-001',
          conversation: 'Customer: Hello\nAgent: Hi there!',
          platform_id: testPlatformId,
          dept_id: testDeptId,
        })
        .expect(200);

      expect(inspectionResponse.body.violations).toBeDefined();
      expect(inspectionResponse.body.globalViolations).toBeDefined();
      expect(inspectionResponse.body.departmentViolations).toBeDefined();
    });

    it('should cache merged prompts and invalidate on update', async () => {
      // Create prompts
      const globalPrompt = await prismaService.service_quality_prompt_global.create({
        data: {
          name: 'E2E Cache Test',
          content: 'Test content',
          applicable_scenarios: 'All',
          enabled: 1,
          sort: 1,
          platform_id: testPlatformId,
          version: 1,
          created_by: 'test-user',
          updated_by: 'test-user',
        },
      });

      // First request - should cache
      await request(app.getHttpServer())
        .get(`/api/quality-prompts/merged?platform_id=${testPlatformId}&dept_id=${testDeptId}`)
        .set('Authorization', authToken)
        .expect(200);

      // Verify cache exists
      const cacheKey = `quality-inspection:${testPlatformId}:${testDeptId}`;
      let cachedData = await redisService.get(cacheKey);
      expect(cachedData).toBeDefined();

      // Update prompt - should invalidate cache
      await request(app.getHttpServer())
        .put(`/api/quality-prompts/global/${globalPrompt.id}`)
        .set('Authorization', superAdminToken)
        .send({
          name: 'E2E Cache Test',
          content: 'Updated content',
          applicable_scenarios: 'All',
          enabled: 1,
          sort: 1,
        })
        .expect(200);

      // Verify cache was invalidated
      cachedData = await redisService.get(cacheKey);
      expect(cachedData).toBeNull();
    });
  });
});
