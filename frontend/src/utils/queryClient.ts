import { QueryClient } from '@tanstack/react-query';

/**
 * React Query 全局配置
 * 优化数据缓存和请求策略
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 数据新鲜时间 5 分钟
      staleTime: 5 * 60 * 1000,
      // 缓存保持时间 10 分钟
      gcTime: 10 * 60 * 1000,
      // 失败重试 3 次
      retry: 3,
      // 重试延迟(指数退避)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // 窗口聚焦时不自动重新获取
      refetchOnWindowFocus: false,
      // 网络重连时重新获取
      refetchOnReconnect: true,
      // 组件挂载时不自动重新获取
      refetchOnMount: false,
    },
    mutations: {
      // 变更失败重试 1 次
      retry: 1,
      // 重试延迟
      retryDelay: 1000,
    },
  },
});

/**
 * 预加载关键数据
 * 在应用启动时预加载常用数据
 */
export const preloadCriticalData = async () => {
  try {
    // 预加载用户信息
    await queryClient.prefetchQuery({
      queryKey: ['user', 'profile'],
      queryFn: async () => {
        const { default: api } = await import('@/api/auth');
        return api.getProfile();
      },
      staleTime: 10 * 60 * 1000, // 10分钟
    });

    // 预加载菜单数据
    await queryClient.prefetchQuery({
      queryKey: ['system', 'menus'],
      queryFn: async () => {
        const { default: api } = await import('@/api/system');
        return api.getMenus();
      },
      staleTime: 30 * 60 * 1000, // 30分钟
    });

    console.log('关键数据预加载完成');
  } catch (error) {
    console.error('关键数据预加载失败:', error);
  }
};

/**
 * 清除所有缓存
 */
export const clearAllCache = () => {
  queryClient.clear();
  console.log('所有缓存已清除');
};

/**
 * 清除指定查询的缓存
 */
export const clearQueryCache = (queryKey: string[]) => {
  queryClient.removeQueries({ queryKey });
  console.log('缓存已清除:', queryKey);
};

/**
 * 使指定查询失效并重新获取
 */
export const invalidateQuery = async (queryKey: string[]) => {
  await queryClient.invalidateQueries({ queryKey });
  console.log('查询已失效并重新获取:', queryKey);
};

export default queryClient;
