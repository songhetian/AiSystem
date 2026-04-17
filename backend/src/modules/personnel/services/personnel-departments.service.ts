import { BadRequestException, Injectable } from "@nestjs/common";
import { ScopeService } from "../../../common/services/scope.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { PaginationService } from "../../../common/services/pagination.service";
import {
  PaginationDto,
  PaginatedResponse,
} from "../../../common/dto/pagination.dto";
import { CreateDepartmentDto } from "../dto/create-department.dto";
import { UpdateDepartmentDto } from "../dto/update-department.dto";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";
import * as XLSX from "xlsx";

/**
 * 部门服务（V2.0 性能优化）
 * 优化点：
 * 1. 添加缓存（10分钟）
 * 2. 添加查询监控
 * 3. 自动缓存清除
 * 4. 支持树形结构
 */
@Injectable()
export class PersonnelDepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly paginationService: PaginationService,
  ) {}

  /**
   * 获取部门列表（V3.0 统一分页）
   * 优化点：添加缓存（10分钟）、查询监控、统一分页
   */
  @Cache({ ttl: 600, byUser: true, prefix: "department-list" })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async findAll(
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    const scope = await this.scopeService.resolveAccess(userId);

    const where = this.scopeService.applyScope(
      scope,
      { is_deleted: 0 },
      { platform: "platform_id" },
    );

    const { skip, take } = this.paginationService.calculatePagination(
      pagination.page,
      pagination.pageSize,
    );

    const [data, total] = await Promise.all([
      this.prisma.biz_department.findMany({
        where,
        skip,
        take,
        orderBy: [{ sort: "asc" }, { create_time: "desc" }],
        include: {
          _count: {
            select: {
              hr_employee: true,
              hr_position: true,
            },
          },
        },
      }),
      this.prisma.biz_department.count({ where }),
    ]);

    return this.paginationService.createResponse(
      data,
      total,
      pagination.page,
      pagination.pageSize,
    );
  }

  /**
   * 创建部门（V2.0 性能优化）
   * 优化点：自动清除部门列表缓存
   */
  @CacheEvict({ pattern: "cache:department-list:*" })
  async create(userId: string, dto: CreateDepartmentDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const platformId = dto.platform_id ?? scope.platform_id ?? undefined;
    this.scopeService.assertPlatformAccess(scope, platformId);

    // 验证父部门是否存在
    if (dto.parent_id) {
      const parent = await this.prisma.biz_department.findUnique({
        where: { id: dto.parent_id },
      });
      if (!parent) {
        throw new BadRequestException("父部门不存在");
      }
    }

    // 验证负责人是否存在
    if (dto.leader_id) {
      const leader = await this.prisma.hr_employee.findUnique({
        where: { id: dto.leader_id },
      });
      if (!leader) {
        throw new BadRequestException("部门负责人不存在");
      }
    }

    return this.prisma.biz_department.create({
      data: {
        ...dto,
        platform_id: platformId,
        status: dto.status ?? 1,
      },
    });
  }

  /**
   * 更新部门（V2.0 性能优化）
   * 优化点：自动清除部门列表缓存
   */
  @CacheEvict({ pattern: "cache:department-list:*" })
  async update(userId: string, id: string, dto: UpdateDepartmentDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.biz_department.findUnique({
      where: { id },
    });

    if (!current) {
      throw new BadRequestException("部门不存在");
    }

    this.scopeService.assertPlatformAccess(scope, current.platform_id);

    // 验证父部门
    if (dto.parent_id && dto.parent_id !== current.parent_id) {
      if (dto.parent_id === id) {
        throw new BadRequestException("不能将部门设置为自己的父部门");
      }
      const parent = await this.prisma.biz_department.findUnique({
        where: { id: dto.parent_id },
      });
      if (!parent) {
        throw new BadRequestException("父部门不存在");
      }
    }

    // 验证负责人
    if (dto.leader_id) {
      const leader = await this.prisma.hr_employee.findUnique({
        where: { id: dto.leader_id },
      });
      if (!leader) {
        throw new BadRequestException("部门负责人不存在");
      }
    }

    return this.prisma.biz_department.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * 删除部门（V2.0 性能优化）
   * 优化点：自动清除部门列表缓存，删除前校验
   */
  @CacheEvict({ pattern: "cache:department-list:*" })
  async remove(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.biz_department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            hr_employee: true,
            hr_position: true,
          },
        },
      },
    });

    if (!current) {
      throw new BadRequestException("部门不存在");
    }

    this.scopeService.assertPlatformAccess(scope, current.platform_id);

    // 校验是否有关联员工或岗位
    if (current._count.hr_employee > 0) {
      throw new BadRequestException("该部门下存在员工，无法删除");
    }
    if (current._count.hr_position > 0) {
      throw new BadRequestException("该部门下存在岗位，无法删除");
    }

    // 校验是否有子部门
    const childCount = await this.prisma.biz_department.count({
      where: { parent_id: id, is_deleted: 0 },
    });
    if (childCount > 0) {
      throw new BadRequestException("该部门下存在子部门，无法删除");
    }

    return this.prisma.biz_department.update({
      where: { id },
      data: { is_deleted: 1 },
    });
  }

  /**
   * 排序部门（V2.0 性能优化）
   * 优化点：自动清除部门列表缓存，支持拖拽调整层级
   */
  @CacheEvict({ pattern: "cache:department-list:*" })
  async sort(
    userId: string,
    items: Array<{ id: string; sort: number; parent_id?: string }>,
  ) {
    const scope = await this.scopeService.resolveAccess(userId);

    // 验证所有部门ID是否有权限访问
    const departmentIds = items.map((item) => item.id);
    const departments = await this.prisma.biz_department.findMany({
      where: {
        id: { in: departmentIds },
        ...this.scopeService.applyScope(
          scope,
          { is_deleted: 0 },
          { platform: "platform_id" },
        ),
      },
    });

    if (departments.length !== departmentIds.length) {
      throw new BadRequestException("部分部门不存在或无权限访问");
    }

    // 批量更新排序和层级
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.biz_department.update({
          where: { id: item.id },
          data: {
            sort: item.sort,
            parent_id: item.parent_id,
            update_time: new Date(),
          },
        }),
      ),
    );

    return { success: true };
  }

  /**
   * 导出部门（补充功能）
   */
  async exportDepartments(userId: string): Promise<Buffer> {
    const departments = await this.findAll(userId);

    const exportData = (departments as any[]).map((dept: any) => ({
      部门名称: dept.name,
      父部门ID: dept.parent_id || "无",
      负责人ID: dept.leader_id || "无",
      状态: dept.status === 1 ? "启用" : "禁用",
      描述: dept.description || "",
      员工数: dept._count?.hr_employee || 0,
      岗位数: dept._count?.hr_position || 0,
      排序: dept.sort || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "部门列表");
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }

  /**
   * 获取部门详情
   */
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async findOne(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const department = await this.prisma.biz_department.findFirst({
      where: this.scopeService.applyScope(
        scope,
        { id, is_deleted: 0 },
        { platform: "platform_id" },
      ),
      include: {
        _count: {
          select: {
            hr_employee: true,
            hr_position: true,
          },
        },
        hr_employee: {
          where: { is_deleted: 0 },
          select: {
            id: true,
            name: true,
            employee_no: true,
            status: true,
          },
          take: 10,
        },
        hr_position: {
          where: { is_deleted: 0 },
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
          take: 10,
        },
      },
    });

    if (!department) {
      throw new BadRequestException("部门不存在");
    }

    return department;
  }

  /**
   * 获取导入模板
   */
  getImportTemplate(): Buffer {
    const templateData = [
      {
        部门名称: "示例部门",
        父部门ID: "",
        负责人ID: "",
        状态: "启用",
        描述: "部门描述",
        排序: 0,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "部门导入模板");
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }

  /**
   * 批量导入部门
   */
  @CacheEvict({ pattern: "cache:department-list:*" })
  async importDepartments(userId: string, file: Express.Multer.File) {
    const scope = await this.scopeService.resolveAccess(userId);
    const platformId = scope.platform_id;

    if (!platformId) {
      throw new BadRequestException("无法确定平台ID");
    }

    const workbook = XLSX.read(file.buffer, { type: "buffer" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const row of data as any[]) {
      try {
        const dto: CreateDepartmentDto = {
          name: row["部门名称"],
          parent_id: row["父部门ID"] || null,
          leader_id: row["负责人ID"] || null,
          status: row["状态"] === "启用" ? 1 : 0,
          description: row["描述"] || null,
          sort: row["排序"] || 0,
          platform_id: platformId,
        };

        await this.create(userId, dto);
        results.success++;
      } catch (error) {
        results.failed++;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results.errors.push(
          `部门"${row["部门名称"]}"导入失败: ${errorMessage}`,
        );
      }
    }

    return results;
  }
}
