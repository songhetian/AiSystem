import { Injectable } from "@nestjs/common";
import { ScopeService } from "../../../common/services/scope.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { PaginationService } from "../../../common/services/pagination.service";
import {
  PaginationDto,
  PaginatedResponse,
} from "../../../common/dto/pagination.dto";
import { CreatePlatformDto } from "../dto/create-platform.dto";
import { UpdatePlatformDto } from "../dto/update-platform.dto";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";

@Injectable()
export class SystemPlatformsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly paginationService: PaginationService,
  ) {}

  /**
   * 获取平台列表（V3.0 统一分页）
   * 优化点：添加缓存（15分钟）、查询监控、统一分页
   */
  @Cache({ ttl: 900, byUser: false, prefix: "platform-list" })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async findAll(
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    const scope = await this.scopeService.resolveAccess(userId);

    const where = this.scopeService.applyPlatformScope(scope, {
      is_deleted: 0,
    });

    const { skip, take } = this.paginationService.calculatePagination(
      pagination.page,
      pagination.pageSize,
    );

    const [data, total] = await Promise.all([
      this.prisma.biz_platform.findMany({
        where,
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          status: true,
          owner_id: true,
          create_time: true,
          update_time: true,
        },
        skip,
        take,
        orderBy: { create_time: "desc" },
      }),
      this.prisma.biz_platform.count({ where }),
    ]);

    return this.paginationService.createResponse(
      data,
      total,
      pagination.page,
      pagination.pageSize,
    );
  }

  /**
   * 创建平台（清除缓存）
   */
  @CacheEvict({ pattern: "cache:platform-list:*" })
  async create(userId: string, dto: CreatePlatformDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertSuperAdmin(scope, "只有超级管理员可以维护平台");

    return this.prisma.biz_platform.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        status: dto.status ?? 1,
        owner_id: dto.owner_id,
      },
    });
  }

  /**
   * 更新平台（清除缓存）
   */
  @CacheEvict({ pattern: "cache:platform-list:*" })
  async update(userId: string, id: string, dto: UpdatePlatformDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertSuperAdmin(scope, "只有超级管理员可以维护平台");

    return this.prisma.biz_platform.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * 批量更新状态（清除缓存）
   */
  @CacheEvict({ pattern: "cache:platform-list:*" })
  async batchUpdateStatus(userId: string, ids: string[], status: number) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertSuperAdmin(scope, "只有超级管理员可以维护平台");

    return this.prisma.biz_platform.updateMany({
      where: {
        id: { in: ids },
        is_deleted: 0,
      },
      data: { status },
    });
  }

  /**
   * 删除平台（清除缓存）
   */
  @CacheEvict({ pattern: "cache:platform-list:*" })
  async remove(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertSuperAdmin(scope, "只有超级管理员可以维护平台");

    return this.prisma.biz_platform.update({
      where: { id },
      data: { is_deleted: 1 },
    });
  }
}
