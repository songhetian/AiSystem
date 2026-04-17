import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { PaginationService } from "../../../common/services/pagination.service";
import {
  PaginationDto,
  PaginatedResponse,
} from "../../../common/dto/pagination.dto";
import { CopyRoleDto } from "../dto/copy-role.dto";
import { CreateRoleDto } from "../dto/create-role.dto";
import { UpdateRoleDto } from "../dto/update-role.dto";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";

@Injectable()
export class SystemRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paginationService: PaginationService,
  ) {}

  /**
   * 获取角色列表（V3.0 统一分页）
   * 缓存10分钟，不区分用户，统一分页
   */
  @Cache({ ttl: 600, byUser: false, prefix: "role-list" })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async findAll(pagination: PaginationDto): Promise<PaginatedResponse<any>> {
    const where = { is_deleted: 0 };

    const { skip, take } = this.paginationService.calculatePagination(
      pagination.page,
      pagination.pageSize,
    );

    const [data, total] = await Promise.all([
      this.prisma.sys_role.findMany({
        where,
        skip,
        take,
        orderBy: { create_time: "desc" },
      }),
      this.prisma.sys_role.count({ where }),
    ]);

    return this.paginationService.createResponse(
      data,
      total,
      pagination.page,
      pagination.pageSize,
    );
  }

  /**
   * 创建角色（清除缓存）
   */
  @CacheEvict({ pattern: "cache:role-list:*" })
  create(dto: CreateRoleDto) {
    return this.prisma.sys_role.create({
      data: {
        role_name: dto.role_name,
        role_code: dto.role_code,
        description: dto.description,
        status: dto.status ?? 1,
      },
    });
  }

  /**
   * 复制角色（清除缓存）
   */
  @CacheEvict({ pattern: "cache:role-list:*" })
  async copy(id: string, dto: CopyRoleDto) {
    const role = await this.prisma.sys_role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new Error("角色不存在");
    }

    const newRole = await this.prisma.sys_role.create({
      data: {
        role_name: dto.role_name ?? `${role.role_name}-复制`,
        role_code: dto.role_code ?? `${role.role_code}_copy_${Date.now()}`,
        description: role.description,
        status: role.status,
      },
    });

    const [menus, buttons] = await Promise.all([
      this.prisma.sys_role_menu.findMany({
        where: { role_id: id },
        select: { menu_id: true },
      }),
      this.prisma.sys_role_button.findMany({
        where: { role_id: id },
        select: { button_id: true },
      }),
    ]);

    if (menus.length > 0) {
      await this.prisma.sys_role_menu.createMany({
        data: menus.map((item) => ({
          role_id: newRole.id,
          menu_id: item.menu_id,
        })),
      });
    }

    if (buttons.length > 0) {
      await this.prisma.sys_role_button.createMany({
        data: buttons.map((item) => ({
          role_id: newRole.id,
          button_id: item.button_id,
        })),
      });
    }

    return newRole;
  }

  /**
   * 更新角色（清除缓存）
   */
  @CacheEvict({ pattern: "cache:role-list:*" })
  update(id: string, dto: UpdateRoleDto) {
    return this.prisma.sys_role.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * 删除角色（清除缓存）
   */
  @CacheEvict({ pattern: "cache:role-list:*" })
  remove(id: string) {
    return this.prisma.sys_role.update({
      where: { id },
      data: { is_deleted: 1 },
    });
  }
}
