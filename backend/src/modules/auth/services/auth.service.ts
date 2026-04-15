import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditLogService } from '../../../common/services/audit-log.service';
import { RedisService } from '../../../common/services/redis.service';
import { comparePassword } from '../../../common/utils/password.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { Cache } from '../../../common/decorators/cache.decorator';
import { CacheEvict } from '../../../common/decorators/cache-evict.decorator';
import { QueryOptimize } from '../../../common/decorators/query-optimize.decorator';

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
    const username = dto.username;
    const lockedKey = `login_locked:${username}`;
    const failedCountKey = `login_failed_count:${username}`;

    // 获取动态动态配置 (V2.1 工业级精修)
    const [lockoutThresholdCfg, lockoutDurationCfg] = await Promise.all([
      this.prisma.sys_config.findUnique({ where: { config_key: 'auth.lockout_threshold' } }),
      this.prisma.sys_config.findUnique({ where: { config_key: 'auth.lockout_duration' } }),
    ]);

    const lockoutThreshold = parseInt(lockoutThresholdCfg?.config_value || '5', 10);
    const lockoutDuration = parseInt(lockoutDurationCfg?.config_value || '900', 10);

    // 1. 检查是否锁定
    const isLocked = await this.redisService.get(lockedKey);
    if (isLocked) {
      throw new UnauthorizedException(`账号已锁定，请 ${Math.ceil(lockoutDuration / 60)} 分钟后再试`);
    }

    const user = await this.prisma.sys_user.findUnique({
      where: { username },
    });

    const handleFailure = async (message: string) => {
      // 登录失败时，在设备信息字段末尾补充失败原因
      const deviceWithReason = context.userAgent 
        ? `${context.userAgent} (失败原因：${message})`
        : `未知设备 (失败原因：${message})`;

      await this.auditLogService.logLogin({
        user_id: user?.id,
        username,
        login_ip: context.ip,
        user_agent: deviceWithReason,
        login_status: 0,
        login_message: message,
        platform_id: user?.platform_id,
        dept_id: user?.dept_id,
        shop_id: user?.shop_id,
      });

      // 异常告警：用户不存在
      if (!user) {
        void this.auditLogService.alarmAdmins('登录账号不存在', `账号 ${username} 尝试登录但系统中不存在`);
      }

      // 增加失败次数
      const count = await this.redisService.incr(failedCountKey);
      if (count === 1) {
        await this.redisService.expire(failedCountKey, 3600); // 1小时内计数
      }

      if (count && count >= lockoutThreshold) {
        await this.redisService.set(lockedKey, '1', lockoutDuration); 
        await this.redisService.del(failedCountKey);
        
        // 账号锁定告警
        void this.auditLogService.alarmAdmins('账号已锁定', `账号 ${username} 因连续 ${lockoutThreshold} 次登录失败已被锁定 ${Math.ceil(lockoutDuration / 60)} 分钟`);
        
        throw new UnauthorizedException(`多次登录失败，账号已锁定 ${Math.ceil(lockoutDuration / 60)} 分钟`);
      }

      throw new UnauthorizedException('用户名或密码错误');
    };

    if (!user || user.is_deleted === 1) {
      return handleFailure('用户不存在');
    }

    if (user.status !== 1) {
      return handleFailure('账号已被禁用');
    }

    const isMatch = await comparePassword(dto.password, user.password);
    if (!isMatch) {
      return handleFailure('密码错误');
    }

    // 登录成功，清除失败记录
    await this.redisService.del(failedCountKey);
    await this.redisService.del(lockedKey);

    // 从配置读取 JWT 过期时间
    const jwtExpiryCfg = await this.prisma.sys_config.findUnique({ where: { config_key: 'auth.jwt_expires' } });
    const expiresIn = jwtExpiryCfg?.config_value || '2h';

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      platform_id: user.platform_id,
      dept_id: user.dept_id,
      shop_id: user.shop_id,
    }, { expiresIn });

    await this.auditLogService.logLogin({
      user_id: user.id,
      username: user.username,
      login_ip: context.ip,
      user_agent: context.userAgent,
      login_status: 1,
      login_message: '登录成功',
      platform_id: user.platform_id,
      dept_id: user.dept_id,
      shop_id: user.shop_id,
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

  /**
   * 获取用户信息（带缓存）
   * 缓存5分钟，根据用户ID生成Key
   * 高频查询接口，每次请求都会调用
   */
  @Cache({ ttl: 300, byUser: true, prefix: 'user-info' })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
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
