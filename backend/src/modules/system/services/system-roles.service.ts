import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CopyRoleDto } from '../dto/copy-role.dto';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';

@Injectable()
export class SystemRolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.sys_role.findMany({
      where: { is_deleted: 0 },
      orderBy: { create_time: 'desc' }
    });
  }

  create(dto: CreateRoleDto) {
    return this.prisma.sys_role.create({
      data: {
        role_name: dto.role_name,
        role_code: dto.role_code,
        description: dto.description,
        status: dto.status ?? 1
      }
    });
  }

  async copy(id: string, dto: CopyRoleDto) {
    const role = await this.prisma.sys_role.findUnique({
      where: { id }
    });

    if (!role) {
      throw new Error('角色不存在');
    }

    const newRole = await this.prisma.sys_role.create({
      data: {
        role_name: dto.role_name ?? `${role.role_name}-复制`,
        role_code: dto.role_code ?? `${role.role_code}_copy_${Date.now()}`,
        description: role.description,
        status: role.status
      }
    });

    const [menus, buttons] = await Promise.all([
      this.prisma.sys_role_menu.findMany({ where: { role_id: id } }),
      this.prisma.sys_role_button.findMany({ where: { role_id: id } })
    ]);

    if (menus.length > 0) {
      await this.prisma.sys_role_menu.createMany({
        data: menus.map((item) => ({
          role_id: newRole.id,
          menu_id: item.menu_id
        }))
      });
    }

    if (buttons.length > 0) {
      await this.prisma.sys_role_button.createMany({
        data: buttons.map((item) => ({
          role_id: newRole.id,
          button_id: item.button_id
        }))
      });
    }

    return newRole;
  }

  update(id: string, dto: UpdateRoleDto) {
    return this.prisma.sys_role.update({
      where: { id },
      data: dto
    });
  }

  remove(id: string) {
    return this.prisma.sys_role.update({
      where: { id },
      data: { is_deleted: 1 }
    });
  }
}
