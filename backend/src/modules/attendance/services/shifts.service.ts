import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { ScopeService } from "../../../common/services/scope.service";
import { PaginationService } from "../../../common/services/pagination.service";
import {
  PaginationDto,
  PaginatedResponse,
} from "../../../common/dto/pagination.dto";
import { CreateShiftDto } from "../dto/create-shift.dto";
import { UpdateShiftDto } from "../dto/update-shift.dto";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";

@Injectable()
export class ShiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly paginationService: PaginationService,
  ) {}

  /**
   * 获取班次列表（V3.0 统一分页）
   * 优化点：添加缓存（15分钟）、查询监控、统一分页
   */
  @Cache({ ttl: 900, byParams: true, prefix: "shift-list" })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async findAll(
    userId: string,
    pagination: PaginationDto,
    query: { platform_id?: string; dept_id?: string; name?: string },
  ): Promise<PaginatedResponse<any>> {
    const scope = await this.scopeService.resolveAccess(userId);
    const where = this.scopeService.applyScope(
      scope,
      {
        is_deleted: 0,
        ...(query.name ? { name: { contains: query.name } } : {}),
        ...(query.platform_id ? { platform_id: query.platform_id } : {}),
        ...(query.dept_id ? { dept_id: query.dept_id } : {}),
      },
      { platform: "platform_id", department: "dept_id" },
    );

    const { skip, take } = this.paginationService.calculatePagination(
      pagination.page,
      pagination.pageSize,
    );

    const [data, total] = await Promise.all([
      this.prisma.attendance_rule.findMany({
        where,
        skip,
        take,
        orderBy: { create_time: "asc" },
      }),
      this.prisma.attendance_rule.count({ where }),
    ]);

    return this.paginationService.createResponse(
      data,
      total,
      pagination.page,
      pagination.pageSize,
    );
  }

  /**
   * 查询单个班次（V2.0 性能优化）
   * 优化点：添加缓存（10分钟）和查询监控
   */
  @Cache({ ttl: 600, byUser: true, prefix: "shift-detail" })
  @QueryOptimize({ timeout: 2000, slowQueryThreshold: 100 })
  async findOne(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const item = await this.prisma.attendance_rule.findFirst({
      where: this.scopeService.applyScope(
        scope,
        { id, is_deleted: 0 },
        { platform: "platform_id", department: "dept_id" },
      ),
    });
    if (!item) throw new NotFoundException("班次不存在");
    return item;
  }

  /**
   * 创建班次（清除缓存）
   */
  @CacheEvict({ pattern: "cache:shift-list:*" })
  async create(userId: string, dto: CreateShiftDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.attendance_rule.create({
      data: {
        ...dto,
        platform_id: scope.platform_id as string,
        dept_id: scope.dept_id as string,
      } as any,
    });
  }

  /**
   * 更新班次（清除缓存）
   */
  @CacheEvict({ pattern: "cache:shift-list:*" })
  async update(userId: string, id: string, dto: UpdateShiftDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    await this.findOne(userId, id); // Check permission
    return this.prisma.attendance_rule.update({
      where: { id },
      data: dto as any,
    });
  }

  /**
   * 删除班次（清除缓存）
   */
  @CacheEvict({ pattern: "cache:shift-list:*" })
  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // Check permission
    return this.prisma.attendance_rule.update({
      where: { id },
      data: { is_deleted: 1 },
    });
  }

  /**
   * 批量更新班次状态
   */
  @CacheEvict({ pattern: "cache:shift-list:*" })
  async batchUpdateStatus(userId: string, ids: string[], status: number) {
    const scope = await this.scopeService.resolveAccess(userId);

    // 权限校验：确保所有班次都在用户权限范围内
    const shifts = await this.prisma.attendance_rule.findMany({
      where: this.scopeService.applyScope(
        scope,
        { id: { in: ids }, is_deleted: 0 },
        { platform: "platform_id", department: "dept_id" },
      ),
    });

    if (shifts.length !== ids.length) {
      throw new NotFoundException("部分班次不存在或无权限访问");
    }

    // 批量更新
    await this.prisma.attendance_rule.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    return { success: true, updated: ids.length };
  }

  /**
   * 导出班次列表
   */
  async export(
    userId: string,
    query: { platform_id?: string; dept_id?: string },
  ) {
    const scope = await this.scopeService.resolveAccess(userId);
    const where = this.scopeService.applyScope(
      scope,
      {
        is_deleted: 0,
        ...(query.platform_id ? { platform_id: query.platform_id } : {}),
        ...(query.dept_id ? { dept_id: query.dept_id } : {}),
      },
      { platform: "platform_id", department: "dept_id" },
    );

    const shifts = await this.prisma.attendance_rule.findMany({
      where,
      orderBy: { create_time: "asc" },
    });

    // 转换为导出格式
    const exportData = shifts.map((shift) => ({
      班次名称: shift.name,
      班次编码: shift.code,
      上班时间: shift.start_time,
      下班时间: shift.end_time,
      工作时长: shift.work_hours ? `${shift.work_hours}小时` : "",
      状态: shift.status === 1 ? "启用" : "禁用",
      创建时间: shift.create_time,
    }));

    return {
      data: exportData,
      filename: `班次列表_${new Date().toISOString().split("T")[0]}.xlsx`,
    };
  }
}
