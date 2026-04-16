import { Controller, Get, Query, Res } from "@nestjs/common";
import { Response } from "express";
import { Public } from "../../../common/public.decorator";
import { CaptchaService } from "../../../common/services/captcha.service";
import {
  RateLimit,
  RateLimitType,
} from "../../../common/decorators/rate-limiter.decorator";
import { v4 as uuidv4 } from "uuid";

/**
 * 验证码控制器
 * 提供验证码生成和验证功能
 */
@Controller("auth/captcha")
export class CaptchaController {
  constructor(private readonly captchaService: CaptchaService) {}

  /**
   * 生成验证码
   * GET /auth/captcha/generate
   *
   * @returns { svg: string, key: string }
   */
  @Public()
  @Get("generate")
  @RateLimit({ type: RateLimitType.IP, limit: 10, window: 60 })
  async generateCaptcha() {
    const key = uuidv4();
    const result = await this.captchaService.generateCaptcha(key);

    return {
      svg: result.svg,
      key: result.key,
    };
  }

  /**
   * 获取验证码图片（直接返回SVG）
   * GET /auth/captcha/image?key=xxx
   *
   * @param key 验证码key
   * @param res Response对象
   */
  @Public()
  @Get("image")
  @RateLimit({ type: RateLimitType.IP, limit: 10, window: 60 })
  async getCaptchaImage(@Query("key") key: string, @Res() res: Response) {
    if (!key) {
      key = uuidv4();
    }

    const result = await this.captchaService.generateCaptcha(key);

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("X-Captcha-Key", result.key);
    res.send(result.svg);
  }

  /**
   * 检查是否需要验证码
   * GET /auth/captcha/need?identifier=xxx
   *
   * @param identifier IP地址或用户名
   * @returns { needCaptcha: boolean, failCount: number }
   */
  @Public()
  @Get("need")
  @RateLimit({ type: RateLimitType.IP, limit: 20, window: 60 })
  async needCaptcha(@Query("identifier") identifier: string) {
    if (!identifier) {
      return { needCaptcha: false, failCount: 0 };
    }

    const needCaptcha = await this.captchaService.needCaptcha(identifier);
    const failCount = await this.captchaService.getLoginFailCount(identifier);
    const lockStatus = await this.captchaService.isAccountLocked(identifier);

    return {
      needCaptcha,
      failCount,
      locked: lockStatus.locked,
      remainingTime: lockStatus.remainingTime,
    };
  }
}
