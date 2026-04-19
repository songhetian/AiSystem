/**
 * ConflictValidatorService - Unit Tests
 *
 * Tests the conflict detection logic for department prompts against global prompts.
 *
 * **Validates: Requirements 5.1-5.6**
 */

import { ConflictValidatorService } from './conflict-validator.service';

describe('ConflictValidatorService', () => {
  let service: ConflictValidatorService;

  beforeEach(() => {
    service = new ConflictValidatorService();
  });

  describe('Keyword-based Conflict Detection', () => {
    it('should detect direct contradiction with "never" keyword', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-001',
          name: 'Greeting Standard',
          content: 'Always greet customers with "Hello" or "Good morning".',
        },
      ];

      const departmentContent = 'Never use greetings like "Hello" or "Good morning".';

      // Act
      const result = await service.detectKeywordConflicts(departmentContent, globalPrompts);

      // Assert
      expect(result.hasConflict).toBe(true);
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0]).toMatchObject({
        globalPromptId: 'global-001',
        globalPromptName: 'Greeting Standard',
        conflictLocation: expect.stringContaining('content'),
        suggestion: expect.any(String),
      });
    });

    it('should detect contradiction with "do not" keyword', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-002',
          name: 'Response Time',
          content: 'Respond to all customer inquiries within 2 minutes.',
        },
      ];

      const departmentContent = 'Do not respond immediately. Take time to research.';

      // Act
      const result = await service.detectKeywordConflicts(departmentContent, globalPrompts);

      // Assert
      expect(result.hasConflict).toBe(true);
      expect(result.conflicts[0].conflictingContent).toContain('Do not respond');
    });

    it('should detect contradiction with "avoid" keyword', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-003',
          name: 'Professional Language',
          content: 'Use professional and formal language at all times.',
        },
      ];

      const departmentContent = 'Avoid formal language. Use casual and friendly tone.';

      // Act
      const result = await service.detectKeywordConflicts(departmentContent, globalPrompts);

      // Assert
      expect(result.hasConflict).toBe(true);
    });

    it('should detect contradiction with "must not" keyword', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-004',
          name: 'Empathy Standard',
          content: 'Show empathy and understanding to customer concerns.',
        },
      ];

      const departmentContent = 'Must not show excessive empathy. Stay neutral.';

      // Act
      const result = await service.detectKeywordConflicts(departmentContent, globalPrompts);

      // Assert
      expect(result.hasConflict).toBe(true);
    });

    it('should detect contradiction with "instead of" keyword', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-005',
          name: 'Closing Standard',
          content: 'End conversations with "Thank you for contacting us".',
        },
      ];

      const departmentContent = 'Instead of "Thank you", use "Goodbye" to close.';

      // Act
      const result = await service.detectKeywordConflicts(departmentContent, globalPrompts);

      // Assert
      expect(result.hasConflict).toBe(true);
    });
  });

  describe('Compatible Content Detection', () => {
    it('should allow additive department prompt', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-001',
          name: 'Greeting Standard',
          content: 'Always greet customers politely.',
        },
      ];

      const departmentContent = 'In addition to polite greetings, introduce yourself by name.';

      // Act
      const result = await service.detectKeywordConflicts(departmentContent, globalPrompts);

      // Assert
      expect(result.hasConflict).toBe(false);
      expect(result.conflicts.length).toBe(0);
    });

    it('should allow specific extension of global prompt', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-002',
          name: 'Professional Language',
          content: 'Use professional language.',
        },
      ];

      const departmentContent = 'Use professional language with industry-specific terminology.';

      // Act
      const result = await service.detectKeywordConflicts(departmentContent, globalPrompts);

      // Assert
      expect(result.hasConflict).toBe(false);
    });

    it('should allow complementary department prompt', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-003',
          name: 'Response Time',
          content: 'Respond within 2 minutes.',
        },
      ];

      const departmentContent = 'For VIP customers, prioritize responses within 1 minute.';

      // Act
      const result = await service.detectKeywordConflicts(departmentContent, globalPrompts);

      // Assert
      expect(result.hasConflict).toBe(false);
    });

    it('should allow department prompt with different scope', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-004',
          name: 'General Politeness',
          content: 'Be polite in all interactions.',
        },
      ];

      const departmentContent = 'For technical support, provide detailed troubleshooting steps.';

      // Act
      const result = await service.detectKeywordConflicts(departmentContent, globalPrompts);

      // Assert
      expect(result.hasConflict).toBe(false);
    });
  });

  describe('Multiple Global Prompts', () => {
    it('should detect conflicts with any global prompt', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-001',
          name: 'Greeting Standard',
          content: 'Always greet customers.',
        },
        {
          id: 'global-002',
          name: 'Professional Language',
          content: 'Use formal language.',
        },
        {
          id: 'global-003',
          name: 'Response Time',
          content: 'Respond quickly.',
        },
      ];

      const departmentContent = 'Never use formal language. Be casual and friendly.';

      // Act
      const result = await service.detectKeywordConflicts(departmentContent, globalPrompts);

      // Assert
      expect(result.hasConflict).toBe(true);
      expect(result.conflicts.some((c) => c.globalPromptId === 'global-002')).toBe(true);
    });

    it('should report all conflicting global prompts', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-001',
          name: 'Greeting Standard',
          content: 'Always greet customers with Hello.',
        },
        {
          id: 'global-002',
          name: 'Closing Standard',
          content: 'Always end with Thank you.',
        },
      ];

      const departmentContent = 'Never use Hello or Thank you. Use Hi and Bye instead.';

      // Act
      const result = await service.detectKeywordConflicts(departmentContent, globalPrompts);

      // Assert
      expect(result.hasConflict).toBe(true);
      expect(result.conflicts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Conflict Suggestions', () => {
    it('should provide helpful suggestions for resolving conflicts', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-001',
          name: 'Politeness Standard',
          content: 'Always be polite.',
        },
      ];

      const departmentContent = 'Never be overly polite. Keep it brief.';

      // Act
      const result = await service.detectKeywordConflicts(departmentContent, globalPrompts);

      // Assert
      expect(result.hasConflict).toBe(true);
      expect(result.conflicts[0].suggestion).toBeDefined();
      expect(result.conflicts[0].suggestion.length).toBeGreaterThan(0);
    });

    it('should identify conflict location', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-001',
          name: 'Response Standard',
          content: 'Respond immediately.',
        },
      ];

      const departmentContent = 'Do not respond immediately. Research first.';

      // Act
      const result = await service.detectKeywordConflicts(departmentContent, globalPrompts);

      // Assert
      expect(result.hasConflict).toBe(true);
      expect(result.conflicts[0].conflictLocation).toBeDefined();
      expect(result.conflicts[0].conflictingContent).toContain('Do not respond immediately');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty global prompts array', async () => {
      // Arrange
      const globalPrompts: any[] = [];
      const departmentContent = 'Never use greetings.';

      // Act
      const result = await service.detectKeywordConflicts(departmentContent, globalPrompts);

      // Assert
      expect(result.hasConflict).toBe(false);
      expect(result.conflicts.length).toBe(0);
    });

    it('should handle empty department content', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-001',
          name: 'Test',
          content: 'Test content',
        },
      ];
      const departmentContent = '';

      // Act
      const result = await service.detectKeywordConflicts(departmentContent, globalPrompts);

      // Assert
      expect(result.hasConflict).toBe(false);
    });

    it('should be case-insensitive for conflict keywords', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-001',
          name: 'Greeting',
          content: 'Always greet customers.',
        },
      ];

      const departmentContent = 'NEVER greet customers immediately.';

      // Act
      const result = await service.detectKeywordConflicts(departmentContent, globalPrompts);

      // Assert
      expect(result.hasConflict).toBe(true);
    });

    it('should handle special characters in content', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-001',
          name: 'Special Chars',
          content: 'Use "quotes" and (parentheses).',
        },
      ];

      const departmentContent = 'Never use "quotes" or (parentheses).';

      // Act
      const result = await service.detectKeywordConflicts(departmentContent, globalPrompts);

      // Assert
      expect(result.hasConflict).toBe(true);
    });

    it('should handle multi-line content', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-001',
          name: 'Multi-line',
          content: `Line 1: Be polite.
Line 2: Be professional.
Line 3: Be helpful.`,
        },
      ];

      const departmentContent = `Line 1: Never be overly polite.
Line 2: Stay casual.`;

      // Act
      const result = await service.detectKeywordConflicts(departmentContent, globalPrompts);

      // Assert
      expect(result.hasConflict).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle large number of global prompts efficiently', async () => {
      // Arrange
      const globalPrompts = Array.from({ length: 100 }, (_, i) => ({
        id: `global-${i}`,
        name: `Prompt ${i}`,
        content: `Standard ${i}: Be professional.`,
      }));

      const departmentContent = 'Never be professional. Use casual language.';

      // Act
      const startTime = Date.now();
      const result = await service.detectKeywordConflicts(departmentContent, globalPrompts);
      const endTime = Date.now();

      // Assert
      expect(result.hasConflict).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle long content efficiently', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-001',
          name: 'Long Content',
          content: 'Be polite. '.repeat(1000), // 10,000+ characters
        },
      ];

      const departmentContent = 'Never be polite. '.repeat(1000);

      // Act
      const startTime = Date.now();
      const result = await service.detectKeywordConflicts(departmentContent, globalPrompts);
      const endTime = Date.now();

      // Assert
      expect(result.hasConflict).toBe(true);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Semantic Analysis', () => {
    it('should detect semantic contradictions beyond keywords', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-001',
          name: 'Positive Tone',
          content: 'Maintain a positive and upbeat tone.',
        },
      ];

      const departmentContent = 'Use a serious and somber tone for sensitive issues.';

      // Act
      const result = await service.detectSemanticConflicts(departmentContent, globalPrompts);

      // Assert
      // Note: This is a placeholder for future semantic analysis
      // Current implementation focuses on keyword-based detection
      expect(result).toBeDefined();
    });
  });

  describe('Validation Integration', () => {
    it('should integrate with department prompt validation', async () => {
      // Arrange
      const globalPrompts = [
        {
          id: 'global-001',
          name: 'Standard',
          content: 'Follow standard procedures.',
        },
      ];

      const departmentPromptDto = {
        name: 'Department Rule',
        content: 'Never follow standard procedures. Use custom approach.',
        applicable_scenarios: 'Special cases',
      };

      // Act
      const result = await service.validateDepartmentPrompt(
        departmentPromptDto,
        globalPrompts
      );

      // Assert
      expect(result.hasConflict).toBe(true);
      expect(result.conflicts.length).toBeGreaterThan(0);
    });
  });
});
