import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_KEY = 'idempotent';

export interface IdempotentOptions {
  /**
   * 模式：passive (仅响应 Header) | active (自动计算哈希指纹)
   * 默认：active
   */
  mode?: 'passive' | 'active';
  /**
   * 存储有效时长（秒），默认 300s (5分钟)
   */
  ttl?: number;
  /**
   * 窗口期（毫秒）
   */
  window?: number;
  /**
   * 用于哈希计算的字段名
   */
  keyFields?: string[];
}

/**
 * 接口幂等控制装饰器 (V3.0)
 */
export const Idempotent = (options: IdempotentOptions = { mode: 'active', ttl: 300 }) => 
  SetMetadata(IDEMPOTENT_KEY, options);
