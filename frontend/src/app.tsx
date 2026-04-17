import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { register } from "@/utils/serviceWorkerRegistration";
import { reportWebVitals } from "@/utils/performance-monitor";

// 启用 Service Worker（离线支持）
if (process.env.NODE_ENV === "production") {
  register({
    onSuccess: () => {
      console.log("[Service Worker] 注册成功，应用已支持离线访问");
    },
    onUpdate: (registration) => {
      console.log("[Service Worker] 发现新版本，请刷新页面获取最新内容");
      // 可以在这里显示更新提示
    },
    onError: (error) => {
      console.error("[Service Worker] 注册失败:", error);
    },
  });
}

// 启用性能监控
reportWebVitals((metric: any) => {
  // 性能数据会自动上报到后端 /api/performance/web-vitals
  console.log("[Performance]", metric);
});

/**
 * React Query 配置优化 (V2.0)
 * 针对150+并发用户场景优化
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 数据缓存时间：5分钟（减少重复请求）
      staleTime: 5 * 60 * 1000,
      // 缓存保留时间：10分钟
      gcTime: 10 * 60 * 1000,
      // 失败重试：1次（减少服务器压力）
      retry: 1,
      // 重试延迟：1秒
      retryDelay: 1000,
      // 窗口聚焦时不自动重新获取（避免不必要的请求）
      refetchOnWindowFocus: false,
      // 网络重连时不自动重新获取
      refetchOnReconnect: false,
      // 组件挂载时不自动重新获取（使用缓存数据）
      refetchOnMount: false,
    },
    mutations: {
      // 变更操作不重试（避免重复提交）
      retry: 0,
    },
  },
});

/**
 * 根容器配置
 * 包含：
 * 1. ErrorBoundary - 全局错误捕获
 * 2. QueryClientProvider - React Query状态管理
 */
export function rootContainer(container: React.ReactNode) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {container}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
