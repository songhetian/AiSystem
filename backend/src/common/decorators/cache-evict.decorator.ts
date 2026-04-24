import { SetMetadata } from '@nestjs/common';

export const CACHE_EVICT_KEY = 'cache_evict';

export interface CacheEvictOptions {
  /**
   * 要清除的缓存Key模式（支持通配符）
   * 例如：'cache:getUserInfo:*' 会清除所有getUserInfo的缓存
   */
  pattern?: string;
  /**
   * 要清除的缓存Key数组（支持通配符）
   * 例如：['cache:getUserInfo:*', 'cache:getUser:*']
   */
  keys?: string[];
  /**
   * 是否在方法执行前清除缓存，默认 false（方法执行后清除）
   */
  beforeInvocation?: boolean;
  /**
   * 缓存前缀
   */
  prefix?: string | string[];
}

/**
 * 缓存清除装饰器 (V1.0)
 *
 * 职责：在数据更新时自动清除相关缓存
 *
 * 使用场景：
 * 1. 更新用户信息后，清除用户信息缓存
 * 2. 更新权限后，清除权限缓存
 * 3. 更新字典数据后，清除字典缓存
 *
 * @example
 * ```typescript
 * @CacheEvict({ pattern: 'cache:getUserInfo:*' })
 * async updateUser(userId: string, data: any) {
 *   return this.prisma.user.update({ where: { id: userId }, data });
 * }
 * ```
 */
export const CacheEvict = (options: CacheEvictOptions) =>
  SetMetadata(CACHE_EVICT_KEY, options);
