import { QueryClient } from "@tanstack/react-query";

/**
 * 数据预加载工具
 * 用于在用户交互前预先加载数据，提升用户体验
 */

interface PrefetchOptions {
  queryClient: QueryClient;
  queryKey: any[];
  queryFn: () => Promise<any>;
  staleTime?: number;
}

/**
 * 预加载数据
 * @param options - 预加载配置
 *
 * @example
 * ```tsx
 * const queryClient = useQueryClient();
 *
 * const handleRowHover = (record: any) => {
 *   prefetchData({
 *     queryClient,
 *     queryKey: ['employee-detail', record.id],
 *     queryFn: () => fetchEmployeeDetail(record.id),
 *   });
 * };
 *
 * <Table
 *   onRow={(record) => ({
 *     onMouseEnter: () => handleRowHover(record),
 *   })}
 * />
 * ```
 */
export const prefetchData = async (options: PrefetchOptions) => {
  const { queryClient, queryKey, queryFn, staleTime = 5 * 60 * 1000 } = options;

  try {
    await queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime,
    });
  } catch (error) {
    console.error("Prefetch failed:", error);
  }
};

/**
 * 创建预加载处理器
 * @param queryClient - React Query 客户端
 * @param getQueryConfig - 根据记录获取查询配置的函数
 *
 * @example
 * ```tsx
 * const queryClient = useQueryClient();
 *
 * const handleRowHover = createPrefetchHandler(
 *   queryClient,
 *   (record) => ({
 *     queryKey: ['employee-detail', record.id],
 *     queryFn: () => fetchEmployeeDetail(record.id),
 *   })
 * );
 *
 * <Table
 *   onRow={(record) => ({
 *     onMouseEnter: () => handleRowHover(record),
 *   })}
 * />
 * ```
 */
export const createPrefetchHandler = (
  queryClient: QueryClient,
  getQueryConfig: (record: any) => {
    queryKey: any[];
    queryFn: () => Promise<any>;
  },
) => {
  return (record: any) => {
    const config = getQueryConfig(record);
    prefetchData({
      queryClient,
      ...config,
    });
  };
};

/**
 * 批量预加载数据
 * @param options - 批量预加载配置数组
 *
 * @example
 * ```tsx
 * const queryClient = useQueryClient();
 *
 * // 预加载多个相关数据
 * prefetchBatch([
 *   {
 *     queryClient,
 *     queryKey: ['departments'],
 *     queryFn: () => fetchDepartments(),
 *   },
 *   {
 *     queryClient,
 *     queryKey: ['positions'],
 *     queryFn: () => fetchPositions(),
 *   },
 * ]);
 * ```
 */
export const prefetchBatch = async (options: PrefetchOptions[]) => {
  await Promise.all(options.map((opt) => prefetchData(opt)));
};
