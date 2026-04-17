import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../common/services/redis.service";

/**
 * 班次规则缓存服务
 * 班次规则是频繁查询但很少变更的数据，非常适合缓存
 */
@Injectable()
export class ShiftCacheService implements OnModuleInit {
  private readonly logger = new Logger(ShiftCacheService.name);
  private readonly CACHE_PREFIX = "shift_rule:";
  private readonly CACHE_TTL = 600; // 10分钟缓存

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    this.logger.log("ShiftCacheService initialized");
  }

  /**
   * 获取部门的所有班次规则（带缓存）
   */
  async getShiftsByDept(
    platformId: string,
    deptId: string,
    options?: {
      shiftIds?: string[];
      status?: number;
    },
  ): Promise<any[]> {
    try {
      const cacheKey = this.buildCacheKey(platformId, deptId, options);

      // 1. 尝试从缓存获取
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // 2. 从数据库查询
      const where: any = {
        platform_id: platformId,
        dept_id: deptId,
        is_deleted: 0,
      };

      if (options?.shiftIds && options.shiftIds.length > 0) {
        where.id = { in: options.shiftIds };
      }

      if (options?.status !== undefined) {
        where.status = options.status;
      }

      const shifts = await this.prisma.attendance_rule.findMany({
        where,
        select: {
          id: true,
          name: true,
          on_duty_time: true,
          off_duty_time: true,
          late_threshold: true,
          early_threshold: true,
          absenteeism_threshold: true,
          color: true,
          opacity: true,
          status: true,
        },
        orderBy: { create_time: "asc" },
      });

      // 3. 存入缓存
      await this.redisService.set(
        cacheKey,
        JSON.stringify(shifts),
        this.CACHE_TTL,
      );

      return shifts;
    } catch (error) {
      this.logger.error(`Failed to get shifts: ${error.message}`);
      // 降级：直接查询数据库
      return this.getShiftsFromDb(platformId, deptId, options);
    }
  }

  /**
   * 获取单个班次规则（带缓存）
   */
  async getShiftById(shiftId: string): Promise<any | null> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}id:${shiftId}`;

      // 1. 尝试从缓存获取
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // 2. 从数据库查询
      const shift = await this.prisma.attendance_rule.findUnique({
        where: { id: shiftId },
        select: {
          id: true,
          name: true,
          on_duty_time: true,
          off_duty_time: true,
          late_threshold: true,
          early_threshold: true,
          absenteeism_threshold: true,
          color: true,
          opacity: true,
          status: true,
          platform_id: true,
          dept_id: true,
        },
      });

      if (!shift) {
        return null;
      }

      // 3. 存入缓存
      await this.redisService.set(
        cacheKey,
        JSON.stringify(shift),
        this.CACHE_TTL,
      );

      return shift;
    } catch (error) {
      this.logger.error(`Failed to get shift by id: ${error.message}`);
      return null;
    }
  }

  /**
   * 批量获取班次规则（带缓存）
   */
  async getShiftsByIds(shiftIds: string[]): Promise<any[]> {
    if (shiftIds.length === 0) {
      return [];
    }

    try {
      // 并行查询所有班次
      const shifts = await Promise.all(
        shiftIds.map((id) => this.getShiftById(id)),
      );

      return shifts.filter((shift) => shift !== null);
    } catch (error) {
      this.logger.error(`Failed to get shifts by ids: ${error.message}`);
      return [];
    }
  }

  /**
   * 清除部门的班次缓存
   */
  async clearDeptCache(platformId: string, deptId: string): Promise<void> {
    try {
      const pattern = `${this.CACHE_PREFIX}${platformId}:${deptId}:*`;
      const redis = this.redisService.getClient();
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        await redis.del(...keys);
        this.logger.log(
          `Cleared ${keys.length} shift cache entries for dept ${deptId}`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to clear dept cache: ${error.message}`);
    }
  }

  /**
   * 清除单个班次的缓存
   */
  async clearShiftCache(shiftId: string): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}id:${shiftId}`;
      await this.redisService.del(cacheKey);

      // 同时清除可能包含此班次的部门缓存
      const shift = await this.prisma.attendance_rule.findUnique({
        where: { id: shiftId },
        select: { platform_id: true, dept_id: true },
      });

      if (shift) {
        await this.clearDeptCache(shift.platform_id!, shift.dept_id!);
      }

      this.logger.log(`Cleared cache for shift ${shiftId}`);
    } catch (error) {
      this.logger.error(`Failed to clear shift cache: ${error.message}`);
    }
  }

  /**
   * 清除所有班次缓存
   */
  async clearAllCache(): Promise<void> {
    try {
      const redis = this.redisService.getClient();
      const keys = await redis.keys(`${this.CACHE_PREFIX}*`);

      if (keys.length > 0) {
        await redis.del(...keys);
        this.logger.log(`Cleared ${keys.length} shift cache entries`);
      }
    } catch (error) {
      this.logger.error(`Failed to clear all cache: ${error.message}`);
    }
  }

  /**
   * 构建缓存键
   */
  private buildCacheKey(
    platformId: string,
    deptId: string,
    options?: {
      shiftIds?: string[];
      status?: number;
    },
  ): string {
    let key = `${this.CACHE_PREFIX}${platformId}:${deptId}`;

    if (options?.shiftIds && options.shiftIds.length > 0) {
      const sortedIds = [...options.shiftIds].sort();
      key += `:ids:${sortedIds.join(",")}`;
    }

    if (options?.status !== undefined) {
      key += `:status:${options.status}`;
    }

    return key;
  }

  /**
   * 降级方法：直接从数据库查询
   */
  private async getShiftsFromDb(
    platformId: string,
    deptId: string,
    options?: {
      shiftIds?: string[];
      status?: number;
    },
  ): Promise<any[]> {
    const where: any = {
      platform_id: platformId,
      dept_id: deptId,
      is_deleted: 0,
    };

    if (options?.shiftIds && options.shiftIds.length > 0) {
      where.id = { in: options.shiftIds };
    }

    if (options?.status !== undefined) {
      where.status = options.status;
    }

    return this.prisma.attendance_rule.findMany({
      where,
      select: {
        id: true,
        name: true,
        on_duty_time: true,
        off_duty_time: true,
        late_threshold: true,
        early_threshold: true,
        absenteeism_threshold: true,
        color: true,
        opacity: true,
        status: true,
      },
      orderBy: { create_time: "asc" },
    });
  }
}
