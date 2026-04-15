import { SetMetadata } from "@nestjs/common";

/**
 * 限流类型枚举
 */
export enum RateLimitType {
  IP = "ip", // 单IP限流
  USER = "user", // 单用户限流
  API = "api", // 接口级限流
  GLOBAL = "global", // 全局限流
}

/**
 * 限流配置接口
 */
export interface RateLimitOptions {
  type: RateLimitType; // 限流类型
  limit: number; // 限流阈值（请求次数）
  window: number; // 时间窗口（秒）
  message?: string; // 限流提示信息
  enableQueue?: boolean; // 是否启用请求排队
  queueSize?: number; // 队列大小
  queueTimeout?: number; // 队列超时时间（秒）
}

export const RATE_LIMIT_KEY = "rate_limit";

/**
 * 限流装饰器
 *
 * @example
 * // 单IP限流：每分钟最多10次请求
 * @RateLimit({ type: RateLimitType.IP, limit: 10, window: 60 })
 *
 * // 单用户限流：每10秒最多5次请求
 * @RateLimit({ type: RateLimitType.USER, limit: 5, window: 10 })
 *
 * // 接口级限流：每秒最多20次请求，启用排队
 * @RateLimit({
 *   type: RateLimitType.API,
 *   limit: 20,
 *   window: 1,
 *   enableQueue: true,
 *   queueSize: 50
 * })
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);
