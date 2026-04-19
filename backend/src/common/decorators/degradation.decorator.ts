import { SetMetadata } from "@nestjs/common";

/**
 * 降级级别枚举
 */
export enum DegradationLevel {
  NORMAL = 0, // 正常状态
  LIGHT = 1, // 一级降级（轻度）
  MEDIUM = 2, // 二级降级（中度）
  HEAVY = 3, // 三级降级（重度）
}

/**
 * 降级配置接口
 */
export interface DegradationOptions {
  level: DegradationLevel; // 降级级别
  fallback?: (...args: any[]) => any; // 降级处理函数
  message?: string; // 降级提示信息
  isCore?: boolean; // 是否核心功能
}

export const DEGRADATION_KEY = "degradation";

/**
 * 降级装饰器
 *
 * @example
 * // 非核心功能，一级降级时关闭
 * @Degradation({
 *   level: DegradationLevel.LIGHT,
 *   message: '当前功能暂时不可用，请稍后再试'
 * })
 *
 * // 次要核心功能，二级降级时简化
 * @Degradation({
 *   level: DegradationLevel.MEDIUM,
 *   isCore: true,
 *   fallback: (args) => simplifiedLogic(args)
 * })
 *
 * // 核心功能，三级降级时保留
 * @Degradation({
 *   level: DegradationLevel.HEAVY,
 *   isCore: true
 * })
 */
export const Degradation = (options: DegradationOptions) =>
  SetMetadata(DEGRADATION_KEY, options);
