import { BadRequestException, Injectable } from "@nestjs/common";
import { ScopeService } from "../../../common/services/scope.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { PaginationService } from "../../../common/services/pagination.service";
import {
  PaginationDto,
  PaginatedResponse,
} from "../../../common/dto/pagination.dto";
import { CreatePositionDto } from "../dto/create-position.dto";
import { UpdatePositionDto } from "../dto/update-position.dto";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";
import * as XLSX from "xlsx";

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
    private readonly paginationService: PaginationService,
  ) {}

  /**
   * 获取职位列表（V3.0 统一分页）
   * 优化点：添加缓存（10分钟）、查询监控、统一分页
   */
  @Cache({ ttl: 600, byUser: true, prefix: "position-list" })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async findAll(
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    const scope = await this.scopeService.resolveAccess(userId);

    const where = this.scopeService.applyScope(
      scope,
      { is_deleted: 0 },
      {
        platform: "platform_id",
        department: "department_id",
      },
    );

    const { skip, take } = this.paginationService.calculatePagination(
      pagination.page,
      pagination.pageSize,
    );

    const [data, total] = await Promise.all([
      this.prisma.hr_position.findMany({
        where,
        select: {
          id: true,
          name: true,
          code: true,
          department_id: true,
          level: true,
          sort: true,
          status: true,
          description: true,
          platform_id: true,
          create_time: true,
          update_time: true,
          biz_department: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              hr_employee: true,
            },
          },
        },
        skip,
        take,
        orderBy: { create_time: "desc" },
      }),
      this.prisma.hr_position.count({ where }),
    ]);

    return this.paginationService.createResponse(
      data,
      total,
      pagination.page,
      pagination.pageSize,
    );
  }

  /**
   * 创建职位（V2.0 性能优化）
   * 优化点：自动清除职位列表缓存，校验编码唯一性
   */
  @CacheEvict({ pattern: "cache:position-list:*" })
  async create(userId: string, dto: CreatePositionDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const platformId = dto.platform_id ?? scope.platform_id ?? undefined;
    this.scopeService.assertPlatformAccess(scope, platformId);
    this.scopeService.assertDepartmentAccess(scope, dto.department_id);

    // 校验岗位编码唯一性
    if (dto.code) {
      const existing = await this.prisma.hr_position.findFirst({
        where: {
          code: dto.code,
          is_deleted: 0,
        },
      });
      if (existing) {
        throw new BadRequestException("岗位编码已存在");
      }
    }

    return this.prisma.hr_position.create({
      data: {
        ...dto,
        platform_id: platformId,
      },
    });
  }

  /**
   * 更新职位（V2.0 性能优化）
   * 优化点：自动清除职位列表缓存，校验编码唯一性
   */
  @CacheEvict({ pattern: "cache:position-list:*" })
  async update(userId: string, id: string, dto: UpdatePositionDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.hr_position.findUnique({ where: { id } });

    if (!current) {
      throw new BadRequestException("岗位不存在");
    }

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

    // 校验岗位编码唯一性
    if (dto.code && dto.code !== current.code) {
      const existing = await this.prisma.hr_position.findFirst({
        where: {
          code: dto.code,
          is_deleted: 0,
          id: { not: id },
        },
      });
      if (existing) {
        throw new BadRequestException("岗位编码已存在");
      }
    }

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
   * 优化点：自动清除职位列表缓存，删除前校验
   */
  @CacheEvict({ pattern: "cache:position-list:*" })
  async remove(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.hr_position.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            hr_employee: true,
          },
        },
      },
    });

    if (!current) {
      throw new BadRequestException("岗位不存在");
    }

    this.scopeService.assertPlatformAccess(scope, current.platform_id);
    this.scopeService.assertDepartmentAccess(scope, current.department_id);

    // 校验是否有关联员工
    if (current._count.hr_employee > 0) {
      throw new BadRequestException("该岗位下存在员工，无法删除");
    }

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

  /**
   * 导出岗位（补充功能）
   */
  async exportPositions(userId: string): Promise<Buffer> {
    const pagination = new PaginationDto();
    pagination.page = 1;
    pagination.pageSize = 1000;
    const { data: positions } = await this.findAll(userId, pagination);

    const exportData = (positions as any[]).map((pos: any) => ({
      岗位名称: pos.name,
      岗位编码: pos.code || "",
      所属部门: pos.biz_department?.name || "",
      岗位等级: pos.level || "",
      岗位序列: pos.sequence || "",
      描述: pos.description || "",
      员工数: pos._count?.hr_employee || 0,
      排序: pos.sort || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "岗位列表");
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }

  /**
   * 批量调整岗位所属部门（补充功能）
   */
  @CacheEvict({ pattern: "cache:position-list:*" })
  async batchUpdateDepartment(
    userId: string,
    ids: string[],
    departmentId: string,
  ) {
    const scope = await this.scopeService.resolveAccess(userId);

    // 验证部门是否存在
    const department = await this.prisma.biz_department.findUnique({
      where: { id: departmentId },
    });
    if (!department) {
      throw new BadRequestException("目标部门不存在");
    }

    this.scopeService.assertPlatformAccess(scope, department.platform_id);

    // 验证所有岗位ID是否有权限访问
    const positions = await this.prisma.hr_position.findMany({
      where: {
        id: { in: ids },
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

    if (positions.length !== ids.length) {
      throw new BadRequestException("部分岗位不存在或无权限访问");
    }

    // 批量更新部门
    await this.prisma.hr_position.updateMany({
      where: { id: { in: ids } },
      data: {
        department_id: departmentId,
        update_time: new Date(),
      },
    });

    return { success: true, updated: ids.length };
  }

  /**
   * 获取岗位详情（V2.0 性能优化）
   * 优化点：添加缓存（10分钟）和查询监控
   */
  @Cache({ ttl: 600, byUser: true, prefix: "position-detail" })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async findOne(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    const position = await this.prisma.hr_position.findUnique({
      where: { id },
      include: {
        biz_department: {
          select: {
            id: true,
            name: true,
            parent_id: true,
          },
        },
        _count: {
          select: {
            hr_employee: true,
          },
        },
      },
    });

    if (!position) {
      throw new BadRequestException("岗位不存在");
    }

    this.scopeService.assertPlatformAccess(scope, position.platform_id);
    this.scopeService.assertDepartmentAccess(scope, position.department_id);

    return position;
  }

  /**
   * 获取导入模板
   */
  getImportTemplate(): Buffer {
    const templateData = [
      {
        岗位名称: "产品经理（必填）",
        岗位编码: "POS001",
        部门名称: "产品部",
        岗位等级: "P6",
        岗位序列: "产品序列",
        描述: "负责产品规划与设计",
        排序: 1,
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "岗位导入模板");
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }

  /**
   * 批量导入岗位（V2.0 性能优化）
   * 优化点：自动清除岗位列表缓存，校验数据完整性
   */
  @CacheEvict({ pattern: "cache:position-list:*" })
  async importPositions(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const scope = await this.scopeService.resolveAccess(userId);
    if (!file) throw new BadRequestException("未上传文件");

    const workbook = XLSX.read(file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0) throw new BadRequestException("文件内容为空");
    if (rows.length > 500) throw new BadRequestException("单次最多导入500条");

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      try {
        if (!row["岗位名称"]) {
          errors.push(`第${rowNum}行：岗位名称不能为空`);
          failed++;
          continue;
        }

        // 查找部门ID（如果提供了部门名称）
        let departmentId: string | undefined = undefined;
        if (row["部门名称"]) {
          const department = await this.prisma.biz_department.findFirst({
            where: {
              name: String(row["部门名称"]),
              is_deleted: 0,
            },
          });
          if (!department) {
            errors.push(`第${rowNum}行：部门"${row["部门名称"]}"不存在`);
            failed++;
            continue;
          }
          departmentId = department.id;
        }

        // 校验岗位编码唯一性
        if (row["岗位编码"]) {
          const existing = await this.prisma.hr_position.findFirst({
            where: {
              code: String(row["岗位编码"]),
              is_deleted: 0,
            },
          });
          if (existing) {
            errors.push(`第${rowNum}行：岗位编码"${row["岗位编码"]}"已存在`);
            failed++;
            continue;
          }
        }

        await this.prisma.hr_position.create({
          data: {
            name: String(row["岗位名称"]),
            code: row["岗位编码"] ? String(row["岗位编码"]) : `POS_${Date.now()}_${i}`,
            department_id: (departmentId ?? scope.dept_id ?? "") as string,
            level: row["岗位等级"] ? Number(row["岗位等级"]) : undefined,
            sequence: row["岗位序列"] ? String(row["岗位序列"]) : undefined,
            description: row["描述"] ? String(row["描述"]) : undefined,
            sort: row["排序"] ? Number(row["排序"]) : 0,
            platform_id: (scope.platform_id ?? "") as string,
          },
        });
        success++;
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "导入失败";
        errors.push(`第${rowNum}行：${errorMessage}`);
        failed++;
      }
    }
    return { success, failed, errors };
  }

  /**
   * 批量更新岗位状态（V2.0 性能优化）
   * 优化点：自动清除岗位列表缓存
   */
  @CacheEvict({ pattern: "cache:position-list:*" })
  async batchUpdateStatus(userId: string, ids: string[], status: number) {
    const scope = await this.scopeService.resolveAccess(userId);

    // 验证所有岗位ID是否有权限访问
    const positions = await this.prisma.hr_position.findMany({
      where: {
        id: { in: ids },
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

    if (positions.length !== ids.length) {
      throw new BadRequestException("部分岗位不存在或无权限访问");
    }

    // 批量更新状态
    await this.prisma.hr_position.updateMany({
      where: { id: { in: ids } },
      data: {
        status,
        update_time: new Date(),
      },
    });

    return { success: true, updated: ids.length };
  }
}
