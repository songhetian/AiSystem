import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../common/services/redis.service';
import { AssignRolePermissionsDto } from '../dto/assign-role-permissions.dto';
import { AssignUserRolesDto } from '../dto/assign-user-roles.dto';
import { Cache } from '../../../common/decorators/cache.decorator';
import { CacheEvict } from '../../../common/decorators/cache-evict.decorator';
import { QueryOptimize } from '../../../common/decorators/query-optimize.decorator';

/**
 * 权限服务（V2.0 性能优化）
 * 优化点：
 * 1. 添加缓存和查询监控
 * 2. 完整清除权限相关缓存
 * 3. 通知权限守卫清除内存缓存
 */
@Injectable()
export class SystemPermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService
  ) {}

  /**
   * 分配用户角色（V2.0 性能优化）
   * 优化点：完整清除相关缓存
   */
  @CacheEvict({ pattern: 'cache:user-roles:*' })
  async assignUserRoles(dto: AssignUserRolesDto) {
    await this.prisma.sys_user_role.deleteMany({
      where: { user_id: dto.user_id }
    });

    if (dto.role_ids.length === 0) {
      // 清除用户角色缓存
      await this.redisService.del(`user:roles:${dto.user_id}`);
      return { user_id: dto.user_id, role_ids: [] };
    }

    await this.prisma.sys_user_role.createMany({
      data: dto.role_ids.map((roleId) => ({
        user_id: dto.user_id,
        role_id: roleId
      }))
    });

    // 清除该用户的角色缓存
    await this.redisService.del(`user:roles:${dto.user_id}`);

    return this.getUserRoles(dto.user_id);
  }

  /**
   * 分配角色资源（V2.0 性能优化）
   * 优化点：完整清除所有相关缓存
   */
  @CacheEvict({ pattern: 'cache:role-resources:*' })
  async assignRoleResources(dto: AssignRolePermissionsDto) {
    await this.prisma.$transaction([
      this.prisma.sys_role_menu.deleteMany({ where: { role_id: dto.role_id } }),
      this.prisma.sys_role_button.deleteMany({ where: { role_id: dto.role_id } })
    ]);

    if (dto.menu_ids.length > 0) {
      await this.prisma.sys_role_menu.createMany({
        data: dto.menu_ids.map((menuId) => ({
          role_id: dto.role_id,
          menu_id: menuId
        }))
      });
    }

    if (dto.button_ids.length > 0) {
      await this.prisma.sys_role_button.createMany({
        data: dto.button_ids.map((buttonId) => ({
          role_id: dto.role_id,
          button_id: buttonId
        }))
      });
    }

    // 1. 清除该角色相关的所有用户角色缓存
    const users = await this.prisma.sys_user_role.findMany({
      where: { role_id: dto.role_id },
      select: { user_id: true }
    });
    
    const userRoleKeys = users.map(u => `user:roles:${u.user_id}`);
    if (userRoleKeys.length > 0) {
      await Promise.all(userRoleKeys.map(key => this.redisService.del(key)));
    }
    
    // 2. 清除所有API权限缓存（因为不知道哪些API受影响）
    await this.redisService.deleteByPattern('api:permission:*');
    
    // 3. 清除菜单树缓存
    await this.redisService.deleteByPattern('cache:menu-tree:*');
    
    // 4. 发布权限变更事件（用于清除权限守卫的内存缓存）
    await this.redisService.publish('permission:changed', JSON.stringify({
      type: 'role_resources',
      role_id: dto.role_id,
      timestamp: Date.now()
    }));
    
    return this.getRoleResources(dto.role_id);
  }

  /**
   * 获取用户角色（V2.0 性能优化）
   * 优化点：添加缓存和查询监控
   */
  @Cache({ ttl: 300, byParams: true, prefix: 'user-roles' })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async getUserRoles(userId: string) {
    const items = await this.prisma.sys_user_role.findMany({
      where: { user_id: userId },
      include: { role: true }
    });

    return {
      user_id: userId,
      role_ids: items.map((item) => item.role_id),
      roles: items.map((item) => item.role)
    };
  }

  /**
   * 获取角色资源（V2.0 性能优化）
   * 优化点：添加缓存和查询监控
   */
  @Cache({ ttl: 300, byParams: true, prefix: 'role-resources' })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async getRoleResources(roleId: string) {
    const [menus, buttons] = await Promise.all([
      this.prisma.sys_role_menu.findMany({
        where: { role_id: roleId },
        include: { menu: true }
      }),
      this.prisma.sys_role_button.findMany({
        where: { role_id: roleId },
        include: { button: true }
      })
    ]);

    return {
      role_id: roleId,
      menu_ids: menus.map((item) => item.menu_id),
      button_ids: buttons.map((item) => item.button_id),
      menus: menus.map((item) => item.menu),
      buttons: buttons.map((item) => item.button)
    };
  }
}
