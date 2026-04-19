/**
 * VersionHistory Component Tests
 *
 * Tests version history display, version comparison, and rollback functionality.
 *
 * **Validates: Requirements 6.1-6.7**
 *
 * Note: This test file requires @testing-library/react and @testing-library/jest-dom
 * to be installed in the frontend project.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VersionHistory } from '../VersionHistory';
import qualityPromptApi from '@/api/quality-prompt';

// Mock the API
jest.mock('@/api/quality-prompt');

// Mock antd message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('VersionHistory Component', () => {
  let queryClient: QueryClient;

  const mockVersions = [
    {
      id: 'version-001',
      prompt_id: 'prompt-123',
      prompt_type: 'global',
      version: 1,
      content_snapshot: JSON.stringify({ name: 'V1', content: 'Content V1' }),
      modified_by: 'user-001',
      modified_by_name: 'John Doe',
      modified_at: '2024-01-01T10:00:00Z',
      change_description: 'Initial version',
    },
    {
      id: 'version-002',
      prompt_id: 'prompt-123',
      prompt_type: 'global',
      version: 2,
      content_snapshot: JSON.stringify({ name: 'V2', content: 'Content V2' }),
      modified_by: 'user-002',
      modified_by_name: 'Jane Smith',
      modified_at: '2024-01-02T10:00:00Z',
      change_description: 'Updated content',
    },
    {
      id: 'version-003',
      prompt_id: 'prompt-123',
      prompt_type: 'global',
      version: 3,
      content_snapshot: JSON.stringify({ name: 'V3', content: 'Content V3' }),
      modified_by: 'user-001',
      modified_by_name: 'John Doe',
      modified_at: '2024-01-03T10:00:00Z',
      change_description: 'Latest update',
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      promptId: 'prompt-123',
      promptType: 'global' as const,
      currentVersion: 3,
      open: true,
      onClose: jest.fn(),
      onRollbackSuccess: jest.fn(),
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <VersionHistory {...defaultProps} {...props} />
      </QueryClientProvider>
    );
  };

  describe('Version List Display', () => {
    it('should display version history list', async () => {
      // Arrange
      (qualityPromptApi.getGlobalPromptVersions as jest.Mock).mockResolvedValue(mockVersions);

      // Act
      renderComponent();

      // Assert
      await waitFor(() => {
        expect(screen.getByText('版本历史')).toBeInTheDocument();
        expect(screen.getByText('v1')).toBeInTheDocument();
        expect(screen.getByText('v2')).toBeInTheDocument();
        expect(screen.getByText('v3')).toBeInTheDocument();
      });
    });

    it('should highlight current version', async () => {
      // Arrange
      (qualityPromptApi.getGlobalPromptVersions as jest.Mock).mockResolvedValue(mockVersions);

      // Act
      renderComponent({ currentVersion: 3 });

      // Assert
      await waitFor(() => {
        expect(screen.getByText('当前版本')).toBeInTheDocument();
      });
    });

    it('should display version metadata correctly', async () => {
      // Arrange
      (qualityPromptApi.getGlobalPromptVersions as jest.Mock).mockResolvedValue(mockVersions);

      // Act
      renderComponent();

      // Assert
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Initial version')).toBeInTheDocument();
        expect(screen.getByText('Updated content')).toBeInTheDocument();
      });
    });

    it('should show loading state while fetching versions', () => {
      // Arrange
      (qualityPromptApi.getGlobalPromptVersions as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      // Act
      renderComponent();

      // Assert
      expect(screen.getByRole('table')).toBeInTheDocument();
      // Antd Table shows loading spinner
    });
  });

  describe('Version Comparison', () => {
    it('should open diff modal when compare button is clicked', async () => {
      // Arrange
      (qualityPromptApi.getGlobalPromptVersions as jest.Mock).mockResolvedValue(mockVersions);

      // Act
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('v1')).toBeInTheDocument();
      });

      const compareButtons = screen.getAllByText('对比');
      fireEvent.click(compareButtons[0]); // Click compare for version 1

      // Assert
      await waitFor(() => {
        // VersionDiff modal should be rendered
        expect(screen.getByText(/版本对比/i)).toBeInTheDocument();
      });
    });

    it('should disable compare button for current version', async () => {
      // Arrange
      (qualityPromptApi.getGlobalPromptVersions as jest.Mock).mockResolvedValue(mockVersions);

      // Act
      renderComponent({ currentVersion: 3 });

      // Assert
      await waitFor(() => {
        const compareButtons = screen.getAllByText('对比');
        const currentVersionCompareButton = compareButtons[2]; // Version 3
        expect(currentVersionCompareButton).toBeDisabled();
      });
    });
  });

  describe('Version Rollback', () => {
    it('should show confirmation modal when rollback button is clicked', async () => {
      // Arrange
      (qualityPromptApi.getGlobalPromptVersions as jest.Mock).mockResolvedValue(mockVersions);

      // Act
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('v1')).toBeInTheDocument();
      });

      const rollbackButtons = screen.getAllByText('回滚');
      fireEvent.click(rollbackButtons[0]); // Click rollback for version 1

      // Assert
      await waitFor(() => {
        expect(screen.getByText('确认回滚')).toBeInTheDocument();
        expect(screen.getByText(/确定要回滚到版本 1 吗/)).toBeInTheDocument();
      });
    });

    it('should execute rollback when confirmed', async () => {
      // Arrange
      (qualityPromptApi.getGlobalPromptVersions as jest.Mock).mockResolvedValue(mockVersions);
      (qualityPromptApi.rollbackGlobalPrompt as jest.Mock).mockResolvedValue({ success: true });

      const onRollbackSuccess = jest.fn();

      // Act
      renderComponent({ onRollbackSuccess });

      await waitFor(() => {
        expect(screen.getByText('v1')).toBeInTheDocument();
      });

      const rollbackButtons = screen.getAllByText('回滚');
      fireEvent.click(rollbackButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('确认回滚')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('确认回滚');
      fireEvent.click(confirmButton);

      // Assert
      await waitFor(() => {
        expect(qualityPromptApi.rollbackGlobalPrompt).toHaveBeenCalledWith('prompt-123', 1);
        expect(onRollbackSuccess).toHaveBeenCalled();
      });
    });

    it('should disable rollback button for current version', async () => {
      // Arrange
      (qualityPromptApi.getGlobalPromptVersions as jest.Mock).mockResolvedValue(mockVersions);

      // Act
      renderComponent({ currentVersion: 3 });

      // Assert
      await waitFor(() => {
        const rollbackButtons = screen.getAllByText('回滚');
        const currentVersionRollbackButton = rollbackButtons[2]; // Version 3
        expect(currentVersionRollbackButton).toBeDisabled();
      });
    });

    it('should handle rollback error gracefully', async () => {
      // Arrange
      (qualityPromptApi.getGlobalPromptVersions as jest.Mock).mockResolvedValue(mockVersions);
      (qualityPromptApi.rollbackGlobalPrompt as jest.Mock).mockRejectedValue(
        new Error('Rollback failed')
      );

      // Act
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('v1')).toBeInTheDocument();
      });

      const rollbackButtons = screen.getAllByText('回滚');
      fireEvent.click(rollbackButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('确认回滚')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('确认回滚');
      fireEvent.click(confirmButton);

      // Assert
      await waitFor(() => {
        const { message } = require('antd');
        expect(message.error).toHaveBeenCalledWith('Rollback failed');
      });
    });
  });

  describe('Department Prompt Support', () => {
    it('should fetch department prompt versions when promptType is department', async () => {
      // Arrange
      (qualityPromptApi.getDepartmentPromptVersions as jest.Mock).mockResolvedValue(mockVersions);

      // Act
      renderComponent({ promptType: 'department' });

      // Assert
      await waitFor(() => {
        expect(qualityPromptApi.getDepartmentPromptVersions).toHaveBeenCalledWith('prompt-123');
        expect(screen.getByText('v1')).toBeInTheDocument();
      });
    });

    it('should call department rollback API for department prompts', async () => {
      // Arrange
      (qualityPromptApi.getDepartmentPromptVersions as jest.Mock).mockResolvedValue(mockVersions);
      (qualityPromptApi.rollbackDepartmentPrompt as jest.Mock).mockResolvedValue({ success: true });

      // Act
      renderComponent({ promptType: 'department' });

      await waitFor(() => {
        expect(screen.getByText('v1')).toBeInTheDocument();
      });

      const rollbackButtons = screen.getAllByText('回滚');
      fireEvent.click(rollbackButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('确认回滚')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('确认回滚');
      fireEvent.click(confirmButton);

      // Assert
      await waitFor(() => {
        expect(qualityPromptApi.rollbackDepartmentPrompt).toHaveBeenCalledWith('prompt-123', 1);
      });
    });
  });

  describe('Modal Behavior', () => {
    it('should call onClose when close button is clicked', async () => {
      // Arrange
      (qualityPromptApi.getGlobalPromptVersions as jest.Mock).mockResolvedValue(mockVersions);
      const onClose = jest.fn();

      // Act
      renderComponent({ onClose });

      await waitFor(() => {
        expect(screen.getByText('版本历史')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('关闭');
      fireEvent.click(closeButton);

      // Assert
      expect(onClose).toHaveBeenCalled();
    });

    it('should not fetch versions when modal is closed', () => {
      // Arrange
      (qualityPromptApi.getGlobalPromptVersions as jest.Mock).mockResolvedValue(mockVersions);

      // Act
      renderComponent({ open: false });

      // Assert
      expect(qualityPromptApi.getGlobalPromptVersions).not.toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    it('should display pagination with correct total count', async () => {
      // Arrange
      const manyVersions = Array.from({ length: 25 }, (_, i) => ({
        ...mockVersions[0],
        id: `version-${i}`,
        version: i + 1,
      }));

      (qualityPromptApi.getGlobalPromptVersions as jest.Mock).mockResolvedValue(manyVersions);

      // Act
      renderComponent();

      // Assert
      await waitFor(() => {
        expect(screen.getByText('共 25 个版本')).toBeInTheDocument();
      });
    });
  });
});
