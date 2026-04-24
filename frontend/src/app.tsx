import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { register } from "@/utils/serviceWorkerRegistration";
import { reportWebVitals } from "@/utils/performance-monitor";

console.log("[App] 应用开始初始化");
console.log("[App] 环境变量:", {
  NODE_ENV: process.env.NODE_ENV,
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL,
});

if (process.env.NODE_ENV === "production") {
  register({
    onSuccess: () => {
      console.log("[Service Worker] 注册成功，应用已支持离线访问");
    },
    onUpdate: () => {
      console.log("[Service Worker] 发现新版本，请刷新页面获取最新内容");
    },
    onError: (error) => {
      console.error("[Service Worker] 注册失败:", error);
    },
  });
}

try {
  reportWebVitals((metric: unknown) => {
    console.log("[Performance]", metric);
  });
} catch (error) {
  console.warn("[Performance] 性能监控初始化失败:", error);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

console.log("[App] React Query 客户端创建完成");

const resolveMountElement = (): HTMLElement | null => {
  if (typeof document === "undefined") {
    return null;
  }

  const mountElement =
    document.getElementById("root") ||
    document.getElementById("sidebar.content") ||
    document.getElementById("sidebar-content") ||
    document.querySelector<HTMLElement>('[data-slot="sidebar.content"]') ||
    document.querySelector<HTMLElement>('[name="sidebar.content"]') ||
    document.querySelector<HTMLElement>(".sidebar-content") ||
    document.querySelector<HTMLElement>(".sidebar\\.content");

  console.log("[App] 挂载节点解析结果:", mountElement);
  return mountElement;
};

export function rootContainer(container: React.ReactNode) {
  console.log("[App] 根容器初始化");
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {container}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export function modifyClientRenderOpts(opts: Record<string, unknown>) {
  return {
    ...opts,
    rootElement: resolveMountElement(),
  };
}
