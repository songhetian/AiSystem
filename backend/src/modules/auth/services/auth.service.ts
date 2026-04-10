import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditLogService } from '../../../common/services/audit-log.service';
import { RedisService } from '../../../common/services/redis.service';
import { comparePassword } from '../../../common/utils/password.util';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
    private readonly redisService: RedisService
  ) {}

  async login(dto: any, ip?: string, userAgent?: string) {
    const user = await this.prisma.sys_user.findUnique({
      where: { username: dto.username }
    });

    if (!user || user.is_deleted === 1) {
      await this.auditLogService.logLogin({
        username: dto.username,
        login_ip: ip,
        user_agent: userAgent,
        login_status: 0,
        login_message: '用户不存在'
      });
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (user.status !== 1) {
      await this.auditLogService.logLogin({
        user_id: user.id,
        username: user.username,
        login_ip: ip,
        user_agent: userAgent,
        login_status: 0,
        login_message: '账号已被禁用'
      });
      throw new UnauthorizedException('账号已被禁用');
    }

    const isMatch = await comparePassword(dto.password, user.password);
    if (!isMatch) {
      await this.auditLogService.logLogin({
        user_id: user.id,
        username: user.username,
        login_ip: ip,
        user_agent: userAgent,
        login_status: 0,
        login_message: '密码错误'
      });
      throw new UnauthorizedException('用户名或密码错误');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      platform_id: user.platform_id,
      dept_id: user.dept_id,
      shop_id: user.shop_id
    });

    await this.auditLogService.logLogin({
      user_id: user.id,
      username: user.username,
      login_ip: ip,
      user_agent: userAgent,
      login_status: 1,
      login_message: '登录成功'
    });

    return {
      accessToken,
      user: await this.me(user.id)
    };
  }

  async logout(token: string) {
    if (!token) return;
    // 将 Token 加入黑名单，有效期 24 小时 (略大于默认过期时间)
    await this.redisService.set(`blacklist:token:${token}`, '1', 24 * 60 * 60);
    return { success: true };
  }

  async me(id: string) {
    const user = await this.prisma.sys_user.findUnique({
      where: { id },
      include: {
        dept: true,
        platform: true,
        shop: true
      }
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
            buttons: { include: { button: true } }
          }
        }
      }
    });

    const menusMap = new Map();
    const buttonsMap = new Map();

    userRoles.forEach((ur) => {
      ur.role.menus.forEach((rm) => {
        if (rm.menu.is_deleted === 0 && rm.menu.status === 1) {
          menusMap.set(rm.menu.id, rm.menu);
        }
      });
      ur.role.buttons.forEach((rb) => {
        if (rb.button.is_deleted === 0 && rb.button.status === 1) {
          buttonsMap.set(rb.button.id, rb.button.button_code);
        }
      });
    });

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      avatar: user.avatar,
      platform_id: user.platform_id,
      dept_id: user.dept_id,
      shop_id: user.shop_id,
      roles: userRoles.map((item) => item.role),
      menus: Array.from(menusMap.values()).sort((a, b) => a.sort - b.sort),
      buttons: Array.from(buttonsMap.values())
    };
  }
}
