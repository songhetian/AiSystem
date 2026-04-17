import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

interface PerformanceMetrics {
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  timestamp: Date;
  userId?: string;
  userAgent?: string;
}

@Injectable()
export class PerformanceMonitorInterceptor implements NestInterceptor {
  private readonly logger = new Logger("PerformanceMonitor");
  private readonly slowRequestThreshold = 3000; // 3秒
  private readonly metrics: PerformanceMetrics[] = [];
  private readonly maxMetricsSize = 1000;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.recordMetrics(context, startTime);
        },
        error: () => {
          this.recordMetrics(context, startTime, true);
        },
      }),
    );
  }

  private recordMetrics(
    context: ExecutionContext,
    startTime: number,
    isError: boolean = false,
  ): void {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const duration = Date.now() - startTime;

    const metrics: PerformanceMetrics = {
      method: request.method,
      url: request.url,
      statusCode: response.statusCode,
      duration,
      timestamp: new Date(),
      userId: request.user?.sub,
      userAgent: request.headers["user-agent"],
    };

    // 记录慢请求
    if (duration > this.slowRequestThreshold) {
      this.logger.warn(
        `慢请求检测: ${metrics.method} ${metrics.url} - ${duration}ms`,
        {
          ...metrics,
          threshold: this.slowRequestThreshold,
        },
      );
    }

    // 记录错误请求
    if (isError) {
      this.logger.error(
        `请求失败: ${metrics.method} ${metrics.url} - ${duration}ms`,
        metrics,
      );
    }

    // 存储指标（循环缓冲区）
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics.shift();
    }
  }

  /**
   * 获取性能统计
   */
  getStatistics(timeRange?: { start: Date; end: Date }) {
    let filteredMetrics = this.metrics;

    if (timeRange) {
      filteredMetrics = this.metrics.filter(
        (m) => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end,
      );
    }

    if (filteredMetrics.length === 0) {
      return null;
    }

    const durations = filteredMetrics
      .map((m) => m.duration)
      .sort((a, b) => a - b);
    const totalRequests = filteredMetrics.length;
    const slowRequests = filteredMetrics.filter(
      (m) => m.duration > this.slowRequestThreshold,
    ).length;

    return {
      totalRequests,
      slowRequests,
      slowRequestRate: (slowRequests / totalRequests) * 100,
      avgDuration: durations.reduce((a, b) => a + b, 0) / totalRequests,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50: durations[Math.floor(totalRequests * 0.5)],
      p95: durations[Math.floor(totalRequests * 0.95)],
      p99: durations[Math.floor(totalRequests * 0.99)],
      topSlowRequests: filteredMetrics
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10)
        .map((m) => ({
          method: m.method,
          url: m.url,
          duration: m.duration,
          timestamp: m.timestamp,
        })),
    };
  }

  /**
   * 按端点分组统计
   */
  getEndpointStatistics() {
    const endpointMap = new Map<string, PerformanceMetrics[]>();

    for (const metric of this.metrics) {
      const key = `${metric.method} ${metric.url}`;
      if (!endpointMap.has(key)) {
        endpointMap.set(key, []);
      }
      endpointMap.get(key)!.push(metric);
    }

    const statistics = [];

    for (const [endpoint, metrics] of endpointMap.entries()) {
      const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
      const totalRequests = metrics.length;

      statistics.push({
        endpoint,
        totalRequests,
        avgDuration: durations.reduce((a, b) => a + b, 0) / totalRequests,
        minDuration: durations[0],
        maxDuration: durations[durations.length - 1],
        p50: durations[Math.floor(totalRequests * 0.5)],
        p95: durations[Math.floor(totalRequests * 0.95)],
        p99: durations[Math.floor(totalRequests * 0.99)],
      });
    }

    return statistics.sort((a, b) => b.avgDuration - a.avgDuration);
  }

  /**
   * 清除指标
   */
  clearMetrics(): void {
    this.metrics.length = 0;
  }
}
