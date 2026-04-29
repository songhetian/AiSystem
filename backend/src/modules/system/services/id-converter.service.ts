import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../common/services/redis.service';

/**
 * ID转换服务
 * 负责将用户ID、平台ID、部门ID、店铺ID批量转换为真实名称
 * 使用Redis缓存提升性能，TTL为1小时
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 8.1, 8.2, 8.3, 8.4, 8.5
 */
@Injectable()
export class IdConverterService {
  private readonly logger = new Logger(IdConverterService.name);
  private readonly CACHE_TTL = 3600; // 1小时缓存

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 批量转换用户ID为真实姓名
   * @param userIds 用户ID数组
   * @returns Map<userId, userName>
   */
  async convertUserIds(userIds: string[]): Promise<Map<string, string>> {
    if (!userIds || userIds.length === 0) {
      return new Map();
    }

    const uniqueIds = [...new Set(userIds)];
    const result = new Map<string, string>();
    const uncachedIds: string[] = [];

    // 1. 尝试从Redis缓存获取
    for (const id of uniqueIds) {
      const cacheKey = this.getUserCacheKey(id);
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          result.set(id, cached);
        } else {
          uncachedIds.push(id);
        }
      } catch (error) {
        this.logger.warn(`Redis get failed for user ${id}: ${error}`);
        uncachedIds.push(id);
      }
    }

    // 2. 从数据库查询未缓存的ID
    if (uncachedIds.length > 0) {
      try {
        const users = await this.prisma.sys_user.findMany({
          where: {
            id: { in: uncachedIds },
          },
          select: {
            id: true,
            name: true,
            is_deleted: true,
          },
        });

        for (const user of users) {
          let displayName: string;

          if (user.is_deleted === 1) {
            // Requirement 3.3: 已删除用户显示 "已删除用户(原ID: XXX)"
            displayName = `已删除用户(原ID: ${user.id})`;
          } else {
            displayName = user.name;
          }

          result.set(user.id, displayName);

          // 缓存到Redis
          await this.cacheUserName(user.id, displayName);
        }

        // 3. 处理无效ID (数据库中不存在)
        // Requirement 3.2: 无效ID显示 "未知用户"
        for (const id of uncachedIds) {
          if (!result.has(id)) {
            const displayName = '未知用户';
            result.set(id, displayName);
            await this.cacheUserName(id, displayName);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to query users: ${error}`);
        // 查询失败时，所有未缓存的ID都标记为"未知用户"
        for (const id of uncachedIds) {
          if (!result.has(id)) {
            result.set(id, '未知用户');
          }
        }
      }
    }

    return result;
  }

  /**
   * 批量转换平台ID为真实名称
   * @param platformIds 平台ID数组
   * @returns Map<platformId, platformName>
   */
  async convertPlatformIds(platformIds: string[]): Promise<Map<string, string>> {
    if (!platformIds || platformIds.length === 0) {
      return new Map();
    }

    const uniqueIds = [...new Set(platformIds)];
    const result = new Map<string, string>();
    const uncachedIds: string[] = [];

    // 1. 尝试从Redis缓存获取
    for (const id of uniqueIds) {
      const cacheKey = this.getPlatformCacheKey(id);
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          result.set(id, cached);
        } else {
          uncachedIds.push(id);
        }
      } catch (error) {
        this.logger.warn(`Redis get failed for platform ${id}: ${error}`);
        uncachedIds.push(id);
      }
    }

    // 2. 从数据库查询未缓存的ID
    if (uncachedIds.length > 0) {
      try {
        const platforms = await this.prisma.biz_platform.findMany({
          where: {
            id: { in: uncachedIds },
          },
          select: {
            id: true,
            name: true,
            is_deleted: true,
          },
        });

        for (const platform of platforms) {
          let displayName: string;

          if (platform.is_deleted === 1) {
            // Requirement 3.5: 已删除平台显示 "未知平台"
            displayName = '未知平台';
          } else {
            displayName = platform.name;
          }

          result.set(platform.id, displayName);
          await this.cachePlatformName(platform.id, displayName);
        }

        // 3. 处理无效ID
        // Requirement 3.5: 无效平台ID显示 "未知平台"
        for (const id of uncachedIds) {
          if (!result.has(id)) {
            const displayName = '未知平台';
            result.set(id, displayName);
            await this.cachePlatformName(id, displayName);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to query platforms: ${error}`);
        for (const id of uncachedIds) {
          if (!result.has(id)) {
            result.set(id, '未知平台');
          }
        }
      }
    }

    return result;
  }

  /**
   * 批量转换部门ID为真实名称
   * @param deptIds 部门ID数组
   * @returns Map<deptId, deptName>
   */
  async convertDepartmentIds(deptIds: string[]): Promise<Map<string, string>> {
    if (!deptIds || deptIds.length === 0) {
      return new Map();
    }

    const uniqueIds = [...new Set(deptIds)];
    const result = new Map<string, string>();
    const uncachedIds: string[] = [];

    // 1. 尝试从Redis缓存获取
    for (const id of uniqueIds) {
      const cacheKey = this.getDepartmentCacheKey(id);
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          result.set(id, cached);
        } else {
          uncachedIds.push(id);
        }
      } catch (error) {
        this.logger.warn(`Redis get failed for department ${id}: ${error}`);
        uncachedIds.push(id);
      }
    }

    // 2. 从数据库查询未缓存的ID
    if (uncachedIds.length > 0) {
      try {
        const departments = await this.prisma.biz_department.findMany({
          where: {
            id: { in: uncachedIds },
          },
          select: {
            id: true,
            name: true,
            is_deleted: true,
          },
        });

        for (const dept of departments) {
          let displayName: string;

          if (dept.is_deleted === 1) {
            // Requirement 3.5: 已删除部门显示 "未知部门"
            displayName = '未知部门';
          } else {
            displayName = dept.name;
          }

          result.set(dept.id, displayName);
          await this.cacheDepartmentName(dept.id, displayName);
        }

        // 3. 处理无效ID
        // Requirement 3.5: 无效部门ID显示 "未知部门"
        for (const id of uncachedIds) {
          if (!result.has(id)) {
            const displayName = '未知部门';
            result.set(id, displayName);
            await this.cacheDepartmentName(id, displayName);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to query departments: ${error}`);
        for (const id of uncachedIds) {
          if (!result.has(id)) {
            result.set(id, '未知部门');
          }
        }
      }
    }

    return result;
  }

  /**
   * 批量转换店铺ID为真实名称
   * @param shopIds 店铺ID数组
   * @returns Map<shopId, shopName>
   */
  async convertShopIds(shopIds: string[]): Promise<Map<string, string>> {
    if (!shopIds || shopIds.length === 0) {
      return new Map();
    }

    const uniqueIds = [...new Set(shopIds)];
    const result = new Map<string, string>();
    const uncachedIds: string[] = [];

    // 1. 尝试从Redis缓存获取
    for (const id of uniqueIds) {
      const cacheKey = this.getShopCacheKey(id);
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          result.set(id, cached);
        } else {
          uncachedIds.push(id);
        }
      } catch (error) {
        this.logger.warn(`Redis get failed for shop ${id}: ${error}`);
        uncachedIds.push(id);
      }
    }

    // 2. 从数据库查询未缓存的ID
    if (uncachedIds.length > 0) {
      try {
        const shops = await this.prisma.biz_shop.findMany({
          where: {
            id: { in: uncachedIds },
          },
          select: {
            id: true,
            name: true,
            is_deleted: true,
          },
        });

        for (const shop of shops) {
          let displayName: string;

          if (shop.is_deleted === 1) {
            // Requirement 3.5: 已删除店铺显示 "未知店铺"
            displayName = '未知店铺';
          } else {
            displayName = shop.name;
          }

          result.set(shop.id, displayName);
          await this.cacheShopName(shop.id, displayName);
        }

        // 3. 处理无效ID
        // Requirement 3.5: 无效店铺ID显示 "未知店铺"
        for (const id of uncachedIds) {
          if (!result.has(id)) {
            const displayName = '未知店铺';
            result.set(id, displayName);
            await this.cacheShopName(id, displayName);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to query shops: ${error}`);
        for (const id of uncachedIds) {
          if (!result.has(id)) {
            result.set(id, '未知店铺');
          }
        }
      }
    }

    return result;
  }

  /**
   * 清除指定用户的缓存
   * @param userId 用户ID
   */
  async evictUserCache(userId: string): Promise<void> {
    try {
      const cacheKey = this.getUserCacheKey(userId);
      await this.redis.del(cacheKey);
      this.logger.debug(`Evicted user cache: ${userId}`);
    } catch (error) {
      this.logger.warn(`Failed to evict user cache ${userId}: ${error}`);
    }
  }

  /**
   * 清除指定平台的缓存
   * @param platformId 平台ID
   */
  async evictPlatformCache(platformId: string): Promise<void> {
    try {
      const cacheKey = this.getPlatformCacheKey(platformId);
      await this.redis.del(cacheKey);
      this.logger.debug(`Evicted platform cache: ${platformId}`);
    } catch (error) {
      this.logger.warn(`Failed to evict platform cache ${platformId}: ${error}`);
    }
  }

  /**
   * 清除指定部门的缓存
   * @param deptId 部门ID
   */
  async evictDepartmentCache(deptId: string): Promise<void> {
    try {
      const cacheKey = this.getDepartmentCacheKey(deptId);
      await this.redis.del(cacheKey);
      this.logger.debug(`Evicted department cache: ${deptId}`);
    } catch (error) {
      this.logger.warn(`Failed to evict department cache ${deptId}: ${error}`);
    }
  }

  /**
   * 清除指定店铺的缓存
   * @param shopId 店铺ID
   */
  async evictShopCache(shopId: string): Promise<void> {
    try {
      const cacheKey = this.getShopCacheKey(shopId);
      await this.redis.del(cacheKey);
      this.logger.debug(`Evicted shop cache: ${shopId}`);
    } catch (error) {
      this.logger.warn(`Failed to evict shop cache ${shopId}: ${error}`);
    }
  }

  /**
   * 清除所有ID转换缓存
   */
  async evictAllCache(): Promise<void> {
    try {
      await this.redis.deleteByPattern('id-converter:*');
      this.logger.log('Evicted all ID converter cache');
    } catch (error) {
      this.logger.warn(`Failed to evict all cache: ${error}`);
    }
  }

  // ==================== 私有方法 ====================

  private getUserCacheKey(userId: string): string {
    return `id-converter:user:${userId}`;
  }

  private getPlatformCacheKey(platformId: string): string {
    return `id-converter:platform:${platformId}`;
  }

  private getDepartmentCacheKey(deptId: string): string {
    return `id-converter:department:${deptId}`;
  }

  private getShopCacheKey(shopId: string): string {
    return `id-converter:shop:${shopId}`;
  }

  private async cacheUserName(userId: string, name: string): Promise<void> {
    try {
      const cacheKey = this.getUserCacheKey(userId);
      await this.redis.set(cacheKey, name, this.CACHE_TTL);
    } catch (error) {
      this.logger.warn(`Failed to cache user name ${userId}: ${error}`);
    }
  }

  private async cachePlatformName(platformId: string, name: string): Promise<void> {
    try {
      const cacheKey = this.getPlatformCacheKey(platformId);
      await this.redis.set(cacheKey, name, this.CACHE_TTL);
    } catch (error) {
      this.logger.warn(`Failed to cache platform name ${platformId}: ${error}`);
    }
  }

  private async cacheDepartmentName(deptId: string, name: string): Promise<void> {
    try {
      const cacheKey = this.getDepartmentCacheKey(deptId);
      await this.redis.set(cacheKey, name, this.CACHE_TTL);
    } catch (error) {
      this.logger.warn(`Failed to cache department name ${deptId}: ${error}`);
    }
  }

  private async cacheShopName(shopId: string, name: string): Promise<void> {
    try {
      const cacheKey = this.getShopCacheKey(shopId);
      await this.redis.set(cacheKey, name, this.CACHE_TTL);
    } catch (error) {
      this.logger.warn(`Failed to cache shop name ${shopId}: ${error}`);
    }
  }
}
