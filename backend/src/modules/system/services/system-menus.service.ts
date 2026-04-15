import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMenuDto } from '../dto/create-menu.dto';
import { UpdateMenuDto } from '../dto/update-menu.dto';
import { Cache } from '../../../common/decorators/cache.decorator';
import { CacheEvict } from '../../../common/decorators/cache-evict.decorator';
import { QueryOptimize } from '../../../common/decorators/query-optimize.decorator';

@Injectable()
export class SystemMenusService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取菜单列表（带缓存）
   * 缓存10分钟，不区分用户
   */
  @Cache({ ttl: 600, byUser: false, prefix: 'menu-list' })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  findAll() {
    return this.prisma.sys_menu.findMany({
      where: { is_deleted: 0 },
      orderBy: [{ sort: 'asc' }, { create_time: 'desc' }]
    });
  }

  /**
   * 获取菜单树（带缓存）
   * 缓存10分钟，根据角色ID生成Key
   */
  @Cache({ ttl: 600, byParams: true, prefix: 'menu-tree' })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async findTree(roleId?: string) {
    const items = await this.findAll();
    const selectedMenuIds = roleId
      ? (
          await this.prisma.sys_role_menu.findMany({
            where: { role_id: roleId }
          })
        ).map((item) => item.menu_id)
      : [];
    type MenuTreeNode = (typeof items)[number] & { children: MenuTreeNode[] };
    const nodeMap = new Map<string, MenuTreeNode>(
      items.map((item) => [item.id, { ...item, children: [] as MenuTreeNode[] }])
    );
    const roots: MenuTreeNode[] = [];

    nodeMap.forEach((node) => {
      if (node.parent_id && nodeMap.has(node.parent_id)) {
        const parent = nodeMap.get(node.parent_id)!;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return {
      items: roots,
      selected_menu_ids: selectedMenuIds
    };
  }

  /**
   * 创建菜单（清除缓存）
   */
  @CacheEvict({ pattern: 'cache:menu-*' })
  create(dto: CreateMenuDto) {
    return this.prisma.sys_menu.create({
      data: {
        menu_name: dto.menu_name,
        menu_code: dto.menu_code,
        parent_id: dto.parent_id,
        icon: dto.icon,
        route: dto.route,
        sort: dto.sort ?? 0,
        type: dto.type,
        status: dto.status ?? 1
      }
    });
  }

  /**
   * 更新菜单（清除缓存）
   */
  @CacheEvict({ pattern: 'cache:menu-*' })
  update(id: string, dto: UpdateMenuDto) {
    return this.prisma.sys_menu.update({
      where: { id },
      data: dto
    });
  }

  /**
   * 排序菜单（清除缓存）
   */
  @CacheEvict({ pattern: 'cache:menu-*' })
  async sort(items: Array<{ id: string; parent_id?: string | null; sort: number }>) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.sys_menu.update({
          where: { id: item.id },
          data: {
            parent_id: item.parent_id ?? null,
            sort: item.sort
          }
        })
      )
    );

    return { success: true };
  }

  /**
   * 删除菜单（清除缓存）
   */
  @CacheEvict({ pattern: 'cache:menu-*' })
  remove(id: string) {
    return this.prisma.sys_menu.update({
      where: { id },
      data: { is_deleted: 1 }
    });
  }
}
