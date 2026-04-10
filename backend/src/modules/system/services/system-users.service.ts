import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { hashPassword, comparePassword } from '../../../common/utils/password.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScopeService } from '../../../common/services/scope.service';
import { CurrentUserPayload } from '../../../common/current-user.decorator';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class SystemUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService
  ) {}

  async findAll(user: CurrentUserPayload) {
    const scope = await this.scopeService.resolveAccess(user.sub);
    return this.prisma.sys_user.findMany({
      where: this.scopeService.applyScope(
        { is_deleted: 0 },
        scope,
        { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
      ),
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

  /**
   * 个人修改密码逻辑
   */
  async updatePassword(userId: string, data: any) {
    const user = await this.prisma.sys_user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    const isMatch = await comparePassword(data.oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('原密码错误，请重新输入');
    }

    const hashedPassword = await hashPassword(data.newPassword);
    return this.prisma.sys_user.update({
      where: { id: userId },
      data: { password: hashedPassword }
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
