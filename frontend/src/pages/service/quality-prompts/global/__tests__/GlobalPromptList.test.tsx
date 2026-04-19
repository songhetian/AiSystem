/**
 * GlobalPromptList Component Tests
 *
 * Tests global prompt list display, search, sorting, and CRUD operations.
 *
 * **Validates: Requirements 3.1-3.8**
 *
 * Note: This test file requires @testing-library/react and @testing-library/jest-dom
 * to be installed in the frontend project.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GlobalPromptList from '../index';
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

// Mock useDebounce hook
jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: any) => value,
}));

describe('GlobalPromptList Component', () => {
  let queryClient: QueryClient;

  const mockPrompts = [
    {
      id: 'prompt-001',
      name: 'Politeness Standard',
      content: 'Always greet customers politely.',
      applicable_scenarios: 'All customer interactions',
      enabled: 1,
      sort: 1,
      version: 1,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      created_by: 'user-001',
      updated_by: 'user-001',
    },
    {
      id: 'prompt-002',
      name: 'Compliance Check',
      content: 'Ensure all regulatory requirements are met.',
      applicable_scenarios: 'Financial transactions',
      enabled: 1,
      sort: 2,
      version: 1,
      created_at: '2024-01-02T10:00:00Z',
      updated_at: '2024-01-02T10:00:00Z',
      created_by: 'user-001',
      updated_by: 'user-001',
    },
    {
      id: 'prompt-003',
      name: 'Response Time',
      content: 'Respond to customer inquiries within 2 minutes.',
      applicable_scenarios: 'Live chat support',
      enabled: 0,
      sort: 3,
      version: 1,
      created_at: '2024-01-03T10:00:00Z',
      updated_at: '2024-01-03T10:00:00Z',
      created_by: 'user-002',
      updated_by: 'user-002',
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <GlobalPromptList />
      </QueryClientProvider>
    );
  };

  describe('List Display', () => {
    it('should display list of global prompts', async () => {
      // Arrange
      (qualityPromptApi.queryGlobalPrompts as jest.Mock).mockResolvedValue({
        data: mockPrompts,
        total: 3,
        page: 1,
        pageSize: 20,
      });

      // Act
      renderComponent();

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Politeness Standard')).toBeInTheDocument();
        expect(screen.getByText('Compliance Check')).toBeInTheDocument();
        expect(screen.getByText('Response Time')).toBeInTheDocument();
      });
    });

    it('should display enabled/disabled status correctly', async () => {
      // Arrange
      (qualityPromptApi.queryGlobalPrompts as jest.Mock).mockResolvedValue({
        data: mockPrompts,
        total: 3,
        page: 1,
        pageSize: 20,
      });

      // Act
      renderComponent();

      // Assert
      await waitFor(() => {
        const enabledTags = screen.getAllByText('已启用');
        const disabledTags = screen.getAllByText('已禁用');
        expect(enabledTags.length).toBe(2);
        expect(disabledTags.length).toBe(1);
      });
    });

    it('should show loading state while fetching data', () => {
      // Arrange
      (qualityPromptApi.queryGlobalPrompts as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      // Act
      renderComponent();

      // Assert
      expect(screen.getByRole('table')).toBeInTheDocument();
      // Antd Table shows loading spinner
    });

    it('should display empty state when no prompts exist', async () => {
      // Arrange
      (qualityPromptApi.queryGlobalPrompts as jest.Mock).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });

      // Act
      renderComponent();

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/暂无Prompt/i)).toBeInTheDocument();
        expect(screen.getByText(/点击新建按钮创建第一条Prompt/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter prompts by keyword', async () => {
      // Arrange
      const filteredPrompts = [mockPrompts[0]];
      (qualityPromptApi.queryGlobalPrompts as jest.Mock).mockResolvedValue({
        data: filteredPrompts,
        total: 1,
        page: 1,
        pageSize: 20,
      });

      // Act
      renderComponent();

      const searchInput = screen.getByPlaceholderText(/搜索Prompt名称或内容/i);
      fireEvent.change(searchInput, { target: { value: 'Politeness' } });

      // Assert
      await waitFor(() => {
        expect(qualityPromptApi.queryGlobalPrompts).toHaveBeenCalledWith(
          expect.objectContaining({
            keyword: 'Politeness',
          })
        );
        expect(screen.getByText('Politeness Standard')).toBeInTheDocument();
        expect(screen.queryByText('Compliance Check')).not.toBeInTheDocument();
      });
    });

    it('should debounce search input', async () => {
      // Arrange
      (qualityPromptApi.queryGlobalPrompts as jest.Mock).mockResolvedValue({
        data: mockPrompts,
        total: 3,
        page: 1,
        pageSize: 20,
      });

      // Act
      renderComponent();

      const searchInput = screen.getByPlaceholderText(/搜索Prompt名称或内容/i);

      // Type multiple characters quickly
      fireEvent.change(searchInput, { target: { value: 'P' } });
      fireEvent.change(searchInput, { target: { value: 'Po' } });
      fireEvent.change(searchInput, { target: { value: 'Pol' } });

      // Assert - should only call API once after debounce
      await waitFor(() => {
        expect(qualityPromptApi.queryGlobalPrompts).toHaveBeenCalledTimes(1);
      });
    });

    it('should clear search results when search is cleared', async () => {
      // Arrange
      (qualityPromptApi.queryGlobalPrompts as jest.Mock).mockResolvedValue({
        data: mockPrompts,
        total: 3,
        page: 1,
        pageSize: 20,
      });

      // Act
      renderComponent();

      const searchInput = screen.getByPlaceholderText(/搜索Prompt名称或内容/i);
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      await waitFor(() => {
        expect(qualityPromptApi.queryGlobalPrompts).toHaveBeenCalled();
      });

      fireEvent.change(searchInput, { target: { value: '' } });

      // Assert
      await waitFor(() => {
        expect(qualityPromptApi.queryGlobalPrompts).toHaveBeenCalledWith(
          expect.objectContaining({
            keyword: '',
          })
        );
      });
    });
  });

  describe('Create Prompt', () => {
    it('should open create form when create button is clicked', async () => {
      // Arrange
      (qualityPromptApi.queryGlobalPrompts as jest.Mock).mockResolvedValue({
        data: mockPrompts,
        total: 3,
        page: 1,
        pageSize: 20,
      });

      // Act
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Politeness Standard')).toBeInTheDocument();
      });

      const createButton = screen.getByText('新建全局Prompt');
      fireEvent.click(createButton);

      // Assert
      expect(screen.getByText(/创建全局Prompt/i)).toBeInTheDocument();
    });

    it('should create new prompt successfully', async () => {
      // Arrange
      (qualityPromptApi.queryGlobalPrompts as jest.Mock).mockResolvedValue({
        data: mockPrompts,
        total: 3,
        page: 1,
        pageSize: 20,
      });

      (qualityPromptApi.createGlobalPrompt as jest.Mock).mockResolvedValue({
        id: 'prompt-004',
        name: 'New Prompt',
        content: 'New content',
        enabled: 1,
      });

      // Act
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Politeness Standard')).toBeInTheDocument();
      });

      const createButton = screen.getByText('新建全局Prompt');
      fireEvent.click(createButton);

      // Fill form
      const nameInput = screen.getByLabelText(/Prompt名称/i);
      const contentInput = screen.getByLabelText(/Prompt内容/i);

      fireEvent.change(nameInput, { target: { value: 'New Prompt' } });
      fireEvent.change(contentInput, { target: { value: 'New content' } });

      const submitButton = screen.getByText('保存');
      fireEvent.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(qualityPromptApi.createGlobalPrompt).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Prompt',
            content: 'New content',
          })
        );
        const { message } = require('antd');
        expect(message.success).toHaveBeenCalled();
      });
    });
  });

  describe('Edit Prompt', () => {
    it('should open edit form when edit button is clicked', async () => {
      // Arrange
      (qualityPromptApi.queryGlobalPrompts as jest.Mock).mockResolvedValue({
        data: mockPrompts,
        total: 3,
        page: 1,
        pageSize: 20,
      });

      // Act
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Politeness Standard')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('编辑');
      fireEvent.click(editButtons[0]);

      // Assert
      expect(screen.getByText(/编辑全局Prompt/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Politeness Standard')).toBeInTheDocument();
    });

    it('should update prompt successfully', async () => {
      // Arrange
      (qualityPromptApi.queryGlobalPrompts as jest.Mock).mockResolvedValue({
        data: mockPrompts,
        total: 3,
        page: 1,
        pageSize: 20,
      });

      (qualityPromptApi.updateGlobalPrompt as jest.Mock).mockResolvedValue({
        ...mockPrompts[0],
        name: 'Updated Politeness Standard',
      });

      // Act
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Politeness Standard')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('编辑');
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByDisplayValue('Politeness Standard');
      fireEvent.change(nameInput, { target: { value: 'Updated Politeness Standard' } });

      const submitButton = screen.getByText('保存');
      fireEvent.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(qualityPromptApi.updateGlobalPrompt).toHaveBeenCalledWith(
          'prompt-001',
          expect.objectContaining({
            name: 'Updated Politeness Standard',
          })
        );
      });
    });
  });

  describe('Delete Prompt', () => {
    it('should show confirmation dialog when delete button is clicked', async () => {
      // Arrange
      (qualityPromptApi.queryGlobalPrompts as jest.Mock).mockResolvedValue({
        data: mockPrompts,
        total: 3,
        page: 1,
        pageSize: 20,
      });

      // Act
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Politeness Standard')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('删除');
      fireEvent.click(deleteButtons[0]);

      // Assert
      expect(screen.getByText(/确定要删除全局Prompt/i)).toBeInTheDocument();
    });

    it('should delete prompt when confirmed', async () => {
      // Arrange
      (qualityPromptApi.queryGlobalPrompts as jest.Mock).mockResolvedValue({
        data: mockPrompts,
        total: 3,
        page: 1,
        pageSize: 20,
      });

      (qualityPromptApi.deleteGlobalPrompt as jest.Mock).mockResolvedValue({
        success: true,
      });

      // Act
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Politeness Standard')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('删除');
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByText('确定');
      fireEvent.click(confirmButton);

      // Assert
      await waitFor(() => {
        expect(qualityPromptApi.deleteGlobalPrompt).toHaveBeenCalledWith('prompt-001');
        const { message } = require('antd');
        expect(message.success).toHaveBeenCalled();
      });
    });

    it('should handle delete error when prompt is referenced', async () => {
      // Arrange
      (qualityPromptApi.queryGlobalPrompts as jest.Mock).mockResolvedValue({
        data: mockPrompts,
        total: 3,
        page: 1,
        pageSize: 20,
      });

      (qualityPromptApi.deleteGlobalPrompt as jest.Mock).mockRejectedValue(
        new Error('Cannot delete: referenced by department prompts')
      );

      // Act
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Politeness Standard')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('删除');
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByText('确定');
      fireEvent.click(confirmButton);

      // Assert
      await waitFor(() => {
        const { message } = require('antd');
        expect(message.error).toHaveBeenCalledWith(
          expect.stringContaining('referenced by department prompts')
        );
      });
    });
  });

  describe('Enable/Disable Prompt', () => {
    it('should enable a disabled prompt', async () => {
      // Arrange
      (qualityPromptApi.queryGlobalPrompts as jest.Mock).mockResolvedValue({
        data: mockPrompts,
        total: 3,
        page: 1,
        pageSize: 20,
      });

      (qualityPromptApi.enableGlobalPrompt as jest.Mock).mockResolvedValue({
        ...mockPrompts[2],
        enabled: 1,
      });

      // Act
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Response Time')).toBeInTheDocument();
      });

      const enableButtons = screen.getAllByText('启用');
      fireEvent.click(enableButtons[0]);

      // Assert
      await waitFor(() => {
        expect(qualityPromptApi.enableGlobalPrompt).toHaveBeenCalledWith('prompt-003');
      });
    });

    it('should disable an enabled prompt', async () => {
      // Arrange
      (qualityPromptApi.queryGlobalPrompts as jest.Mock).mockResolvedValue({
        data: mockPrompts,
        total: 3,
        page: 1,
        pageSize: 20,
      });

      (qualityPromptApi.disableGlobalPrompt as jest.Mock).mockResolvedValue({
        ...mockPrompts[0],
        enabled: 0,
      });

      // Act
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Politeness Standard')).toBeInTheDocument();
      });

      const disableButtons = screen.getAllByText('禁用');
      fireEvent.click(disableButtons[0]);

      // Assert
      await waitFor(() => {
        expect(qualityPromptApi.disableGlobalPrompt).toHaveBeenCalledWith('prompt-001');
      });
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls', async () => {
      // Arrange
      (qualityPromptApi.queryGlobalPrompts as jest.Mock).mockResolvedValue({
        data: mockPrompts,
        total: 50,
        page: 1,
        pageSize: 20,
      });

      // Act
      renderComponent();

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/共 50 条/i)).toBeInTheDocument();
      });
    });

    it('should load next page when pagination is clicked', async () => {
      // Arrange
      (qualityPromptApi.queryGlobalPrompts as jest.Mock).mockResolvedValue({
        data: mockPrompts,
        total: 50,
        page: 1,
        pageSize: 20,
      });

      // Act
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Politeness Standard')).toBeInTheDocument();
      });

      const nextPageButton = screen.getByTitle('下一页');
      fireEvent.click(nextPageButton);

      // Assert
      await waitFor(() => {
        expect(qualityPromptApi.queryGlobalPrompts).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 2,
          })
        );
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should open create form when Ctrl+N is pressed', async () => {
      // Arrange
      (qualityPromptApi.queryGlobalPrompts as jest.Mock).mockResolvedValue({
        data: mockPrompts,
        total: 3,
        page: 1,
        pageSize: 20,
      });

      // Act
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Politeness Standard')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'n', ctrlKey: true });

      // Assert
      expect(screen.getByText(/创建全局Prompt/i)).toBeInTheDocument();
    });

    it('should focus search input when Ctrl+F is pressed', async () => {
      // Arrange
      (qualityPromptApi.queryGlobalPrompts as jest.Mock).mockResolvedValue({
        data: mockPrompts,
        total: 3,
        page: 1,
        pageSize: 20,
      });

      // Act
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Politeness Standard')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/搜索Prompt名称或内容/i);
      fireEvent.keyDown(document, { key: 'f', ctrlKey: true });

      // Assert
      expect(document.activeElement).toBe(searchInput);
    });
  });
});
