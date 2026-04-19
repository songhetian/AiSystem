/**
 * Quality Prompt Service - Integration Tests
 *
 * Tests the complete CRUD operations, conflict validation, version management,
 * and permission control for both Global and Department Prompts.
 *
 * **Validates: Requirements 1.1-1.6, 2.1-2.8, 3.1-3.8, 4.1-4.8, 5.1-5.6, 6.1-6.7**
 */

import { Test, TestingModule } from '@nestjs/testing';
import { QualityPromptService } from './quality-prompt.service';
import { ConflictValidatorService } from './conflict-validator.service';
import { VersionManagerService } from './version-manager.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../common/services/redis.service';
import { ScopeService } from '../../../common/services/scope.service';
import { SaveGlobalPromptDto } from '../dto/save-global-prompt.dto';
import { SaveDepartmentPromptDto } from '../dto/save-department-prompt.dto';
import { QueryPromptsDto } from '../dto/query-prompts.dto';
import { BatchPromptOperationDto } from '../dto/batch-prompt-operation.dto';

describe('QualityPromptService - Integration Tests', () => {
  let service: QualityPromptService;
  let conflictValidator: ConflictValidatorService;
  let versionManager: VersionManagerService;
  let prismaService: any;
  let redisService: any;
  let scopeService: any;

  const mockUser = {
    sub: 'user-123',
    username: 'testuser',
    platform_id: 'platform-456',
    dept_id: 'dept-789',
    roles: ['super_admin'],
  };

  beforeEach(async () => {
    // Create mock services
    prismaService = {
      service_quality_prompt_global: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      service_quality_prompt_department: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      service_quality_prompt_version: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      service_quality_prompt_audit_log: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prismaService)),
    };

    redisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
    };

    scopeService = {
      applyScope: jest.fn((query, user) => ({
        ...query,
        where: {
          ...query.where,
          platform_id: user.platform_id,
        },
      })),
      validateAccess: jest.fn(),
    };

    conflictValidator = new ConflictValidatorService();
    versionManager = new VersionManagerService(prismaService);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QualityPromptService,
        { provide: ConflictValidatorService, useValue: conflictValidator },
        { provide: VersionManagerService, useValue: versionManager },
        { provide: PrismaService, useValue: prismaService },
        { provide: RedisService, useValue: redisService },
        { provide: ScopeService, useValue: scopeService },
      ],
    }).compile();

    service = module.get<QualityPromptService>(QualityPromptService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test Suite 1: Global Prompt CRUD Operations
   * **Validates: Requirements 3.1-3.8**
   */
  describe('Global Prompt CRUD Operations', () => {
    describe('createGlobalPrompt', () => {
      it('should create a new global prompt with all required fields', async () => {
        // Arrange
        const dto: SaveGlobalPromptDto = {
          name: 'Politeness Standard',
          content: 'Always greet customers politely and use respectful language.',
          applicable_scenarios: 'All customer interactions',
          enabled: 1,
          sort: 1,
        };

        const mockCreatedPrompt = {
          id: 'prompt-001',
          ...dto,
          platform_id: mockUser.platform_id,
          version: 1,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: mockUser.sub,
          updated_by: mockUser.sub,
        };

        prismaService.service_quality_prompt_global.create.mockResolvedValue(mockCreatedPrompt);
        prismaService.service_quality_prompt_version.create.mockResolvedValue({});
        prismaService.service_quality_prompt_audit_log.create.mockResolvedValue({});

        // Act
        const result = await service.createGlobalPrompt(dto, mockUser.sub, mockUser.username);

        // Assert
        expect(result).toEqual(mockCreatedPrompt);
        expect(prismaService.service_quality_prompt_global.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: dto.name,
            content: dto.content,
            applicable_scenarios: dto.applicable_scenarios,
            enabled: dto.enabled,
            sort: dto.sort,
            platform_id: mockUser.platform_id,
            version: 1,
            created_by: mockUser.sub,
            updated_by: mockUser.sub,
          }),
        });
        expect(prismaService.service_quality_prompt_version.create).toHaveBeenCalled();
        expect(prismaService.service_quality_prompt_audit_log.create).toHaveBeenCalled();
      });

      it('should validate required fields and reject invalid data', async () => {
        // Arrange
        const invalidDto: any = {
          name: '', // Empty name should fail
          content: 'Some content',
        };

        // Act & Assert
        await expect(
          service.createGlobalPrompt(invalidDto, mockUser.sub, mockUser.username)
        ).rejects.toThrow();
      });
    });

    describe('updateGlobalPrompt', () => {
      it('should update global prompt and create new version', async () => {
        // Arrange
        const promptId = 'prompt-001';
        const dto: SaveGlobalPromptDto = {
          name: 'Updated Politeness Standard',
          content: 'Updated content with more details.',
          applicable_scenarios: 'All customer interactions',
          enabled: 1,
          sort: 1,
        };

        const existingPrompt = {
          id: promptId,
          name: 'Politeness Standard',
          content: 'Original content',
          applicable_scenarios: 'All customer interactions',
          enabled: 1,
          sort: 1,
          platform_id: mockUser.platform_id,
          version: 1,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: mockUser.sub,
          updated_by: mockUser.sub,
        };

        const updatedPrompt = {
          ...existingPrompt,
          ...dto,
          version: 2,
          updated_at: new Date(),
        };

        prismaService.service_quality_prompt_global.findUnique.mockResolvedValue(existingPrompt);
        prismaService.service_quality_prompt_global.update.mockResolvedValue(updatedPrompt);
        prismaService.service_quality_prompt_version.create.mockResolvedValue({});
        prismaService.service_quality_prompt_audit_log.create.mockResolvedValue({});

        // Act
        const result = await service.updateGlobalPrompt(promptId, dto, mockUser.sub, mockUser.username);

        // Assert
        expect(result).toEqual(updatedPrompt);
        expect(result.version).toBe(2);
        expect(prismaService.service_quality_prompt_version.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            prompt_id: promptId,
            prompt_type: 'global',
            version_number: 2,
            content_snapshot: expect.any(String),
          }),
        });
      });

      it('should reject update if prompt does not exist', async () => {
        // Arrange
        const promptId = 'non-existent-prompt';
        const dto: SaveGlobalPromptDto = {
          name: 'Updated Name',
          content: 'Updated content',
          applicable_scenarios: 'All',
          enabled: 1,
          sort: 1,
        };

        prismaService.service_quality_prompt_global.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          service.updateGlobalPrompt(promptId, dto, mockUser.sub, mockUser.username)
        ).rejects.toThrow();
      });
    });

    describe('deleteGlobalPrompt', () => {
      it('should prevent deletion if referenced by department prompts', async () => {
        // Arrange
        const promptId = 'prompt-001';

        const existingPrompt = {
          id: promptId,
          name: 'Referenced Prompt',
          platform_id: mockUser.platform_id,
        };

        prismaService.service_quality_prompt_global.findUnique.mockResolvedValue(existingPrompt);
        prismaService.service_quality_prompt_department.findMany.mockResolvedValue([
          { id: 'dept-prompt-001', parent_global_prompt_id: promptId },
        ]);

        // Act & Assert
        await expect(
          service.deleteGlobalPrompt(promptId, mockUser.sub, mockUser.username)
        ).rejects.toThrow(/referenced by department prompts/i);
      });

      it('should successfully delete global prompt if not referenced', async () => {
        // Arrange
        const promptId = 'prompt-001';

        const existingPrompt = {
          id: promptId,
          name: 'Unreferenced Prompt',
          platform_id: mockUser.platform_id,
        };

        prismaService.service_quality_prompt_global.findUnique.mockResolvedValue(existingPrompt);
        prismaService.service_quality_prompt_department.findMany.mockResolvedValue([]);
        prismaService.service_quality_prompt_global.delete.mockResolvedValue(existingPrompt);
        prismaService.service_quality_prompt_audit_log.create.mockResolvedValue({});

        // Act
        const result = await service.deleteGlobalPrompt(promptId, mockUser.sub, mockUser.username);

        // Assert
        expect(result).toEqual({ success: true, message: expect.any(String) });
        expect(prismaService.service_quality_prompt_global.delete).toHaveBeenCalledWith({
          where: { id: promptId },
        });
      });
    });

    describe('toggleGlobalPromptStatus', () => {
      it('should enable a disabled global prompt', async () => {
        // Arrange
        const promptId = 'prompt-001';
        const existingPrompt = {
          id: promptId,
          name: 'Test Prompt',
          enabled: 0,
          platform_id: mockUser.platform_id,
        };

        const updatedPrompt = { ...existingPrompt, enabled: 1 };

        prismaService.service_quality_prompt_global.findUnique.mockResolvedValue(existingPrompt);
        prismaService.service_quality_prompt_global.update.mockResolvedValue(updatedPrompt);
        prismaService.service_quality_prompt_audit_log.create.mockResolvedValue({});

        // Act
        const result = await service.toggleGlobalPromptStatus(promptId, 1, mockUser.sub, mockUser.username);

        // Assert
        expect(result).toEqual(updatedPrompt);
        expect(result.enabled).toBe(1);
      });

      it('should disable an enabled global prompt', async () => {
        // Arrange
        const promptId = 'prompt-001';
        const existingPrompt = {
          id: promptId,
          name: 'Test Prompt',
          enabled: 1,
          platform_id: mockUser.platform_id,
        };

        const updatedPrompt = { ...existingPrompt, enabled: 0 };

        prismaService.service_quality_prompt_global.findUnique.mockResolvedValue(existingPrompt);
        prismaService.service_quality_prompt_global.update.mockResolvedValue(updatedPrompt);
        prismaService.service_quality_prompt_audit_log.create.mockResolvedValue({});

        // Act
        const result = await service.toggleGlobalPromptStatus(promptId, 0, mockUser.sub, mockUser.username);

        // Assert
        expect(result).toEqual(updatedPrompt);
        expect(result.enabled).toBe(0);
      });
    });

    describe('queryGlobalPrompts', () => {
      it('should return paginated list of global prompts', async () => {
        // Arrange
        const query: QueryPromptsDto = {
          page: 1,
          pageSize: 10,
          keyword: 'politeness',
        };

        const mockPrompts = [
          {
            id: 'prompt-001',
            name: 'Politeness Standard',
            content: 'Be polite',
            enabled: 1,
            platform_id: mockUser.platform_id,
          },
          {
            id: 'prompt-002',
            name: 'Politeness Guidelines',
            content: 'Guidelines for politeness',
            enabled: 1,
            platform_id: mockUser.platform_id,
          },
        ];

        prismaService.service_quality_prompt_global.findMany.mockResolvedValue(mockPrompts);
        prismaService.service_quality_prompt_global.count.mockResolvedValue(2);

        // Act
        const result = await service.queryGlobalPrompts(query, mockUser.sub);

        // Assert
        expect(result.data).toEqual(mockPrompts);
        expect(result.total).toBe(2);
        expect(result.page).toBe(1);
        expect(result.pageSize).toBe(10);
      });
    });
  });

  /**
   * Test Suite 2: Department Prompt CRUD Operations
   * **Validates: Requirements 4.1-4.8**
   */
  describe('Department Prompt CRUD Operations', () => {
    describe('createDepartmentPrompt', () => {
      it('should create department prompt without conflicts', async () => {
        // Arrange
        const dto: SaveDepartmentPromptDto = {
          name: 'Department Specific Rule',
          content: 'Department specific quality standard.',
          applicable_scenarios: 'Department operations',
          enabled: 1,
          sort: 1,
          parent_global_prompt_id: null,
        };

        const mockCreatedPrompt = {
          id: 'dept-prompt-001',
          ...dto,
          platform_id: mockUser.platform_id,
          dept_id: mockUser.dept_id,
          version: 1,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: mockUser.sub,
          updated_by: mockUser.sub,
        };

        // Mock conflict validation to pass
        jest.spyOn(conflictValidator, 'validateDepartmentPrompt').mockResolvedValue({
          hasConflict: false,
          conflicts: [],
        });

        prismaService.service_quality_prompt_department.create.mockResolvedValue(mockCreatedPrompt);
        prismaService.service_quality_prompt_version.create.mockResolvedValue({});
        prismaService.service_quality_prompt_audit_log.create.mockResolvedValue({});

        // Act
        const result = await service.createDepartmentPrompt(dto, mockUser.sub, mockUser.username);

        // Assert
        expect(result).toEqual(mockCreatedPrompt);
        expect(conflictValidator.validateDepartmentPrompt).toHaveBeenCalled();
      });

      it('should reject department prompt with conflicts', async () => {
        // Arrange
        const dto: SaveDepartmentPromptDto = {
          name: 'Conflicting Rule',
          content: 'Never greet customers', // Conflicts with global politeness rule
          applicable_scenarios: 'Department operations',
          enabled: 1,
          sort: 1,
          parent_global_prompt_id: null,
        };

        // Mock conflict validation to fail
        jest.spyOn(conflictValidator, 'validateDepartmentPrompt').mockResolvedValue({
          hasConflict: true,
          conflicts: [
            {
              globalPromptId: 'global-001',
              globalPromptName: 'Politeness Standard',
              conflictLocation: 'content',
              conflictingContent: 'Never greet customers',
              suggestion: 'Remove contradictory statement',
            },
          ],
        });

        // Act & Assert
        await expect(
          service.createDepartmentPrompt(dto, mockUser.sub, mockUser.username)
        ).rejects.toThrow(/conflict detected/i);
      });
    });

    describe('updateDepartmentPrompt', () => {
      it('should update department prompt and validate conflicts', async () => {
        // Arrange
        const promptId = 'dept-prompt-001';
        const dto: SaveDepartmentPromptDto = {
          name: 'Updated Department Rule',
          content: 'Updated department specific standard.',
          applicable_scenarios: 'Department operations',
          enabled: 1,
          sort: 1,
          parent_global_prompt_id: null,
        };

        const existingPrompt = {
          id: promptId,
          name: 'Department Rule',
          content: 'Original content',
          platform_id: mockUser.platform_id,
          dept_id: mockUser.dept_id,
          version: 1,
        };

        const updatedPrompt = {
          ...existingPrompt,
          ...dto,
          version: 2,
        };

        jest.spyOn(conflictValidator, 'validateDepartmentPrompt').mockResolvedValue({
          hasConflict: false,
          conflicts: [],
        });

        prismaService.service_quality_prompt_department.findUnique.mockResolvedValue(existingPrompt);
        prismaService.service_quality_prompt_department.update.mockResolvedValue(updatedPrompt);
        prismaService.service_quality_prompt_version.create.mockResolvedValue({});
        prismaService.service_quality_prompt_audit_log.create.mockResolvedValue({});

        // Act
        const result = await service.updateDepartmentPrompt(promptId, dto, mockUser.sub, mockUser.username);

        // Assert
        expect(result).toEqual(updatedPrompt);
        expect(result.version).toBe(2);
      });
    });

    describe('deleteDepartmentPrompt', () => {
      it('should successfully delete department prompt', async () => {
        // Arrange
        const promptId = 'dept-prompt-001';

        const existingPrompt = {
          id: promptId,
          name: 'Department Prompt',
          platform_id: mockUser.platform_id,
          dept_id: mockUser.dept_id,
        };

        prismaService.service_quality_prompt_department.findUnique.mockResolvedValue(existingPrompt);
        prismaService.service_quality_prompt_department.delete.mockResolvedValue(existingPrompt);
        prismaService.service_quality_prompt_audit_log.create.mockResolvedValue({});

        // Act
        const result = await service.deleteDepartmentPrompt(promptId, mockUser.sub, mockUser.username);

        // Assert
        expect(result).toEqual({ success: true, message: expect.any(String) });
        expect(prismaService.service_quality_prompt_department.delete).toHaveBeenCalled();
      });
    });
  });

  /**
   * Test Suite 3: Conflict Validation Logic
   * **Validates: Requirements 5.1-5.6**
   */
  describe('Conflict Validation', () => {
    it('should detect keyword-based conflicts', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-001',
          name: 'Greeting Standard',
          content: 'Always greet customers with "Hello" or "Good morning"',
        },
      ];

      const departmentContent = 'Never use greetings like "Hello"';

      // Act
      const result = await conflictValidator.detectKeywordConflicts(
        departmentContent,
        globalPrompts
      );

      // Assert
      expect(result.hasConflict).toBe(true);
      expect(result.conflicts.length).toBeGreaterThan(0);
    });

    it('should not detect conflicts when content is compatible', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-001',
          name: 'Greeting Standard',
          content: 'Always greet customers politely',
        },
      ];

      const departmentContent = 'Use formal greetings for VIP customers';

      // Act
      const result = await conflictValidator.detectKeywordConflicts(
        departmentContent,
        globalPrompts
      );

      // Assert
      expect(result.hasConflict).toBe(false);
      expect(result.conflicts.length).toBe(0);
    });
  });

  /**
   * Test Suite 4: Version Management
   * **Validates: Requirements 6.1-6.7**
   */
  describe('Version Management', () => {
    it('should create version record on prompt creation', async () => {
      // Arrange
      const promptId = 'prompt-001';
      const promptType = 'global';
      const versionNumber = 1;
      const content = { name: 'Test', content: 'Test content' };

      // Act
      await versionManager.createVersion(promptId, promptType, versionNumber, content, mockUser.sub);

      // Assert
      expect(prismaService.service_quality_prompt_version.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          prompt_id: promptId,
          prompt_type: promptType,
          version_number: versionNumber,
          content_snapshot: JSON.stringify(content),
          created_by: mockUser.sub,
        }),
      });
    });

    it('should retrieve version history for a prompt', async () => {
      // Arrange
      const promptId = 'prompt-001';
      const mockVersions = [
        {
          id: 'version-001',
          prompt_id: promptId,
          version_number: 1,
          content_snapshot: '{"name":"V1"}',
          created_at: new Date('2024-01-01'),
        },
        {
          id: 'version-002',
          prompt_id: promptId,
          version_number: 2,
          content_snapshot: '{"name":"V2"}',
          created_at: new Date('2024-01-02'),
        },
      ];

      prismaService.service_quality_prompt_version.findMany.mockResolvedValue(mockVersions);

      // Act
      const result = await versionManager.getVersionHistory(promptId);

      // Assert
      expect(result).toEqual(mockVersions);
      expect(result.length).toBe(2);
    });
  });

  /**
   * Test Suite 5: Permission Control
   * **Validates: Requirements 2.1-2.8**
   */
  describe('Permission Control', () => {
    it('should allow Super Admin to access all global prompts', async () => {
      // Arrange
      const superAdminUser = { ...mockUser, roles: ['super_admin'] };
      const query: QueryPromptsDto = { page: 1, pageSize: 10 };

      prismaService.service_quality_prompt_global.findMany.mockResolvedValue([]);
      prismaService.service_quality_prompt_global.count.mockResolvedValue(0);

      // Act
      const result = await service.queryGlobalPrompts(query, superAdminUser.sub);

      // Assert
      expect(result).toBeDefined();
      expect(scopeService.applyScope).toHaveBeenCalled();
    });

    it('should restrict Department Manager to their department prompts only', async () => {
      // Arrange
      const deptManagerUser = { ...mockUser, roles: ['department_manager'] };
      const query: QueryPromptsDto = { page: 1, pageSize: 10 };

      prismaService.service_quality_prompt_department.findMany.mockResolvedValue([]);
      prismaService.service_quality_prompt_department.count.mockResolvedValue(0);

      // Act
      const result = await service.queryDepartmentPrompts(query, deptManagerUser.sub);

      // Assert
      expect(result).toBeDefined();
      expect(scopeService.applyScope).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ sub: deptManagerUser.sub })
      );
    });
  });

  /**
   * Test Suite 6: Batch Operations
   * **Validates: Requirements 9.1-9.7**
   */
  describe('Batch Operations', () => {
    describe('batchEnablePrompts', () => {
      it('should enable multiple prompts at once', async () => {
        // Arrange
        const dto: BatchPromptOperationDto = {
          ids: ['prompt-001', 'prompt-002', 'prompt-003'],
        };

        const mockPrompts = dto.ids.map((id) => ({
          id,
          name: `Prompt ${id}`,
          enabled: 0,
          platform_id: mockUser.platform_id,
        }));

        prismaService.service_quality_prompt_global.findMany.mockResolvedValue(mockPrompts);
        prismaService.service_quality_prompt_global.update.mockResolvedValue({});
        prismaService.service_quality_prompt_audit_log.create.mockResolvedValue({});

        // Act
        const result = await service.batchEnablePrompts(dto, 'global', mockUser.sub, mockUser.username);

        // Assert
        expect(result.success).toBe(true);
        expect(result.successCount).toBe(3);
        expect(result.failureCount).toBe(0);
      });
    });

    describe('batchDisablePrompts', () => {
      it('should disable multiple prompts at once', async () => {
        // Arrange
        const dto: BatchPromptOperationDto = {
          ids: ['prompt-001', 'prompt-002'],
        };

        const mockPrompts = dto.ids.map((id) => ({
          id,
          name: `Prompt ${id}`,
          enabled: 1,
          platform_id: mockUser.platform_id,
        }));

        prismaService.service_quality_prompt_global.findMany.mockResolvedValue(mockPrompts);
        prismaService.service_quality_prompt_global.update.mockResolvedValue({});
        prismaService.service_quality_prompt_audit_log.create.mockResolvedValue({});

        // Act
        const result = await service.batchDisablePrompts(dto, 'global', mockUser.sub, mockUser.username);

        // Assert
        expect(result.success).toBe(true);
        expect(result.successCount).toBe(2);
        expect(result.failureCount).toBe(0);
      });
    });
  });

  /**
   * Test Suite 7: Cache Invalidation
   * **Validates: Requirements 22.1-22.6**
   */
  describe('Cache Invalidation', () => {
    it('should invalidate cache when global prompt is updated', async () => {
      // Arrange
      const promptId = 'prompt-001';
      const dto: SaveGlobalPromptDto = {
        name: 'Updated Prompt',
        content: 'Updated content',
        applicable_scenarios: 'All',
        enabled: 1,
        sort: 1,
      };

      const existingPrompt = {
        id: promptId,
        platform_id: mockUser.platform_id,
        version: 1,
      };

      prismaService.service_quality_prompt_global.findUnique.mockResolvedValue(existingPrompt);
      prismaService.service_quality_prompt_global.update.mockResolvedValue({ ...existingPrompt, ...dto });
      prismaService.service_quality_prompt_version.create.mockResolvedValue({});
      prismaService.service_quality_prompt_audit_log.create.mockResolvedValue({});
      redisService.keys.mockResolvedValue([
        `quality-inspection:${mockUser.platform_id}:dept-001`,
        `quality-inspection:${mockUser.platform_id}:dept-002`,
      ]);

      // Act
      await service.updateGlobalPrompt(promptId, dto, mockUser.sub, mockUser.username);

      // Assert
      expect(redisService.keys).toHaveBeenCalledWith(`quality-inspection:${mockUser.platform_id}:*`);
      expect(redisService.del).toHaveBeenCalled();
    });

    it('should invalidate cache only for specific department when department prompt is updated', async () => {
      // Arrange
      const promptId = 'dept-prompt-001';
      const dto: SaveDepartmentPromptDto = {
        name: 'Updated Dept Prompt',
        content: 'Updated content',
        applicable_scenarios: 'Department',
        enabled: 1,
        sort: 1,
        parent_global_prompt_id: null,
      };

      const existingPrompt = {
        id: promptId,
        platform_id: mockUser.platform_id,
        dept_id: mockUser.dept_id,
        version: 1,
      };

      jest.spyOn(conflictValidator, 'validateDepartmentPrompt').mockResolvedValue({
        hasConflict: false,
        conflicts: [],
      });

      prismaService.service_quality_prompt_department.findUnique.mockResolvedValue(existingPrompt);
      prismaService.service_quality_prompt_department.update.mockResolvedValue({ ...existingPrompt, ...dto });
      prismaService.service_quality_prompt_version.create.mockResolvedValue({});
      prismaService.service_quality_prompt_audit_log.create.mockResolvedValue({});

      // Act
      await service.updateDepartmentPrompt(promptId, dto, mockUser.sub, mockUser.username);

      // Assert
      expect(redisService.del).toHaveBeenCalledWith(
        `quality-inspection:${mockUser.platform_id}:${mockUser.dept_id}`
      );
    });
  });
});
