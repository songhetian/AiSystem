import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from './redis.service';
import { createHash } from 'crypto';

@Injectable()
export class JwtAuthService {
  private readonly logger = new Logger(JwtAuthService.name);
  private readonly TOKEN_BLACKLIST_PREFIX = 'jwt:blacklist:';
  private readonly LOGIN_FAILED_PREFIX = 'login:failed:';
  private readonly ACCOUNT_LOCKED_PREFIX = 'account:locked:';
  private readonly DEFAULT_LOCKOUT_THRESHOLD = 5;
  private readonly DEFAULT_LOCKOUT_DURATION = 900;
  private readonly DEFAULT_TOKEN_EXPIRES = '2h';
  private readonly REFRESH_THRESHOLD = 300;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async generateToken(payload: any, expiresIn?: string): Promise<string> {
    const expires = expiresIn || this.configService.get('JWT_EXPIRES', this.DEFAULT_TOKEN_EXPIRES);
    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_SECRET', 'changeme'),
      expiresIn: expires,
    });
    this.logger.log(`Token generated for user ${payload.sub}`);
    return token;
  }

  async verifyToken(token: string): Promise<any> {
    if (!token) throw new UnauthorizedException('Token不存在');
    const isBlacklisted = await this.isTokenBlacklisted(token);
    if (isBlacklisted) throw new UnauthorizedException('Token已失效，请重新登录');

    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET', 'changeme'),
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token已过期，请重新登录');
      }
      throw new UnauthorizedException('Token无效，请重新登录');
    }
  }

  async refreshToken(oldToken: string): Promise<string> {
    let payload: any;
    try {
      payload = await this.verifyToken(oldToken);
    } catch (error) {
      if (error.message.includes('过期')) {
        payload = this.jwtService.decode(oldToken);
        if (!payload) throw new UnauthorizedException('Token无效');
      } else {
        throw error;
      }
    }

    const { iat, exp, ...userPayload } = payload;
    const newToken = await this.generateToken(userPayload);
    await this.addTokenToBlacklist(oldToken, userPayload.sub, 'refresh');
    return newToken;
  }

  async shouldRefreshToken(token: string): Promise<boolean> {
    try {
      const payload = this.jwtService.decode(token) as any;
      if (!payload?.exp) return false;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - now;
      return timeUntilExpiry > 0 && timeUntilExpiry < this.REFRESH_THRESHOLD;
    } catch {
      return false;
    }
  }

  async addTokenToBlacklist(token: string, userId: string, reason: string = 'logout'): Promise<void> {
    try {
      const payload = this.jwtService.decode(token) as any;
      if (!payload?.exp) return;
      const ttl = payload.exp - Math.floor(Date.now() / 1000);
      if (ttl <= 0) return;

      const tokenKey = this.TOKEN_BLACKLIST_PREFIX + this.hashToken(token);
      await this.redisService.set(tokenKey, '1', ttl);
      await this.prisma.sys_jwt_blacklist.create({
        data: {
          token: token.substring(0, 1000),
          user_id: userId,
          reason,
          expire_time: new Date(payload.exp * 1000),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to add token to blacklist: ${error.message}`);
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const tokenKey = this.TOKEN_BLACKLIST_PREFIX + this.hashToken(token);
      const result = await this.redisService.get(tokenKey);
      return result === '1';
    } catch {
      return false;
    }
  }

  async recordLoginFailure(username: string, ipAddress?: string): Promise<number> {
    try {
      const failedKey = this.LOGIN_FAILED_PREFIX + username;
      const count = await this.redisService.incr(failedKey);
      if (count === 1) await this.redisService.expire(failedKey, 3600);

      await this.prisma.sys_login_attempt.create({
        data: { username, ip_address: ipAddress, attempt_time: new Date(), is_success: 0 },
      });
      return count || 0;
    } catch {
      return 0;
    }
  }

  async recordLoginSuccess(username: string, ipAddress?: string): Promise<void> {
    try {
      await this.redisService.del(this.LOGIN_FAILED_PREFIX + username);
      await this.redisService.del(this.ACCOUNT_LOCKED_PREFIX + username);
      await this.prisma.sys_login_attempt.create({
        data: { username, ip_address: ipAddress, attempt_time: new Date(), is_success: 1 },
      });
    } catch (error) {
      this.logger.error(`Failed to record login success: ${error.message}`);
    }
  }

  async isAccountLocked(username: string): Promise<boolean> {
    try {
      const result = await this.redisService.get(this.ACCOUNT_LOCKED_PREFIX + username);
      return result === '1';
    } catch {
      return false;
    }
  }

  async lockAccount(username: string, duration?: number): Promise<void> {
    const lockDuration = duration || this.DEFAULT_LOCKOUT_DURATION;
    await this.redisService.set(this.ACCOUNT_LOCKED_PREFIX + username, '1', lockDuration);
    this.logger.warn(`Account locked: ${username}`);
  }

  async unlockAccount(username: string): Promise<void> {
    await this.redisService.del(this.ACCOUNT_LOCKED_PREFIX + username);
    await this.redisService.del(this.LOGIN_FAILED_PREFIX + username);
  }

  async getLoginFailureCount(username: string): Promise<number> {
    try {
      const failedKey = this.LOGIN_FAILED_PREFIX + username;
      const count = await this.redisService.get(failedKey);
      return count ? parseInt(count, 10) : 0;
    } catch {
      return 0;
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
