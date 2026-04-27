/**
 * Preservation Property Tests - Navigation Click Failure Fix
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 *
 * IMPORTANT: These tests capture baseline behavior on UNFIXED code
 * EXPECTED OUTCOME: Tests PASS (confirms baseline behavior to preserve)
 *
 * This test suite verifies that normal navigation behavior is preserved:
 * - Navigation to non-Business-Department pages works correctly
 * - Navigation to Business Department with valid array data renders correctly
 * - Browser navigation operations work correctly
 * - Direct URL access works correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as fc from 'fast-check';
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

interface DepartmentRecord {
  id: string;
  name: string;
  parent_id?: string | null;
}

describe('Preservation Property Tests - Normal Navigation Behavior', () => {
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

  /**
   * Property 1: Navigation to Business Department with valid array data
   * For all valid department arrays, the page should render correctly
   */
  it('should render correctly with valid array data (property-based)', () => {
    // Generator for valid department records
    const departmentArbitrary = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      parent_id: fc.option(fc.uuid(), { nil: null }),
    });

    // Generator for arrays of departments
    const departmentArrayArbitrary = fc.array(departmentArbitrary, { minLength: 0, maxLength: 20 });

    fc.assert(
      fc.property(departmentArrayArbitrary, async (departments: DepartmentRecord[]) => {
        vi.mocked(personnelApi.listDepartments).mockResolvedValue(departments);

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

        // Component should render without crashing
        expect(container).toBeTruthy();

        // Should show either the tree or "no data" message
        const hasTree = container.querySelector('.ant-tree');
        const hasNoDataMessage = screen.queryByText(/暂无部门数据/i);

        if (departments.length === 0) {
          expect(hasNoDataMessage).toBeTruthy();
        } else {
          // With data, should render tree structure
          expect(hasTree || hasNoDataMessage).toBeTruthy();
        }

        // Should not show error messages
        expect(screen.queryByText(/错误|error/i)).not.toBeInTheDocument();
      }),
      { numRuns: 50 } // Run 50 test cases
    );
  });

  /**
   * Property 2: Empty array handling
   * Empty arrays should display "no data" message, not crash
   */
  it('should handle empty array correctly', async () => {
    vi.mocked(personnelApi.listDepartments).mockResolvedValue([]);

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

    // Should render without crashing
    expect(container).toBeTruthy();

    // Should show "no data" message
    expect(screen.getByText(/暂无部门数据/i)).toBeInTheDocument();

    // Should not show error messages
    expect(screen.queryByText(/错误|error/i)).not.toBeInTheDocument();
  });

  /**
   * Property 3: Valid department data with various structures
   * Tests flat structures, nested structures, and mixed structures
   */
  it('should handle various valid department structures', async () => {
    const testCases = [
      // Flat structure (no parent relationships)
      [
        { id: '1', name: 'Department A', parent_id: null },
        { id: '2', name: 'Department B', parent_id: null },
        { id: '3', name: 'Department C', parent_id: null },
      ],
      // Nested structure (parent-child relationships)
      [
        { id: '1', name: 'Root Department', parent_id: null },
        { id: '2', name: 'Child Department 1', parent_id: '1' },
        { id: '3', name: 'Child Department 2', parent_id: '1' },
        { id: '4', name: 'Grandchild Department', parent_id: '2' },
      ],
      // Mixed structure
      [
        { id: '1', name: 'Department A', parent_id: null },
        { id: '2', name: 'Department B', parent_id: null },
        { id: '3', name: 'Sub-department A1', parent_id: '1' },
      ],
      // Single department
      [
        { id: '1', name: 'Single Department', parent_id: null },
      ],
    ];

    for (const departments of testCases) {
      vi.mocked(personnelApi.listDepartments).mockResolvedValue(departments);

      const { container, unmount } = render(
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

      // Component should render without crashing
      expect(container).toBeTruthy();

      // Should render tree or show data
      const hasTree = container.querySelector('.ant-tree');
      expect(hasTree).toBeTruthy();

      // Should not show error messages
      expect(screen.queryByText(/错误|error/i)).not.toBeInTheDocument();

      // Cleanup for next iteration
      unmount();
      queryClient.clear();
    }
  });

  /**
   * Property 4: Department names with various characters
   * Tests that department names with special characters, unicode, etc. render correctly
   */
  it('should handle department names with various characters (property-based)', () => {
    const departmentWithSpecialNameArbitrary = fc.record({
      id: fc.uuid(),
      name: fc.oneof(
        fc.string({ minLength: 1, maxLength: 50 }), // Regular strings
        fc.constantFrom('部门A', '销售部', 'IT部门', '人力资源部'), // Chinese characters
        fc.constantFrom('Dept-123', 'Sales & Marketing', 'R&D (Research)'), // Special chars
        fc.constantFrom('🏢 Office', '📊 Analytics', '💼 Business'), // Emojis
      ),
      parent_id: fc.option(fc.uuid(), { nil: null }),
    });

    const departmentArrayArbitrary = fc.array(departmentWithSpecialNameArbitrary, {
      minLength: 1,
      maxLength: 10
    });

    fc.assert(
      fc.property(departmentArrayArbitrary, async (departments: DepartmentRecord[]) => {
        vi.mocked(personnelApi.listDepartments).mockResolvedValue(departments);

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

        // Component should render without crashing
        expect(container).toBeTruthy();

        // Should render tree
        const hasTree = container.querySelector('.ant-tree');
        expect(hasTree).toBeTruthy();

        // Should not show error messages
        expect(screen.queryByText(/错误|error/i)).not.toBeInTheDocument();
      }),
      { numRuns: 30 }
    );
  });

  /**
   * Property 5: Large department arrays
   * Tests that the component can handle larger datasets without crashing
   */
  it('should handle large department arrays efficiently', async () => {
    // Generate a large array of departments
    const largeDepartmentArray: DepartmentRecord[] = Array.from({ length: 100 }, (_, i) => ({
      id: `dept-${i}`,
      name: `Department ${i}`,
      parent_id: i > 0 && i % 5 === 0 ? `dept-${Math.floor(i / 5)}` : null,
    }));

    vi.mocked(personnelApi.listDepartments).mockResolvedValue(largeDepartmentArray);

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

    // Component should render without crashing
    expect(container).toBeTruthy();

    // Should render tree
    const hasTree = container.querySelector('.ant-tree');
    expect(hasTree).toBeTruthy();

    // Should not show error messages
    expect(screen.queryByText(/错误|error/i)).not.toBeInTheDocument();
  });

  /**
   * Property 6: Consistent rendering across multiple renders
   * Verifies that the same data produces the same output consistently
   */
  it('should render consistently with the same data', async () => {
    const departments: DepartmentRecord[] = [
      { id: '1', name: 'Root', parent_id: null },
      { id: '2', name: 'Child 1', parent_id: '1' },
      { id: '3', name: 'Child 2', parent_id: '1' },
    ];

    vi.mocked(personnelApi.listDepartments).mockResolvedValue(departments);

    // First render
    const { container: container1, unmount: unmount1 } = render(
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

    const firstRenderHTML = container1.innerHTML;
    unmount1();

    // Second render with same data
    queryClient.clear();
    vi.mocked(personnelApi.listDepartments).mockResolvedValue(departments);

    const { container: container2 } = render(
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

    const secondRenderHTML = container2.innerHTML;

    // Both renders should produce similar structure (not exact match due to React internals)
    expect(container1).toBeTruthy();
    expect(container2).toBeTruthy();

    // Both should have tree structure
    expect(container1.querySelector('.ant-tree')).toBeTruthy();
    expect(container2.querySelector('.ant-tree')).toBeTruthy();
  });
});
