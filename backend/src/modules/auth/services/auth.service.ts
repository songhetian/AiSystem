import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditLogService } from '../../../common/services/audit-log.service';
import { RedisService } from '../../../common/services/redis.service';
import { comparePassword } from '../../../common/utils/password.util';
import { PrismaService } from '../../../prisma/prisma.service';

interface LoginContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
    private readonly redisService: RedisService,
  ) {}

  async login(dto: any, context: LoginContext = {}) {
    const user = await this.prisma.sys_user.findUnique({
      where: { username: dto.username },
    });

    if (!user || user.is_deleted === 1) {
      await this.auditLogService.logLogin({
        username: dto.username,
        login_ip: context.ip,
        user_agent: context.userAgent,
        login_status: 0,
        login_message: '用户不存在',
      });
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (user.status !== 1) {
      await this.auditLogService.logLogin({
        user_id: user.id,
        username: user.username,
        login_ip: context.ip,
        user_agent: context.userAgent,
        login_status: 0,
        login_message: '账号已被禁用',
      });
      throw new UnauthorizedException('账号已被禁用');
    }

    const isMatch = await comparePassword(dto.password, user.password);
    if (!isMatch) {
      await this.auditLogService.logLogin({
        user_id: user.id,
        username: user.username,
        login_ip: context.ip,
        user_agent: context.userAgent,
        login_status: 0,
        login_message: '密码错误',
      });
      throw new UnauthorizedException('用户名或密码错误');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      platform_id: user.platform_id,
      dept_id: user.dept_id,
      shop_id: user.shop_id,
    });

    await this.auditLogService.logLogin({
      user_id: user.id,
      username: user.username,
      login_ip: context.ip,
      user_agent: context.userAgent,
      login_status: 1,
      login_message: '登录成功',
    });

    return {
      access_token: accessToken,
      accessToken,
      user: await this.me(user.id),
    };
  }

  async logout(token: string) {
    if (!token) return;
    await this.redisService.set(`blacklist:token:${token}`, '1', 24 * 60 * 60);
    return { success: true };
  }

  async me(id: string) {
    const user = await this.prisma.sys_user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const userRoles = await this.prisma.sys_user_role.findMany({
      where: { user_id: id },
      include: {
        role: {
          include: {
            menus: { include: { menu: true } },
            buttons: { include: { button: true } },
          },
        },
      },
    });

    const menusMap = new Map<string, any>();
    const buttonsMap = new Map<string, string>();

    userRoles.forEach((userRole: any) => {
      userRole.role.menus.forEach((roleMenu: any) => {
        if (roleMenu.menu.is_deleted === 0 && roleMenu.menu.status === 1) {
          menusMap.set(roleMenu.menu.id, roleMenu.menu);
        }
      });
      userRole.role.buttons.forEach((roleButton: any) => {
        if (roleButton.button.is_deleted === 0 && roleButton.button.status === 1) {
          buttonsMap.set(roleButton.button.id, roleButton.button.button_code);
        }
      });
    });

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      avatar: null,
      platform_id: user.platform_id,
      dept_id: user.dept_id,
      shop_id: user.shop_id,
      roles: userRoles.map((item: any) => item.role),
      menus: Array.from(menusMap.values()).sort((a: any, b: any) => Number(a.sort ?? 0) - Number(b.sort ?? 0)),
      buttons: Array.from(buttonsMap.values()),
    };
  }
}
