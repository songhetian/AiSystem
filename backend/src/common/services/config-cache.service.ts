import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "./redis.service";

/**
 * 配置缓存服务
 * 提供系统配置的缓存访问，减少数据库查询
 */
@Injectable()
export class ConfigCacheService implements OnModuleInit {
  private readonly logger = new Logger(ConfigCacheService.name);
  private readonly CACHE_PREFIX = "sys_config:";
  private readonly DEFAULT_TTL = 300; // 5分钟缓存

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    this.logger.log("ConfigCacheService initialized");
  }

  /**
   * 获取配置值（带缓存）
   */
  async get(key: string, defaultValue?: string): Promise<string | null> {
    try {
      // 1. 尝试从 Redis 获取
      const cacheKey = `${this.CACHE_PREFIX}${key}`;
      const cached = await this.redisService.get(cacheKey);

      if (cached !== null) {
        return cached;
      }

      // 2. 从数据库查询
      const config = await this.prisma.sys_config.findUnique({
        where: { config_key: key },
        select: { config_value: true },
      });

      const value = config?.config_value ?? defaultValue ?? null;

      // 3. 存入缓存
      if (value !== null) {
        await this.redisService.set(cacheKey, value, this.DEFAULT_TTL);
      }

      return value;
    } catch (error) {
      this.logger.error(`Failed to get config ${key}: ${error.message}`);
      return defaultValue ?? null;
    }
  }

  /**
   * 获取配置值并转换为数字
   */
  async getNumber(key: string, defaultValue: number): Promise<number> {
    const value = await this.get(key, String(defaultValue));
    return value ? parseInt(value, 10) : defaultValue;
  }

  /**
   * 获取配置值并转换为布尔值
   */
  async getBoolean(key: string, defaultValue: boolean): Promise<boolean> {
    const value = await this.get(key, String(defaultValue));
    return value === "true" || value === "1";
  }

  /**
   * 获取配置值并解析为 JSON
   */
  async getJson<T = any>(key: string, defaultValue?: T): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return defaultValue ?? null;

    try {
      return JSON.parse(value);
    } catch (error) {
      this.logger.error(`Failed to parse JSON config ${key}: ${error.message}`);
      return defaultValue ?? null;
    }
  }

  /**
   * 批量获取配置
   */
  async getMany(keys: string[]): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {};

    // 使用 Promise.all 并行查询
    await Promise.all(
      keys.map(async (key) => {
        result[key] = await this.get(key);
      }),
    );

    return result;
  }

  /**
   * 设置配置值（同时更新数据库和缓存）
   */
  async set(key: string, value: string, remark?: string): Promise<void> {
    try {
      // 1. 更新数据库
      await this.prisma.sys_config.upsert({
        where: { config_key: key },
        create: {
          config_key: key,
          config_value: value,
          remark: remark,
        },
        update: {
          config_value: value,
          remark: remark,
        },
      });

      // 2. 更新缓存
      const cacheKey = `${this.CACHE_PREFIX}${key}`;
      await this.redisService.set(cacheKey, value, this.DEFAULT_TTL);

      this.logger.log(`Config ${key} updated`);
    } catch (error) {
      this.logger.error(`Failed to set config ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 删除配置（同时删除数据库和缓存）
   */
  async delete(key: string): Promise<void> {
    try {
      // 1. 删除数据库记录
      await this.prisma.sys_config.update({
        where: { config_key: key },
        data: { is_deleted: 1 },
      });

      // 2. 删除缓存
      const cacheKey = `${this.CACHE_PREFIX}${key}`;
      await this.redisService.del(cacheKey);

      this.logger.log(`Config ${key} deleted`);
    } catch (error) {
      this.logger.error(`Failed to delete config ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 清除指定配置的缓存
   */
  async clearCache(key: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${key}`;
    await this.redisService.del(cacheKey);
    this.logger.log(`Cache cleared for config ${key}`);
  }

  /**
   * 清除所有配置缓存
   */
  async clearAllCache(): Promise<void> {
    const redis = this.redisService.getClient();
    const keys = await redis.keys(`${this.CACHE_PREFIX}*`);

    if (keys.length > 0) {
      await redis.del(...keys);
      this.logger.log(`Cleared ${keys.length} config cache entries`);
    }
  }
}
