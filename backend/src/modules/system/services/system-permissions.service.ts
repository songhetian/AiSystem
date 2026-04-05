import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AssignRolePermissionsDto } from '../dto/assign-role-permissions.dto';
import { AssignUserRolesDto } from '../dto/assign-user-roles.dto';

@Injectable()
export class SystemPermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async assignUserRoles(dto: AssignUserRolesDto) {
    await this.prisma.sys_user_role.deleteMany({
      where: { user_id: dto.user_id }
    });

    if (dto.role_ids.length === 0) {
      return { user_id: dto.user_id, role_ids: [] };
    }

    await this.prisma.sys_user_role.createMany({
      data: dto.role_ids.map((roleId) => ({
        user_id: dto.user_id,
        role_id: roleId
      }))
    });

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
