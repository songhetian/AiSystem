export const reportWebVitals = (metric: any) => {
  // 上报到后端性能监控 API
  try {
    fetch("/api/performance/web-vitals", {
      method: "POST",
      body: JSON.stringify(metric),
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to report web vitals:", error);
  }
};

// 性能监控工具函数
export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`${name} took ${end - start} milliseconds`);
};
