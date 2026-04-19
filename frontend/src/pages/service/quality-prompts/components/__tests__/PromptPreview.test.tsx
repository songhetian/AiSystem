/**
 * PromptPreview Component Tests
 *
 * Tests preview functionality for quality inspection prompts.
 *
 * **Validates: Requirements 10.1-10.7**
 *
 * Note: This test file requires @testing-library/react and @testing-library/jest-dom
 * to be installed in the frontend project.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PromptPreview } from '../PromptPreview';
import qualityPromptApi from '@/api/quality-prompt';

// Mock the API
jest.mock('@/api/quality-prompt');

// Mock antd message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

describe('PromptPreview Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      open: true,
      onClose: jest.fn(),
      promptContent: 'Always greet customers politely.',
      promptType: 'global' as const,
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <PromptPreview {...defaultProps} {...props} />
      </QueryClientProvider>
    );
  };

  describe('Preview Dialog Display', () => {
    it('should display preview dialog when open', () => {
      // Act
      renderComponent();

      // Assert
      expect(screen.getByText(/预览质检效果/i)).toBeInTheDocument();
    });

    it('should not display dialog when closed', () => {
      // Act
      renderComponent({ open: false });

      // Assert
      expect(screen.queryByText(/预览质检效果/i)).not.toBeInTheDocument();
    });

    it('should display prompt content in preview', () => {
      // Arrange
      const promptContent = 'Test prompt content for preview';

      // Act
      renderComponent({ promptContent });

      // Assert
      expect(screen.getByText(/Test prompt content for preview/i)).toBeInTheDocument();
    });
  });

  describe('Test Conversation Input', () => {
    it('should allow user to input test conversation', () => {
      // Act
      renderComponent();

      const textarea = screen.getByPlaceholderText(/请输入测试对话内容/i);
      fireEvent.change(textarea, {
        target: { value: 'Customer: Hello\nAgent: Hi there!' },
      });

      // Assert
      expect(textarea).toHaveValue('Customer: Hello\nAgent: Hi there!');
    });

    it('should validate required test conversation input', async () => {
      // Act
      renderComponent();

      const previewButton = screen.getByText('开始预览');
      fireEvent.click(previewButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/请输入测试对话内容/i)).toBeInTheDocument();
      });
    });

    it('should enforce maximum length for test conversation', () => {
      // Act
      renderComponent();

      const textarea = screen.getByPlaceholderText(/请输入测试对话内容/i);
      const longText = 'a'.repeat(10001); // Exceeds max length

      fireEvent.change(textarea, { target: { value: longText } });

      // Assert
      // Antd Form validation should show error
      expect(textarea.value.length).toBeLessThanOrEqual(10000);
    });
  });

  describe('Quality Inspection Execution', () => {
    it('should execute quality inspection with test conversation', async () => {
      // Arrange
      const mockPreviewResult = {
        score: 85,
        violations: [
          {
            type: 'politeness',
            severity: 'warning',
            message: 'Could be more polite',
            location: 'Line 2',
          },
        ],
        suggestions: ['Add greeting at the beginning'],
        passed: true,
      };

      (qualityPromptApi.previewPrompt as jest.Mock).mockResolvedValue(mockPreviewResult);

      // Act
      renderComponent();

      const textarea = screen.getByPlaceholderText(/请输入测试对话内容/i);
      fireEvent.change(textarea, {
        target: { value: 'Customer: Hello\nAgent: Hi' },
      });

      const previewButton = screen.getByText('开始预览');
      fireEvent.click(previewButton);

      // Assert
      await waitFor(() => {
        expect(qualityPromptApi.previewPrompt).toHaveBeenCalledWith({
          promptContent: 'Always greet customers politely.',
          testConversation: 'Customer: Hello\nAgent: Hi',
          promptType: 'global',
        });
      });
    });

    it('should display inspection results after execution', async () => {
      // Arrange
      const mockPreviewResult = {
        score: 90,
        violations: [],
        suggestions: ['Great job!'],
        passed: true,
      };

      (qualityPromptApi.previewPrompt as jest.Mock).mockResolvedValue(mockPreviewResult);

      // Act
      renderComponent();

      const textarea = screen.getByPlaceholderText(/请输入测试对话内容/i);
      fireEvent.change(textarea, {
        target: { value: 'Customer: Hello\nAgent: Good morning!' },
      });

      const previewButton = screen.getByText('开始预览');
      fireEvent.click(previewButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/质检分数/i)).toBeInTheDocument();
        expect(screen.getByText('90')).toBeInTheDocument();
        expect(screen.getByText(/Great job!/i)).toBeInTheDocument();
      });
    });

    it('should display violations when inspection fails', async () => {
      // Arrange
      const mockPreviewResult = {
        score: 60,
        violations: [
          {
            type: 'politeness',
            severity: 'error',
            message: 'Missing greeting',
            location: 'Line 1',
          },
          {
            type: 'compliance',
            severity: 'warning',
            message: 'Informal language used',
            location: 'Line 3',
          },
        ],
        suggestions: ['Add proper greeting', 'Use formal language'],
        passed: false,
      };

      (qualityPromptApi.previewPrompt as jest.Mock).mockResolvedValue(mockPreviewResult);

      // Act
      renderComponent();

      const textarea = screen.getByPlaceholderText(/请输入测试对话内容/i);
      fireEvent.change(textarea, {
        target: { value: 'Customer: Hello\nAgent: Hey' },
      });

      const previewButton = screen.getByText('开始预览');
      fireEvent.click(previewButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Missing greeting/i)).toBeInTheDocument();
        expect(screen.getByText(/Informal language used/i)).toBeInTheDocument();
        expect(screen.getByText(/Add proper greeting/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during inspection', async () => {
      // Arrange
      (qualityPromptApi.previewPrompt as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      // Act
      renderComponent();

      const textarea = screen.getByPlaceholderText(/请输入测试对话内容/i);
      fireEvent.change(textarea, {
        target: { value: 'Test conversation' },
      });

      const previewButton = screen.getByText('开始预览');
      fireEvent.click(previewButton);

      // Assert
      expect(screen.getByText(/执行中/i)).toBeInTheDocument();
    });

    it('should handle inspection error gracefully', async () => {
      // Arrange
      (qualityPromptApi.previewPrompt as jest.Mock).mockRejectedValue(
        new Error('Inspection service unavailable')
      );

      // Act
      renderComponent();

      const textarea = screen.getByPlaceholderText(/请输入测试对话内容/i);
      fireEvent.change(textarea, {
        target: { value: 'Test conversation' },
      });

      const previewButton = screen.getByText('开始预览');
      fireEvent.click(previewButton);

      // Assert
      await waitFor(() => {
        const { message } = require('antd');
        expect(message.error).toHaveBeenCalledWith(
          expect.stringContaining('Inspection service unavailable')
        );
      });
    });
  });

  describe('Re-run Preview', () => {
    it('should allow modifying prompt and re-running preview', async () => {
      // Arrange
      const mockPreviewResult1 = { score: 80, violations: [], suggestions: [], passed: true };
      const mockPreviewResult2 = { score: 95, violations: [], suggestions: [], passed: true };

      (qualityPromptApi.previewPrompt as jest.Mock)
        .mockResolvedValueOnce(mockPreviewResult1)
        .mockResolvedValueOnce(mockPreviewResult2);

      // Act
      renderComponent();

      // First preview
      const textarea = screen.getByPlaceholderText(/请输入测试对话内容/i);
      fireEvent.change(textarea, { target: { value: 'Test 1' } });

      let previewButton = screen.getByText('开始预览');
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(screen.getByText('80')).toBeInTheDocument();
      });

      // Modify and re-run
      fireEvent.change(textarea, { target: { value: 'Test 2 - improved' } });

      previewButton = screen.getByText('重新预览');
      fireEvent.click(previewButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('95')).toBeInTheDocument();
        expect(qualityPromptApi.previewPrompt).toHaveBeenCalledTimes(2);
      });
    });

    it('should clear previous results when re-running preview', async () => {
      // Arrange
      const mockPreviewResult1 = {
        score: 70,
        violations: [{ type: 'error', message: 'Old error' }],
        suggestions: [],
        passed: false,
      };
      const mockPreviewResult2 = {
        score: 100,
        violations: [],
        suggestions: ['Perfect!'],
        passed: true,
      };

      (qualityPromptApi.previewPrompt as jest.Mock)
        .mockResolvedValueOnce(mockPreviewResult1)
        .mockResolvedValueOnce(mockPreviewResult2);

      // Act
      renderComponent();

      const textarea = screen.getByPlaceholderText(/请输入测试对话内容/i);
      fireEvent.change(textarea, { target: { value: 'Test 1' } });

      let previewButton = screen.getByText('开始预览');
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(screen.getByText(/Old error/i)).toBeInTheDocument();
      });

      // Re-run
      fireEvent.change(textarea, { target: { value: 'Test 2' } });
      previewButton = screen.getByText('重新预览');
      fireEvent.click(previewButton);

      // Assert
      await waitFor(() => {
        expect(screen.queryByText(/Old error/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Perfect!/i)).toBeInTheDocument();
      });
    });
  });

  describe('Results Not Persisted', () => {
    it('should not persist preview results to database', async () => {
      // Arrange
      const mockPreviewResult = {
        score: 85,
        violations: [],
        suggestions: [],
        passed: true,
      };

      (qualityPromptApi.previewPrompt as jest.Mock).mockResolvedValue(mockPreviewResult);

      // Act
      renderComponent();

      const textarea = screen.getByPlaceholderText(/请输入测试对话内容/i);
      fireEvent.change(textarea, { target: { value: 'Test conversation' } });

      const previewButton = screen.getByText('开始预览');
      fireEvent.click(previewButton);

      // Assert
      await waitFor(() => {
        expect(qualityPromptApi.previewPrompt).toHaveBeenCalledWith(
          expect.objectContaining({
            // Should not include any save/persist flags
            promptContent: expect.any(String),
            testConversation: expect.any(String),
          })
        );
      });

      // Verify no save/create API calls were made
      expect(qualityPromptApi.createGlobalPrompt).not.toHaveBeenCalled();
      expect(qualityPromptApi.createDepartmentPrompt).not.toHaveBeenCalled();
    });
  });

  describe('Modal Behavior', () => {
    it('should call onClose when cancel button is clicked', () => {
      // Arrange
      const onClose = jest.fn();

      // Act
      renderComponent({ onClose });

      const cancelButton = screen.getByText('取消');
      fireEvent.click(cancelButton);

      // Assert
      expect(onClose).toHaveBeenCalled();
    });

    it('should reset form when modal is closed and reopened', async () => {
      // Arrange
      const { rerender } = renderComponent({ open: true });

      const textarea = screen.getByPlaceholderText(/请输入测试对话内容/i);
      fireEvent.change(textarea, { target: { value: 'Test content' } });

      // Close modal
      rerender(
        <QueryClientProvider client={queryClient}>
          <PromptPreview
            open={false}
            onClose={jest.fn()}
            promptContent="Test"
            promptType="global"
          />
        </QueryClientProvider>
      );

      // Reopen modal
      rerender(
        <QueryClientProvider client={queryClient}>
          <PromptPreview
            open={true}
            onClose={jest.fn()}
            promptContent="Test"
            promptType="global"
          />
        </QueryClientProvider>
      );

      // Assert
      const newTextarea = screen.getByPlaceholderText(/请输入测试对话内容/i);
      expect(newTextarea).toHaveValue('');
    });
  });

  describe('Department Prompt Support', () => {
    it('should support previewing department prompts', async () => {
      // Arrange
      const mockPreviewResult = {
        score: 88,
        violations: [],
        suggestions: [],
        passed: true,
      };

      (qualityPromptApi.previewPrompt as jest.Mock).mockResolvedValue(mockPreviewResult);

      // Act
      renderComponent({ promptType: 'department' });

      const textarea = screen.getByPlaceholderText(/请输入测试对话内容/i);
      fireEvent.change(textarea, { target: { value: 'Test' } });

      const previewButton = screen.getByText('开始预览');
      fireEvent.click(previewButton);

      // Assert
      await waitFor(() => {
        expect(qualityPromptApi.previewPrompt).toHaveBeenCalledWith(
          expect.objectContaining({
            promptType: 'department',
          })
        );
      });
    });
  });
});
