export const reportWebVitals = (metric: any) => {
  // 开发环境只在控制台输出，不发送请求
  if (process.env.NODE_ENV === "development") {
    console.log("[Performance Metric]", metric);
    return;
  }

  // 生产环境上报到后端性能监控 API
  try {
    fetch("/api/v1/performance/web-vitals", {
      method: "POST",
      body: JSON.stringify(metric),
      headers: { "Content-Type": "application/json" },
    }).catch((error) => {
      // 静默处理网络错误，不影响应用正常运行
      console.warn("Failed to report web vitals:", error);
    });
  } catch (error) {
    console.warn("Failed to report web vitals:", error);
  }
};

// 性能监控工具函数
export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`${name} took ${end - start} milliseconds`);
};
