import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PerformanceMonitorInterceptor } from "../interceptors/performance-monitor.interceptor";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";

@ApiTags("性能监控")
@Controller("performance")
@UseGuards(JwtAuthGuard)
export class PerformanceController {
  constructor(
    private readonly performanceMonitor: PerformanceMonitorInterceptor,
  ) {}

  @Get("statistics")
  @ApiOperation({
    summary: "获取性能统计",
    description: "获取系统整体性能统计数据",
  })
  @ApiResponse({
    status: 200,
    description: "返回性能统计数据",
  })
  getStatistics(
    @Query("startTime") startTime?: string,
    @Query("endTime") endTime?: string,
  ) {
    const timeRange =
      startTime && endTime
        ? {
            start: new Date(startTime),
            end: new Date(endTime),
          }
        : undefined;

    return {
      success: true,
      data: this.performanceMonitor.getStatistics(timeRange),
    };
  }

  @Get("endpoints")
  @ApiOperation({
    summary: "获取端点性能统计",
    description: "获取各个 API 端点的性能统计数据",
  })
  @ApiResponse({
    status: 200,
    description: "返回端点性能统计",
  })
  getEndpointStatistics() {
    return {
      success: true,
      data: this.performanceMonitor.getEndpointStatistics(),
    };
  }

  @Get("system")
  @ApiOperation({
    summary: "获取系统资源使用情况",
    description: "获取 CPU、内存等系统资源使用情况",
  })
  @ApiResponse({
    status: 200,
    description: "返回系统资源使用情况",
  })
  getSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      success: true,
      data: {
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          external: Math.round(memoryUsage.external / 1024 / 1024), // MB
          heapUsagePercent: Math.round(
            (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
          ),
        },
        cpu: {
          user: Math.round(cpuUsage.user / 1000), // ms
          system: Math.round(cpuUsage.system / 1000), // ms
        },
        uptime: Math.round(process.uptime()), // seconds
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
      },
    };
  }
}
