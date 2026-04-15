import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../public.decorator';
import { RedisService } from '../services/redis.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 高性能 JWT 认证守卫 (V4.0)
 * 核心优化：引入 Redis 缓存用户信息，避免主业务链路对数据库的频繁冲击。
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const canActivate = await super.canActivate(context);
    if (!canActivate) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const authHeader = request.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    if (token) {
      // 1. 检查 Token 是否在黑名单 (Redis)
      const isBlacklisted = await this.redisService.get(`blacklist:token:${token}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('登录状态已失效，请重新登录');
      }

      const payload = this.jwtService.decode(token) as any;
      if (payload && payload.sub) {
        // 2. 高频校验优化：优先从 Redis 读取用户元数据
        const cacheKey = `user_cache:${payload.sub}`;
        let userData: { status: number; updateTime: number } | null = null;
        
        try {
          const cached = await this.redisService.get(cacheKey);
          if (cached) {
            userData = JSON.parse(cached as string);
          }
        } catch (e) {
          // 缓存异常不影响业务
        }

        if (!userData) {
          // 缓存未命中，回源数据库
          const user = await this.prisma.sys_user.findUnique({
            where: { id: payload.sub },
            select: { update_time: true, status: true }
          });

          if (!user) {
            throw new UnauthorizedException('账号不存在');
          }

          userData = {
            status: user.status,
            updateTime: user.update_time.getTime()
          };

          // 将元数据存入 Redis，TTL 10分钟
          await this.redisService.set(cacheKey, JSON.stringify(userData), 600);
        }

        // 3. 极速校验状态与版本
        if (userData.status !== 1) {
          throw new UnauthorizedException('账号已被禁用');
        }

        // 检查密码/资料修改导致的版本失效 (payload.iat 是秒)
        if (payload.iat * 1000 < userData.updateTime - 1000) {
          throw new UnauthorizedException('安全信息已变更，请重新登录');
        }

        // 4. Token 自动滚动刷新 (滑动过期)
        const now = Math.floor(Date.now() / 1000);
        const remaining = payload.exp - now;
        if (remaining > 0 && remaining < 1800) {
          const newToken = await this.jwtService.signAsync({
            sub: payload.sub,
            username: payload.username,
            platform_id: payload.platform_id,
            dept_id: payload.dept_id,
            shop_id: payload.shop_id,
          });
          response.setHeader('X-Refresh-Token', newToken);
          response.setHeader('Access-Control-Expose-Headers', 'X-Refresh-Token');
        }
      }
    }

    return true;
  }
}
