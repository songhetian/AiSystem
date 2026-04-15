import { SetMetadata } from "@nestjs/common";

/**
 * 并发控制类型
 */
export enum ConcurrentControlType {
  OPTIMISTIC = "optimistic", // 乐观锁
  PESSIMISTIC = "pessimistic", // 悲观锁
  QUEUE = "queue", // 队列控制
}

/**
 * 并发控制配置
 */
export interface ConcurrentControlOptions {
  type: ConcurrentControlType;
  key?: string; // 锁的key（支持参数占位符，如 'user:{userId}'）
  timeout?: number; // 锁超时时间（毫秒）
  retryTimes?: number; // 重试次数
  retryDelay?: number; // 重试延迟（毫秒）
  queueSize?: number; // 队列大小（仅队列控制）
}

export const CONCURRENT_CONTROL_KEY = "concurrent_control";

/**
 * 并发控制装饰器
 *
 * @example
 * // 乐观锁：适用于读多写少的场景
 * @ConcurrentControl({
 *   type: ConcurrentControlType.OPTIMISTIC,
 *   key: 'user:{id}'
 * })
 * async updateUser(id: string, data: any) {
 *   // 更新时检查版本号
 * }
 *
 * // 悲观锁：适用于写多读少的场景
 * @ConcurrentControl({
 *   type: ConcurrentControlType.PESSIMISTIC,
 *   key: 'inventory:{productId}',
 *   timeout: 5000
 * })
 * async decreaseInventory(productId: string, quantity: number) {
 *   // 减库存操作，防止超卖
 * }
 *
 * // 队列控制：适用于需要顺序执行的场景
 * @ConcurrentControl({
 *   type: ConcurrentControlType.QUEUE,
 *   key: 'order:{userId}',
 *   queueSize: 10
 * })
 * async createOrder(userId: string, orderData: any) {
 *   // 同一用户的订单按顺序创建
 * }
 */
export const ConcurrentControl = (options: ConcurrentControlOptions) =>
  SetMetadata(CONCURRENT_CONTROL_KEY, options);
