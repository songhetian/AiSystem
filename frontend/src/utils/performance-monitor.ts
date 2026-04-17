/**
 * Web Vitals 性能指标类型
 */
interface WebVitalsMetric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
}

/**
 * 上报性能指标到后端
 * @param metric 性能指标
 */
export const reportWebVitals = async (metric: WebVitalsMetric) => {
  try {
    // 只在生产环境上报
    if (process.env.NODE_ENV !== "production") {
      console.log("[Performance]", metric);
      return;
    }

    await fetch("/api/performance/web-vitals", {
      method: "POST",
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[Performance] 上报失败", error);
  }
};

/**
 * 记录页面加载时间
 */
export const logPageLoadTime = () => {
  if (typeof window !== "undefined" && window.performance) {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    const connectTime = perfData.responseEnd - perfData.requestStart;
    const renderTime = perfData.domComplete - perfData.domLoading;

    console.log("[Performance] 页面加载性能:", {
      总加载时间: `${pageLoadTime}ms`,
      网络连接时间: `${connectTime}ms`,
      页面渲染时间: `${renderTime}ms`,
    });

    return {
      pageLoadTime,
      connectTime,
      renderTime,
    };
  }
  return null;
};

/**
 * 监听长任务（Long Tasks）
 */
export const observeLongTasks = () => {
  if ("PerformanceObserver" in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn("[Performance] 检测到长任务:", {
              名称: entry.name,
              持续时间: `${entry.duration.toFixed(2)}ms`,
              开始时间: `${entry.startTime.toFixed(2)}ms`,
            });
          }
        }
      });

      observer.observe({ entryTypes: ["longtask"] });
      return observer;
    } catch (e) {
      console.error("[Performance] 长任务监听失败", e);
    }
  }
  return null;
};

/**
 * 初始化性能监控
 */
export const initPerformanceMonitoring = () => {
  // 页面加载完成后记录性能数据
  if (document.readyState === "complete") {
    logPageLoadTime();
  } else {
    window.addEventListener("load", logPageLoadTime);
  }

  // 监听长任务
  observeLongTasks();

  // 监听资源加载错误
  window.addEventListener(
    "error",
    (event) => {
      if (event.target !== window) {
        console.error("[Performance] 资源加载失败:", {
          资源: (event.target as any)?.src || (event.target as any)?.href,
          类型: (event.target as any)?.tagName,
        });
      }
    },
    true,
  );
};
