import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { request } from '@/utils/request';
import { message } from 'antd';

/**
 * 日志查询 Hook
 * Task 16.3: 实现数据缓存
 * Requirements: 23.2, 23.3
 *
 * 使用 React Query 缓存日志查询结果，提升性能
 */

export interface LogQueryParams {
  page?: number;
  pageSize?: number;
  [key: string]: any;
}

export interface LogQueryResult<T> {
  items: T[];
  total: number;
  meta?: {
    isDateCorrected?: boolean;
    isKeywordTruncated?: boolean;
  };
}

/**
 * 操作日志查询 Hook
 *
 * @param params 查询参数
 * @param options 查询选项
 * @returns 查询结果
 *
 * @example
 * const { data, isLoading, error, refetch } = useOperationLogQuery({
 *   page: 1,
 *   pageSize: 20,
 *   username: 'admin',
 * });
 */
export function useOperationLogQuery<T = any>(
  params: LogQueryParams,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
  }
) {
  return useQuery<LogQueryResult<T>>({
    queryKey: ['logs', 'operation', params],
    queryFn: async () => {
      const response = await request.get('/system/logs/operation', {
        params,
      });
      return response.data;
    },
    staleTime: options?.staleTime ?? 3 * 60 * 1000, // 3分钟内数据视为新鲜
    gcTime: options?.cacheTime ?? 10 * 60 * 1000, // 缓存保持10分钟
    enabled: options?.enabled ?? true,
    refetchOnWindowFocus: false, // 窗口聚焦时不自动重新获取
    refetchOnMount: false, // 组件挂载时不自动重新获取
  });
}

/**
 * 登录日志查询 Hook
 *
 * @param params 查询参数
 * @param options 查询选项
 * @returns 查询结果
 *
 * @example
 * const { data, isLoading, error, refetch } = useLoginLogQuery({
 *   page: 1,
 *   pageSize: 20,
 *   username: 'admin',
 * });
 */
export function useLoginLogQuery<T = any>(
  params: LogQueryParams,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
  }
) {
  return useQuery<LogQueryResult<T>>({
    queryKey: ['logs', 'login', params],
    queryFn: async () => {
      const response = await request.get('/system/logs/login', {
        params,
      });
      return response.data;
    },
    staleTime: options?.staleTime ?? 3 * 60 * 1000, // 3分钟内数据视为新鲜
    gcTime: options?.cacheTime ?? 10 * 60 * 1000, // 缓存保持10分钟
    enabled: options?.enabled ?? true,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * 日志导出 Hook
 *
 * @returns 导出函数和状态
 *
 * @example
 * const { exportLogs, isExporting } = useLogExport();
 *
 * const handleExport = () => {
 *   exportLogs({
 *     type: 'operation',
 *     exportType: 'all',
 *     filters: { username: 'admin' },
 *   });
 * };
 */
export function useLogExport() {
  const mutation = useMutation({
    mutationFn: async ({
      type,
      exportType,
      filters,
      page,
      pageSize,
    }: {
      type: 'operation' | 'login';
      exportType: 'current' | 'all';
      filters?: any;
      page?: number;
      pageSize?: number;
    }) => {
      const endpoint = type === 'operation'
        ? '/system/logs/operation/export'
        : '/system/logs/login/export';

      const response = await request.get(endpoint, {
        params: {
          ...filters,
          exportType,
          page,
          pageSize,
        },
        responseType: 'blob',
      });

      return response;
    },
    onSuccess: (response, variables) => {
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // 从响应头获取文件名
      const contentDisposition = response.headers?.['content-disposition'];
      let filename = `${variables.type === 'operation' ? '操作日志' : '登录日志'}_${Date.now()}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
        }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success('导出成功');
    },
    onError: (error: any) => {
      // Requirement 18.1, 18.2, 18.3: 处理导出异常提示
      if (error.message?.includes('数据量过大')) {
        message.warning('数据量过大（超过10万条），建议分批次导出');
      } else if (error.message?.includes('无匹配日志')) {
        message.warning('无匹配日志，无法导出');
      } else {
        message.error(error.message || '导出失败，请稍后重试');
      }
    },
  });

  return {
    exportLogs: mutation.mutate,
    isExporting: mutation.isPending,
  };
}

/**
 * 使日志缓存失效
 * 用于在需要刷新数据时清除缓存
 *
 * @example
 * const invalidateCache = useInvalidateLogCache();
 *
 * // 使操作日志缓存失效
 * invalidateCache('operation');
 *
 * // 使登录日志缓存失效
 * invalidateCache('login');
 *
 * // 使所有日志缓存失效
 * invalidateCache('all');
 */
export function useInvalidateLogCache() {
  const queryClient = useQueryClient();

  return (type: 'operation' | 'login' | 'all') => {
    if (type === 'all') {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['logs', type] });
    }
  };
}

/**
 * 预加载日志数据
 * 用于在用户可能访问某个页面前预加载数据
 *
 * @example
 * const prefetchLogs = usePrefetchLogs();
 *
 * // 预加载操作日志第一页
 * prefetchLogs('operation', { page: 1, pageSize: 20 });
 */
export function usePrefetchLogs() {
  const queryClient = useQueryClient();

  return async (type: 'operation' | 'login', params: LogQueryParams) => {
    const endpoint = type === 'operation'
      ? '/system/logs/operation'
      : '/system/logs/login';

    await queryClient.prefetchQuery({
      queryKey: ['logs', type, params],
      queryFn: async () => {
        const response = await request.get(endpoint, { params });
        return response.data;
      },
      staleTime: 3 * 60 * 1000,
    });
  };
}
