/**
 * 性能监控工具
 * 用于监控和分析应用性能
 */

interface PerformanceMetrics {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private timers: Map<string, number> = new Map();

  /**
   * 开始计时
   */
  start(name: string) {
    this.timers.set(name, performance.now());
  }

  /**
   * 结束计时并记录
   */
  end(name: string) {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`性能计时器 "${name}" 未启动`);
      return;
    }

    const duration = performance.now() - startTime;
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
    });

    this.timers.delete(name);
    
    // 输出到控制台
    console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    
    return duration;
  }

  /**
   * 测量函数执行时间
   */
  async measure<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
    this.start(name);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
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
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * 获取平均时间
   */
  getAverageDuration(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;
    
    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }

  /**
   * 清除所有指标
   */
  clear() {
    this.metrics = [];
    this.timers.clear();
  }

  /**
   * 导出性能报告
   */
  exportReport(): string {
    const report = {
      totalMetrics: this.metrics.length,
      metrics: this.metrics,
      summary: this.getSummary(),
    };
    return JSON.stringify(report, null, 2);
  }

  /**
   * 获取性能摘要
   */
  private getSummary() {
    const names = [...new Set(this.metrics.map(m => m.name))];
    return names.map(name => ({
      name,
      count: this.getMetricsByName(name).length,
      average: this.getAverageDuration(name).toFixed(2) + 'ms',
    }));
  }
}

// 创建单例
export const performanceMonitor = new PerformanceMonitor();

/**
 * 监控页面加载性能
 */
export const monitorPageLoad = () => {
  if (typeof window === 'undefined') return;

  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (perfData) {
      console.log('📊 页面性能指标:');
      console.log(`  DNS 查询: ${(perfData.domainLookupEnd - perfData.domainLookupStart).toFixed(2)}ms`);
      console.log(`  TCP 连接: ${(perfData.connectEnd - perfData.connectStart).toFixed(2)}ms`);
      console.log(`  请求响应: ${(perfData.responseEnd - perfData.requestStart).toFixed(2)}ms`);
      console.log(`  DOM 解析: ${(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart).toFixed(2)}ms`);
      console.log(`  页面加载: ${(perfData.loadEventEnd - perfData.loadEventStart).toFixed(2)}ms`);
      console.log(`  总耗时: ${(perfData.loadEventEnd - perfData.fetchStart).toFixed(2)}ms`);
    }
  });
};

/**
 * 监控首次内容绘制(FCP)
 */
export const monitorFCP = () => {
  if (typeof window === 'undefined') return;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        console.log(`🎨 首次内容绘制(FCP): ${entry.startTime.toFixed(2)}ms`);
      }
    }
  });

  observer.observe({ entryTypes: ['paint'] });
};

/**
 * 监控最大内容绘制(LCP)
 */
export const monitorLCP = () => {
  if (typeof window === 'undefined') return;

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log(`🖼️ 最大内容绘制(LCP): ${lastEntry.startTime.toFixed(2)}ms`);
  });

  observer.observe({ entryTypes: ['largest-contentful-paint'] });
};

/**
 * 监控首次输入延迟(FID)
 */
export const monitorFID = () => {
  if (typeof window === 'undefined') return;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const fidEntry = entry as PerformanceEventTiming;
      const fid = fidEntry.processingStart - fidEntry.startTime;
      console.log(`⚡ 首次输入延迟(FID): ${fid.toFixed(2)}ms`);
    }
  });

  observer.observe({ entryTypes: ['first-input'] });
};

/**
 * 初始化所有性能监控
 */
export const initPerformanceMonitoring = () => {
  monitorPageLoad();
  monitorFCP();
  monitorLCP();
  monitorFID();
};

export default performanceMonitor;
