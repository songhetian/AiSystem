import { SetMetadata } from '@nestjs/common';

export const QUERY_OPTIMIZE_KEY = 'query_optimize';

export interface QueryOptimizeOptions {
  /**
   * 是否启用批量加载优化
   */
  batchLoad?: boolean;
  /**
   * 查询超时时间（毫秒），默认5000ms
   */
  timeout?: number;
  /**
   * 是否记录慢查询日志
   */
  logSlowQuery?: boolean;
  /**
   * 慢查询阈值（毫秒），默认200ms
   */
  slowQueryThreshold?: number;
}

/**
 * 查询优化装饰器 (V1.0)
 * 
 * 职责：
 * 1. 记录查询耗时
 * 2. 慢查询告警
 * 3. 查询超时保护
 * 
 * @example
 * ```typescript
 * @QueryOptimize({ timeout: 5000, logSlowQuery: true })
 * async findUsers() {
 *   return this.prisma.user.findMany();
 * }
 * ```
 */
export const QueryOptimize = (options: QueryOptimizeOptions = {}) =>
  SetMetadata(QUERY_OPTIMIZE_KEY, {
    batchLoad: options.batchLoad || false,
    timeout: options.timeout || 5000,
    logSlowQuery: options.logSlowQuery !== false,
    slowQueryThreshold: options.slowQueryThreshold || 200,
  });
