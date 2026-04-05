import { Injectable } from '@nestjs/common';
import { hashPassword } from '../../../common/utils/password.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class SystemUsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.sys_user.findMany({
      where: { is_deleted: 0 },
      orderBy: { create_time: 'desc' }
    });
  }

  async create(dto: CreateUserDto) {
    const password = await hashPassword(dto.password);

    return this.prisma.sys_user.create({
      data: {
        username: dto.username,
        password,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        status: dto.status ?? 1,
        platform_id: dto.platform_id,
        dept_id: dto.dept_id,
        shop_id: dto.shop_id
      }
    });
  }

  update(id: string, dto: UpdateUserDto) {
    return this.prisma.sys_user.update({
      where: { id },
      data: dto
    });
  }

  async resetPassword(id: string, password = 'Admin123456') {
    return this.prisma.sys_user.update({
      where: { id },
      data: {
        password: await hashPassword(password)
      }
    });
  }

  async batchUpdateStatus(ids: string[], status: number) {
    return this.prisma.sys_user.updateMany({
      where: {
        id: { in: ids },
        is_deleted: 0
      },
      data: { status }
    });
  }

  remove(id: string) {
    return this.prisma.sys_user.update({
      where: { id },
      data: { is_deleted: 1 }
    });
  }
}
