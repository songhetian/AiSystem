import { Injectable } from '@nestjs/common';
import { ScopeService } from '../../../common/services/scope.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaginationService } from '../../../common/services/pagination.service';
import {
  PaginationDto,
  PaginatedResponse,
} from '../../../common/dto/pagination.dto';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { Cache } from '../../../common/decorators/cache.decorator';
import { CacheEvict } from '../../../common/decorators/cache-evict.decorator';
import { QueryOptimize } from '../../../common/decorators/query-optimize.decorator';

@Injectable()
export class SystemDepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly paginationService: PaginationService,
  ) {}

  /**
   * 获取公开部门列表（供注册页面使用，无需登录）
   * 优化点：缓存优化（10分钟）、查询监控
   */
  @Cache({ ttl: 600, prefix: 'public-departments' })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async getPublicDepartments() {
    const departments = await this.prisma.biz_department.findMany({
      where: {
        is_deleted: 0,
        status: 1, // 只返回启用的部门
      },
      select: {
        id: true,
        name: true,
        code: true,
        parent_id: true,
        sort: true,
      },
      orderBy: [{ sort: 'asc' }, { create_time: 'desc' }],
    });

    return {
      code: 200,
      message: '查询成功',
      data: departments,
    };
  }

  /**
   * 获取部门列表（V3.0 统一分页）
   * 优化点：添加缓存（10分钟）、查询监控、统一分页
   */
  @Cache({ ttl: 600, byUser: true, prefix: 'department-list' })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async findAll(
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    const scope = await this.scopeService.resolveAccess(userId);

    const where = this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id' });

    const { skip, take } = this.paginationService.calculatePagination(
      pagination.page,
      pagination.pageSize,
    );

    const [data, total] = await Promise.all([
      this.prisma.biz_department.findMany({
        where,
        skip,
        take,
        orderBy: [{ sort: 'asc' }, { create_time: 'desc' }],
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
   * 获取部门树（带缓存）
   * 缓存15分钟，根据用户ID生成Key
   */
  @Cache({ ttl: 900, byUser: true, prefix: 'department-tree' })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async findTree(userId: string) {
    const paginationDto = new PaginationDto();
    paginationDto.page = 1;
    paginationDto.pageSize = 100;
    const result = await this.findAll(userId, paginationDto);
    const items = result.data;
    type DepartmentTreeNode = { id: string; parent_id: string | null; [key: string]: any } & { children: DepartmentTreeNode[] };
    const nodeMap = new Map<string, DepartmentTreeNode>(
      items.map((item) => [item.id, { ...item, children: [] as DepartmentTreeNode[] }])
    );
    const roots: DepartmentTreeNode[] = [];

    nodeMap.forEach((node) => {
      if (node.parent_id && nodeMap.has(node.parent_id)) {
        const parent = nodeMap.get(node.parent_id)!;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  /**
   * 创建部门（清除缓存）
   */
  @CacheEvict({ pattern: 'cache:department-*' })
  async create(userId: string, dto: CreateDepartmentDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const platformId = dto.platform_id ?? scope.platform_id ?? undefined;
    this.scopeService.assertPlatformAccess(scope, platformId);

    return this.prisma.biz_department.create({
      data: {
        name: dto.name,
        code: dto.code,
        parent_id: dto.parent_id,
        sort: dto.sort ?? 0,
        status: dto.status ?? 1,
        platform_id: platformId,
        owner_id: dto.owner_id
      }
    });
  }

  /**
   * 更新部门（清除缓存）
   */
  @CacheEvict({ pattern: 'cache:department-*' })
  async update(userId: string, id: string, dto: UpdateDepartmentDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.biz_department.findUnique({ where: { id } });
    this.scopeService.assertPlatformAccess(scope, current?.platform_id);
    this.scopeService.assertPlatformAccess(scope, dto.platform_id ?? current?.platform_id);

    return this.prisma.biz_department.update({
      where: { id },
      data: {
        ...dto,
        platform_id: dto.platform_id ?? current?.platform_id
      }
    });
  }

  /**
   * 批量更新部门状态（清除缓存）
   */
  @CacheEvict({ pattern: 'cache:department-*' })
  async batchUpdateStatus(userId: string, ids: string[], status: number) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertSuperAdmin(scope, '只有超级管理员可以批量修改部门状态');

    return this.prisma.biz_department.updateMany({
      where: { id: { in: ids } },
      data: { status }
    });
  }

  /**
   * 删除部门（清除缓存）
   */
  @CacheEvict({ pattern: 'cache:department-*' })
  async remove(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.biz_department.findUnique({ where: { id } });
    this.scopeService.assertPlatformAccess(scope, current?.platform_id);

    return this.prisma.biz_department.update({
      where: { id },
      data: { is_deleted: 1 }
    });
  }

  /**
   * 排序部门（清除缓存）
   */
  @CacheEvict({ pattern: 'cache:department-*' })
  async sort(userId: string, items: Array<{ id: string; parent_id?: string | null; sort: number }>) {
    const scope = await this.scopeService.resolveAccess(userId);

    // 验证所有部门ID是否有权限访问
    const departmentIds = items.map(item => item.id);
    const departments = await this.prisma.biz_department.findMany({
      where: {
        id: { in: departmentIds },
        ...this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id' })
      }
    });

    if (departments.length !== departmentIds.length) {
      throw new Error('部分部门不存在或无权限访问');
    }

    // 批量更新排序
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.biz_department.update({
          where: { id: item.id },
          data: {
            parent_id: item.parent_id ?? null,
            sort: item.sort,
            update_time: new Date()
          }
        })
      )
    );

    return { success: true };
  }
}
