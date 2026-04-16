/**
 * 性能监控工具
 */

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * 性能监控类
 */
class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private timers: Map<string, number> = new Map();

  /**
   * 开始计时
   */
  start(name: string): void {
    this.timers.set(name, performance.now());
  }

  /**
   * 结束计时
   */
  end(name: string, metadata?: Record<string, any>): PerformanceMetrics | null {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`[Performance] Timer "${name}" not found`);
      return null;
    }

    const duration = performance.now() - startTime;
    const metric: PerformanceMetrics = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);
    this.timers.delete(name);

    // 如果耗时超过阈值，输出警告
    if (duration > 1000) {
      console.warn(
        `[Performance] "${name}" took ${duration.toFixed(2)}ms`,
        metadata,
      );
    }

    return metric;
  }

  /**
   * 获取所有指标
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * 获取指定名称的指标
   */
  getMetricsByName(name: string): PerformanceMetrics[] {
    return this.metrics.filter((m) => m.name === name);
  }

  /**
   * 获取平均耗时
   */
  getAverageDuration(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;

    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }

  /**
   * 清除指标
   */
  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }

  /**
   * 导出指标
   */
  export(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

// 单例实例
export const performanceMonitor = new PerformanceMonitor();

/**
 * 性能监控装饰器
 */
export function measurePerformance(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      performanceMonitor.start(metricName);
      try {
        const result = await originalMethod.apply(this, args);
        performanceMonitor.end(metricName, { args });
        return result;
      } catch (error) {
        performanceMonitor.end(metricName, { args, error: true });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 测量函数执行时间
 */
export async function measureFunction<T>(
  name: string,
  fn: () => Promise<T> | T,
  metadata?: Record<string, any>,
): Promise<T> {
  performanceMonitor.start(name);
  try {
    const result = await fn();
    performanceMonitor.end(name, metadata);
    return result;
  } catch (error) {
    performanceMonitor.end(name, { ...metadata, error: true });
    throw error;
  }
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;
    const now = Date.now();

    if (!previous) previous = now;

    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(context, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func.apply(context, args);
      }, remaining);
    }
  };
}

/**
 * 批量处理函数
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
  onProgress?: (current: number, total: number) => void,
): Promise<R[]> {
  const results: R[] = [];
  const total = items.length;

  for (let i = 0; i < total; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);

    if (onProgress) {
      onProgress(Math.min(i + batchSize, total), total);
    }
  }

  return results;
}

/**
 * 延迟执行
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 内存使用情况
 */
export function getMemoryUsage(): {
  used: number;
  total: number;
  percentage: number;
} | null {
  if ("memory" in performance) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
    };
  }
  return null;
}

/**
 * 页面加载性能
 */
export function getPageLoadMetrics(): {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
} | null {
  if (!window.performance || !window.performance.timing) {
    return null;
  }

  const timing = window.performance.timing;
  const navigation = timing.navigationStart;

  return {
    domContentLoaded: timing.domContentLoadedEventEnd - navigation,
    loadComplete: timing.loadEventEnd - navigation,
    firstPaint: 0, // 需要使用 PerformanceObserver 获取
    firstContentfulPaint: 0, // 需要使用 PerformanceObserver 获取
  };
}

/**
 * 监控长任务
 */
export function monitorLongTasks(callback: (duration: number) => void): void {
  if ("PerformanceObserver" in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            // 超过50ms的任务被认为是长任务
            callback(entry.duration);
          }
        }
      });

      observer.observe({ entryTypes: ["longtask"] });
    } catch (error) {
      console.warn("[Performance] Long task monitoring not supported");
    }
  }
}

/**
 * 性能报告
 */
export function generatePerformanceReport(): string {
  const metrics = performanceMonitor.getMetrics();
  const memoryUsage = getMemoryUsage();
  const pageLoad = getPageLoadMetrics();

  const report = {
    timestamp: new Date().toISOString(),
    metrics: metrics.map((m) => ({
      name: m.name,
      duration: `${m.duration.toFixed(2)}ms`,
      timestamp: new Date(m.timestamp).toISOString(),
    })),
    memory: memoryUsage
      ? {
          used: `${(memoryUsage.used / 1024 / 1024).toFixed(2)}MB`,
          total: `${(memoryUsage.total / 1024 / 1024).toFixed(2)}MB`,
          percentage: `${memoryUsage.percentage.toFixed(2)}%`,
        }
      : null,
    pageLoad: pageLoad
      ? {
          domContentLoaded: `${pageLoad.domContentLoaded}ms`,
          loadComplete: `${pageLoad.loadComplete}ms`,
        }
      : null,
  };

  return JSON.stringify(report, null, 2);
}
