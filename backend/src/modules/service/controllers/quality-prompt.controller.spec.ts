import { Test, TestingModule } from '@nestjs/testing';
import { QualityPromptController } from './quality-prompt.controller';
import { QualityPromptService } from '../services/quality-prompt.service';
import { TemplateLibraryService } from '../services/template-library.service';
import { VersionManagerService } from '../services/version-manager.service';
import { QualityInspectionHelperService } from '../services/quality-inspection-helper.service';
import { PreviewPromptDto } from '../dto/preview-prompt.dto';

describe('QualityPromptController - Preview Endpoint', () => {
  let controller: QualityPromptController;
  let qualityInspectionHelperService: QualityInspectionHelperService;

  const mockQualityPromptService = {
    queryGlobalPrompts: jest.fn(),
    getGlobalPromptById: jest.fn(),
  };

  const mockTemplateLibraryService = {
    queryTemplates: jest.fn(),
  };

  const mockVersionManagerService = {
    getVersionHistory: jest.fn(),
  };

  const mockQualityInspectionHelperService = {
    checkPromptViolations: jest.fn(),
    generatePromptSuggestions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QualityPromptController],
      providers: [
        {
          provide: QualityPromptService,
          useValue: mockQualityPromptService,
        },
        {
          provide: TemplateLibraryService,
          useValue: mockTemplateLibraryService,
        },
        {
          provide: VersionManagerService,
          useValue: mockVersionManagerService,
        },
        {
          provide: QualityInspectionHelperService,
          useValue: mockQualityInspectionHelperService,
        },
      ],
    }).compile();

    controller = module.get<QualityPromptController>(QualityPromptController);
    qualityInspectionHelperService = module.get<QualityInspectionHelperService>(
      QualityInspectionHelperService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('previewPrompt', () => {
    it('should execute quality inspection and return preview results without persisting', async () => {
      // Arrange
      const dto: PreviewPromptDto = {
        content: '禁止使用粗俗语言。必须使用礼貌用语。',
        test_conversation: '你好，请问有什么可以帮助您的吗？',
      };

      const mockUser = {
        sub: 'user-123',
        username: 'testuser',
        platform_id: 'platform-1',
        dept_id: 'dept-1',
        shop_id: null,
      };

      const mockViolations = [
        {
          source: 'global' as const,
          rule: '未满足规则：必须使用礼貌用语',
          deduction: 3,
          promptId: 'preview-temp',
          promptName: 'Preview Prompt',
        },
      ];

      const mockSuggestions = ['存在1项全局质检标准违规，建议加强客服培训和话术规范。'];

      mockQualityInspectionHelperService.checkPromptViolations.mockReturnValue(mockViolations);
      mockQualityInspectionHelperService.generatePromptSuggestions.mockReturnValue(mockSuggestions);

      // Act
      const result = await controller.previewPrompt(mockUser, dto);

      // Assert
      expect(result).toEqual({
        score: 97, // 100 - 3
        violations: [
          {
            source: 'global',
            rule: '未满足规则：必须使用礼貌用语',
            deduction: 3,
            promptId: 'preview-temp',
            promptName: 'Preview Prompt',
          },
        ],
        suggestions: mockSuggestions,
        summary: {
          totalViolations: 1,
          totalDeduction: 3,
          passed: true, // 97 >= 60
        },
      });

      expect(qualityInspectionHelperService.checkPromptViolations).toHaveBeenCalledWith(
        dto.test_conversation,
        {
          globalPrompts: [
            {
              id: 'preview-temp',
              name: 'Preview Prompt',
              content: dto.content,
              source: 'global',
            },
          ],
          departmentPrompts: [],
        },
      );

      expect(qualityInspectionHelperService.generatePromptSuggestions).toHaveBeenCalledWith(mockViolations);
    });

    it('should return score 0 when total deduction exceeds 100', async () => {
      // Arrange
      const dto: PreviewPromptDto = {
        content: '禁止使用粗俗语言。',
        test_conversation: '这个产品真垃圾！',
      };

      const mockUser = {
        sub: 'user-123',
        username: 'testuser',
        platform_id: 'platform-1',
        dept_id: 'dept-1',
        shop_id: null,
      };

      const mockViolations = Array(25).fill({
        source: 'global' as const,
        rule: '违反规则：禁止使用粗俗语言',
        deduction: 5,
        promptId: 'preview-temp',
        promptName: 'Preview Prompt',
      });

      mockQualityInspectionHelperService.checkPromptViolations.mockReturnValue(mockViolations);
      mockQualityInspectionHelperService.generatePromptSuggestions.mockReturnValue([]);

      // Act
      const result = await controller.previewPrompt(mockUser, dto);

      // Assert
      expect(result.score).toBe(0); // Math.max(0, 100 - 125)
      expect(result.summary.totalDeduction).toBe(125);
      expect(result.summary.passed).toBe(false);
    });

    it('should return perfect score when no violations found', async () => {
      // Arrange
      const dto: PreviewPromptDto = {
        content: '必须使用礼貌用语。',
        test_conversation: '您好，请问有什么可以帮助您的吗？',
      };

      const mockUser = {
        sub: 'user-123',
        username: 'testuser',
        platform_id: 'platform-1',
        dept_id: 'dept-1',
        shop_id: null,
      };

      mockQualityInspectionHelperService.checkPromptViolations.mockReturnValue([]);
      mockQualityInspectionHelperService.generatePromptSuggestions.mockReturnValue([]);

      // Act
      const result = await controller.previewPrompt(mockUser, dto);

      // Assert
      expect(result.score).toBe(100);
      expect(result.violations).toEqual([]);
      expect(result.suggestions).toEqual([]);
      expect(result.summary).toEqual({
        totalViolations: 0,
        totalDeduction: 0,
        passed: true,
      });
    });
  });
});
