import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache';

export interface CacheOptions {
  /**
   * 缓存时长（秒），默认 60秒
   */
  ttl?: number;
  /**
   * 缓存Key前缀，默认使用方法名
   */
  prefix?: string;
  /**
   * 是否根据用户ID生成缓存Key，默认 false
   */
  byUser?: boolean;
  /**
   * 是否根据请求参数生成缓存Key，默认 true
   */
  byParams?: boolean;
}

/**
 * 接口响应缓存装饰器 (V1.0)
 * 
 * 职责：缓存接口响应结果到Redis，减少数据库查询
 * 
 * 使用场景：
 * 1. 高频查询接口（用户信息、权限信息、字典数据）
 * 2. 数据变化不频繁的接口
 * 3. 查询成本较高的接口
 * 
 * 注意事项：
 * 1. 实时性要求高的数据不应缓存
 * 2. 缓存可能导致数据不一致
 * 3. 需要在数据更新时清除缓存
 * 
 * @example
 * ```typescript
 * @Cache({ ttl: 300, byUser: true })
 * async getUserInfo(userId: string) {
 *   return this.prisma.user.findUnique({ where: { id: userId } });
 * }
 * ```
 */
export const Cache = (options: CacheOptions = {}) => 
  SetMetadata(CACHE_KEY, {
    ttl: options.ttl || 60,
    prefix: options.prefix,
    byUser: options.byUser || false,
    byParams: options.byParams !== false,
  });
