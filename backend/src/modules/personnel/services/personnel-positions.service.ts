import { Injectable } from "@nestjs/common";
import { ScopeService } from "../../../common/services/scope.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { CreatePositionDto } from "../dto/create-position.dto";
import { UpdatePositionDto } from "../dto/update-position.dto";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";

/**
 * 职位服务（V2.0 性能优化）
 * 优化点：
 * 1. 添加缓存（10分钟）
 * 2. 添加查询监控
 * 3. 自动缓存清除
 */
@Injectable()
export class PersonnelPositionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  /**
   * 获取职位列表（V2.0 性能优化）
   * 优化点：添加缓存（10分钟）和查询监控
   */
  @Cache({ ttl: 600, byUser: true, prefix: "position-list" })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async findAll(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    return this.prisma.hr_position.findMany({
      where: this.scopeService.applyScope(
        scope,
        { is_deleted: 0 },
        {
          platform: "platform_id",
          department: "department_id",
        },
      ),
      orderBy: { create_time: "desc" },
    });
  }

  /**
   * 创建职位（V2.0 性能优化）
   * 优化点：自动清除职位列表缓存
   */
  @CacheEvict({ pattern: "cache:position-list:*" })
  async create(userId: string, dto: CreatePositionDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const platformId = dto.platform_id ?? scope.platform_id ?? undefined;
    this.scopeService.assertPlatformAccess(scope, platformId);
    this.scopeService.assertDepartmentAccess(scope, dto.department_id);

    return this.prisma.hr_position.create({
      data: {
        ...dto,
        platform_id: platformId,
      },
    });
  }

  /**
   * 更新职位（V2.0 性能优化）
   * 优化点：自动清除职位列表缓存
   */
  @CacheEvict({ pattern: "cache:position-list:*" })
  async update(userId: string, id: string, dto: UpdatePositionDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.hr_position.findUnique({ where: { id } });
    this.scopeService.assertPlatformAccess(scope, current?.platform_id);
    this.scopeService.assertDepartmentAccess(scope, current?.department_id);
    this.scopeService.assertPlatformAccess(
      scope,
      dto.platform_id ?? current?.platform_id,
    );
    this.scopeService.assertDepartmentAccess(
      scope,
      dto.department_id ?? current?.department_id,
    );

    return this.prisma.hr_position.update({
      where: { id },
      data: {
        ...dto,
        platform_id: dto.platform_id ?? current?.platform_id,
      },
    });
  }

  /**
   * 删除职位（V2.0 性能优化）
   * 优化点：自动清除职位列表缓存
   */
  @CacheEvict({ pattern: "cache:position-list:*" })
  async remove(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.hr_position.findUnique({ where: { id } });
    this.scopeService.assertPlatformAccess(scope, current?.platform_id);
    this.scopeService.assertDepartmentAccess(scope, current?.department_id);

    return this.prisma.hr_position.update({
      where: { id },
      data: { is_deleted: 1 },
    });
  }

  /**
   * 排序职位（V2.0 性能优化）
   * 优化点：自动清除职位列表缓存
   */
  @CacheEvict({ pattern: "cache:position-list:*" })
  async sort(userId: string, items: Array<{ id: string; sort: number }>) {
    const scope = await this.scopeService.resolveAccess(userId);

    // 验证所有职位ID是否有权限访问
    const positionIds = items.map((item) => item.id);
    const positions = await this.prisma.hr_position.findMany({
      where: {
        id: { in: positionIds },
        ...this.scopeService.applyScope(
          scope,
          { is_deleted: 0 },
          {
            platform: "platform_id",
            department: "department_id",
          },
        ),
      },
    });

    if (positions.length !== positionIds.length) {
      throw new Error("部分职位不存在或无权限访问");
    }

    // 批量更新排序
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.hr_position.update({
          where: { id: item.id },
          data: {
            sort: item.sort,
            update_time: new Date(),
          },
        }),
      ),
    );

    return { success: true };
  }
}
