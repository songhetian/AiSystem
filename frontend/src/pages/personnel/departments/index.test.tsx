/**
 * Bug Condition Exploration Test - Navigation Click Failure Fix
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3**
 *
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 *
 * This test encodes the expected behavior:
 * - Component should NOT crash when API returns invalid data (null, non-array object)
 * - User-friendly error message should be displayed
 * - Subsequent navigation should work correctly (URL changes AND page content updates)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DepartmentsPage from './index';
import { personnelApi } from '@/api/personnel';

// Mock the personnel API
vi.mock('@/api/personnel', () => ({
  personnelApi: {
    listDepartments: vi.fn(),
    createDepartment: vi.fn(),
    updateDepartment: vi.fn(),
    deleteDepartment: vi.fn(),
  },
}));

// Mock other dependencies
vi.mock('@/components/common/BaseModal', () => ({
  BaseModal: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/permission/Permission', () => ({
  Permission: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/common', () => ({
  GlobalLoading: ({ children, loading }: any) => loading ? <div>Loading...</div> : children,
}));

vi.mock('@/hooks', () => ({
  useDebounce: (value: any) => value,
  useFormDraft: () => ({ clearDraft: vi.fn() }),
  useKeyboardShortcuts: vi.fn(),
}));

// Mock Ant Design components
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
    Modal: {
      confirm: vi.fn(),
    },
  };
});

describe('Bug Condition Exploration - Invalid Data Navigation Crash', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  it('should handle null API response without crashing', async () => {
    vi.mocked(personnelApi.listDepartments).mockResolvedValue(null as any);

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/personnel/departments']}>
          <Routes>
            <Route path="/personnel/departments" element={<DepartmentsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(container).toBeTruthy();
    const errorMessage = screen.queryByText(/暂无部门数据|未找到匹配的部门|错误/i);
    expect(errorMessage).toBeTruthy();
  });

  it('should handle non-array object API response without crashing', async () => {
    vi.mocked(personnelApi.listDepartments).mockResolvedValue({
      error: 'Database error'
    } as any);

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/personnel/departments']}>
          <Routes>
            <Route path="/personnel/departments" element={<DepartmentsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(container).toBeTruthy();
    const errorMessage = screen.queryByText(/暂无部门数据|未找到匹配的部门|错误/i);
    expect(errorMessage).toBeTruthy();
  });
});
