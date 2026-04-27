import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { Public } from "../../../common/public.decorator";
import { LoginDto } from "../dto/login.dto";
import { AuthService } from "../services/auth.service";
import { AntiShake } from "../../../common/decorators/antishake.decorator";
import {
  RateLimit,
  RateLimitType,
} from "../../../common/decorators/rate-limiter.decorator";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 用户登录（V2.0 高可用优化）
   * 优化点：防抖保护（2秒）、IP级限流（防暴力破解，60秒内最多5次）
   */
  @Public()
  @Post("login")
  @AntiShake(2000)
  @RateLimit({ type: RateLimitType.IP, limit: 5, window: 60 })
  login(@Body() dto: LoginDto, @Req() req: any) {
    const context: { ip: string; userAgent: string } = {
      ip:
        (req.headers?.["x-forwarded-for"] as string)?.split(",")?.[0]?.trim() ||
        req.ip ||
        req.socket?.remoteAddress ||
        "",
      userAgent: (req.headers?.["user-agent"] as string) || "",
    };
    return this.authService.login(dto, context);
  }

  /**
   * 获取当前用户信息（V2.0 高可用优化）
   * 优化点：缓存优化（5分钟）、限流保护
   */
  @Get("me")
  @Cache({ ttl: 300, byUser: true, prefix: "user-info" })
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  me(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.authService.me(userId);
  }

  /**
   * 用户登出（V2.0 高可用优化）
   * 优化点：防抖保护、清除用户信息缓存、限流保护
   */
  @Post("logout")
  @AntiShake(1000)
  @CacheEvict({ pattern: "cache:user-info:*" })
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  async logout(@Req() req: any) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    return this.authService.logout(token);
  }

  /**
   * Token刷新接口（V5.0 新增）
   * 用于手动刷新Token，延长登录状态
   */
  @Post("refresh")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  async refreshToken(@Req() req: any) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    return this.authService.refreshToken(token);
  }
}
