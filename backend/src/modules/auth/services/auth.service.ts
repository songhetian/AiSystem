import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuditLogService } from "../../../common/services/audit-log.service";
import { RedisService } from "../../../common/services/redis.service";
import { ConfigCacheService } from "../../../common/services/config-cache.service";
import { JwtAuthService } from "../../../common/services/jwt-auth.service";
import { comparePassword } from "../../../common/utils/password.util";
import { PrismaService } from "../../../prisma/prisma.service";
import { Cache } from "../../../common/decorators/cache.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";

interface LoginContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly auditLogService: AuditLogService,
    private readonly redisService: RedisService,
    private readonly configCacheService: ConfigCacheService,
  ) {}

  async login(dto: any, context: LoginContext = {}) {
    const username = dto.username;

    // 1. 检查账号是否锁定（使用JwtAuthService）
    const isLocked = await this.jwtAuthService.isAccountLocked(username);
    if (isLocked) {
      const lockoutDuration = await this.configCacheService.getNumber("auth.lockout_duration", 900);
      throw new UnauthorizedException(
        `账号已锁定，请 ${Math.ceil(lockoutDuration / 60)} 分钟后再试`,
      );
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
        void this.auditLogService.alarmAdmins(
          "登录账号不存在",
          `账号 ${username} 尝试登录但系统中不存在`,
        );
      }

      // 记录登录失败（使用JwtAuthService）
      const failCount = await this.jwtAuthService.recordLoginFailure(username, context.ip);
      const lockoutThreshold = await this.configCacheService.getNumber("auth.lockout_threshold", 5);

      if (failCount >= lockoutThreshold) {
        const lockoutDuration = await this.configCacheService.getNumber("auth.lockout_duration", 900);
        await this.jwtAuthService.lockAccount(username, lockoutDuration);

        // 账号锁定告警
        void this.auditLogService.alarmAdmins(
          "账号已锁定",
          `账号 ${username} 因连续 ${lockoutThreshold} 次登录失败已被锁定 ${Math.ceil(lockoutDuration / 60)} 分钟`,
        );

        throw new UnauthorizedException(
          `多次登录失败，账号已锁定 ${Math.ceil(lockoutDuration / 60)} 分钟`,
        );
      }

      throw new UnauthorizedException("用户名或密码错误");
    };

    if (!user || user.is_deleted === 1) {
      // 检查是否是注册申请中的用户（使用手机号登录）
      const registerRecord = await this.prisma.sys_user_register.findFirst({
        where: {
          phone: username,
          is_deleted: 0,
        },
        orderBy: { create_time: "desc" },
      });

      if (registerRecord) {
        if (registerRecord.status === "pending") {
          return handleFailure("您的注册申请正在审核中，请耐心等待管理员审核");
        } else if (registerRecord.status === "rejected") {
          const reason = registerRecord.reject_reason || "未提供原因";
          return handleFailure(
            `您的注册申请未通过审核，原因：${reason}，请核对信息后重新注册`,
          );
        }
      }

      return handleFailure("用户不存在");
    }

    if (user.status !== 1) {
      return handleFailure("账号已被禁用");
    }

    const isMatch = await comparePassword(dto.password, user.password);
    if (!isMatch) {
      return handleFailure("密码错误");
    }

    // 登录成功，清除失败记录（使用JwtAuthService）
    await this.jwtAuthService.recordLoginSuccess(username, context.ip);

    // 生成JWT Token（使用JwtAuthService）
    const accessToken = await this.jwtAuthService.generateToken({
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
      login_message: "登录成功",
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
    if (!token) return { success: true };

    // 使用JwtAuthService将Token加入黑名单
    try {
      const payload = this.jwtService.decode(token) as any;
      if (payload?.sub) {
        await this.jwtAuthService.addTokenToBlacklist(token, payload.sub, 'logout');
      }
    } catch (error) {
      // Token解析失败，忽略
    }

    return { success: true };
  }

  async refreshToken(token: string) {
    if (!token) {
      throw new UnauthorizedException('未提供Token');
    }

    try {
      // 使用JwtAuthService刷新Token
      const newToken = await this.jwtAuthService.refreshToken(token);
      return {
        access_token: newToken,
        accessToken: newToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Token刷新失败：' + error.message);
    }
  }

  /**
   * 获取用户信息（带缓存）
   * 缓存5分钟，根据用户ID生成Key
   * 高频查询接口，每次请求都会调用
   */
  @Cache({ ttl: 300, byUser: true, prefix: "user-info" })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async me(id: string) {
    if (!id) {
      throw new UnauthorizedException('用户信息获取失败，凭证无效');
    }
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
        if (
          roleButton.button.is_deleted === 0 &&
          roleButton.button.status === 1
        ) {
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
      menus: Array.from(menusMap.values()).sort(
        (a: any, b: any) => Number(a.sort ?? 0) - Number(b.sort ?? 0),
      ),
      buttons: Array.from(buttonsMap.values()),
    };
  }
}
