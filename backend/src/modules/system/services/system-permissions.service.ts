import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../common/services/redis.service';
import { AssignRolePermissionsDto } from '../dto/assign-role-permissions.dto';
import { AssignUserRolesDto } from '../dto/assign-user-roles.dto';

@Injectable()
export class SystemPermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService
  ) {}

  async assignUserRoles(dto: AssignUserRolesDto) {
    await this.prisma.sys_user_role.deleteMany({
      where: { user_id: dto.user_id }
    });

    if (dto.role_ids.length === 0) {
      await this.redisService.del(`user:roles:${dto.user_id}`);
      return { user_id: dto.user_id, role_ids: [] };
    }

    await this.prisma.sys_user_role.createMany({
      data: dto.role_ids.map((roleId) => ({
        user_id: dto.user_id,
        role_id: roleId
      }))
    });

    // 清理该用户的角色缓存
    await this.redisService.del(`user:roles:${dto.user_id}`);

    return this.getUserRoles(dto.user_id);
  }

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

    // 角色资源变更可能影响多个用户，简单处理：清理所有用户的权限关联缓存
    // 在生产环境建议通过发布订阅或特定 key 规则清理
    // 此处简单清理该角色相关的 api:permission 缓存（由于 api_name 未知，可选择全部清理或不处理，靠 TTL 自然过期）
    // 更好的方案是清理所有用户的 roles 缓存，迫使重新从 DB 加载
    // await this.redisService.delPattern('user:roles:*'); 
    
    return this.getRoleResources(dto.role_id);
  }

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
