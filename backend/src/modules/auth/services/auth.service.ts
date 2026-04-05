import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditLogService } from '../../../common/services/audit-log.service';
import { comparePassword } from '../../../common/utils/password.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService
  ) {}

  async login(dto: LoginDto, meta?: { ip?: string; userAgent?: string }) {
    const user = await this.prisma.sys_user.findFirst({
      where: { username: dto.username, is_deleted: 0, status: 1 }
    });

    if (!user) {
      await this.auditLogService.logLogin({
        username: dto.username,
        login_ip: meta?.ip,
        user_agent: meta?.userAgent,
        login_status: 0,
        login_message: 'user not found or disabled'
      });
      throw new UnauthorizedException('用户名或密码错误');
    }

    const valid = await comparePassword(dto.password, user.password);
    if (!valid) {
      await this.auditLogService.logLogin({
        user_id: user.id,
        username: user.username,
        login_ip: meta?.ip,
        user_agent: meta?.userAgent,
        login_status: 0,
        login_message: 'password mismatch',
        platform_id: user.platform_id,
        dept_id: user.dept_id,
        shop_id: user.shop_id
      });
      throw new UnauthorizedException('用户名或密码错误');
    }

    await this.prisma.sys_user.update({
      where: { id: user.id },
      data: { last_login_time: new Date() }
    });

    await this.auditLogService.logLogin({
      user_id: user.id,
      username: user.username,
      login_ip: meta?.ip,
      user_agent: meta?.userAgent,
      login_status: 1,
      login_message: 'login success',
      platform_id: user.platform_id,
      dept_id: user.dept_id,
      shop_id: user.shop_id
    });

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username
    });

    return {
      accessToken,
      user: await this.me(user.id)
    };
  }

  async me(userId: string) {
    const user = await this.prisma.sys_user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const userRoles = await this.prisma.sys_user_role.findMany({
      where: { user_id: userId },
      include: { role: true }
    });
    const roleIds = userRoles.map((item) => item.role_id);

    const [roleMenus, roleButtons] = await Promise.all([
      this.prisma.sys_role_menu.findMany({
        where: { role_id: { in: roleIds } },
        include: { menu: true }
      }),
      this.prisma.sys_role_button.findMany({
        where: { role_id: { in: roleIds } },
        include: { button: true }
      })
    ]);

    const menusMap = new Map<string, any>(roleMenus.map((item) => [item.menu.id, item.menu]));
    const buttonsMap = new Map<string, any>(roleButtons.map((item) => [item.button.id, item.button]));

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      platform_id: user.platform_id,
      dept_id: user.dept_id,
      shop_id: user.shop_id,
      roles: userRoles.map((item) => item.role),
      menus: Array.from(menusMap.values()).sort((a, b) => a.sort - b.sort),
      buttons: Array.from(buttonsMap.values())
    };
  }
}
