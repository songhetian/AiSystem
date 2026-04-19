import { Injectable } from "@nestjs/common";
import { RedisService } from "./redis.service";

/**
 * 验证码服务
 * 功能：生成图形验证码、验证验证码、管理验证码生命周期
 */
@Injectable()
export class CaptchaService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * 生成图形验证码
   * @param key 验证码唯一标识（通常使用UUID）
   * @returns 验证码SVG图片和key
   */
  async generateCaptcha(key: string): Promise<{ svg: string; key: string }> {
    // 生成验证码（4位数字+字母，不区分大小写）
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();

    // 将验证码文本存储到Redis，5分钟过期
    const cacheKey = `captcha:${key}`;
    await this.redisService.set(cacheKey, code.toLowerCase(), 300);

    // 简单的SVG验证码（实际项目应使用svg-captcha库）
    const svg = `<svg width="120" height="40" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" fill="#f0f0f0"/>
      <text x="10" y="30" font-size="24" font-family="Arial" fill="#333">${code}</text>
    </svg>`;

    return {
      svg,
      key,
    };
  }

  /**
   * 验证验证码
   * @param key 验证码唯一标识
   * @param code 用户输入的验证码
   * @returns 验证是否通过
   */
  async verifyCaptcha(key: string, code: string): Promise<boolean> {
    if (!key || !code) {
      return false;
    }

    const cacheKey = `captcha:${key}`;
    const storedCode = await this.redisService.get(cacheKey);

    if (!storedCode) {
      // 验证码不存在或已过期
      return false;
    }

    // 验证通过后删除验证码（一次性使用）
    await this.redisService.del(cacheKey);

    // 不区分大小写比较
    return storedCode.toLowerCase() === code.toLowerCase();
  }

  /**
   * 删除验证码
   * @param key 验证码唯一标识
   */
  async deleteCaptcha(key: string): Promise<void> {
    const cacheKey = `captcha:${key}`;
    await this.redisService.del(cacheKey);
  }

  /**
   * 检查是否需要验证码（登录失败次数超过3次）
   * @param identifier 标识符（IP或用户名）
   * @returns 是否需要验证码
   */
  async needCaptcha(identifier: string): Promise<boolean> {
    const failCountKey = `login:fail:${identifier}`;
    const failCount = await this.redisService.get(failCountKey);
    return failCount ? parseInt(failCount) >= 3 : false;
  }

  /**
   * 记录登录失败次数
   * @param identifier 标识符（IP或用户名）
   */
  async recordLoginFail(identifier: string): Promise<number> {
    const failCountKey = `login:fail:${identifier}`;
    const count = await this.redisService.incr(failCountKey);

    // 设置过期时间为30分钟
    if (count === 1) {
      await this.redisService.expire(failCountKey, 1800);
    }

    return count ?? 0;
  }

  /**
   * 清除登录失败记录
   * @param identifier 标识符（IP或用户名）
   */
  async clearLoginFail(identifier: string): Promise<void> {
    const failCountKey = `login:fail:${identifier}`;
    await this.redisService.del(failCountKey);
  }

  /**
   * 获取登录失败次数
   * @param identifier 标识符（IP或用户名）
   */
  async getLoginFailCount(identifier: string): Promise<number> {
    const failCountKey = `login:fail:${identifier}`;
    const count = await this.redisService.get(failCountKey);
    return count ? parseInt(count) : 0;
  }

  /**
   * 检查账号是否被锁定（连续失败5次锁定30分钟）
   * @param identifier 标识符（IP或用户名）
   * @returns 是否被锁定和剩余锁定时间（秒）
   */
  async isAccountLocked(
    identifier: string,
  ): Promise<{ locked: boolean; remainingTime: number }> {
    const lockKey = `login:lock:${identifier}`;
    // 使用eval脚本获取TTL
    const script = `
      local ttl = redis.call('TTL', KEYS[1])
      return ttl
    `;
    const ttl = await this.redisService.eval(script, [lockKey], []);

    if (typeof ttl === 'number' && ttl > 0) {
      return { locked: true, remainingTime: ttl };
    }

    return { locked: false, remainingTime: 0 };
  }

  /**
   * 锁定账号（连续失败5次）
   * @param identifier 标识符（IP或用户名）
   * @param duration 锁定时长（秒），默认30分钟
   */
  async lockAccount(
    identifier: string,
    duration: number = 1800,
  ): Promise<void> {
    const lockKey = `login:lock:${identifier}`;
    await this.redisService.set(lockKey, "1", duration);
  }

  /**
   * 解锁账号
   * @param identifier 标识符（IP或用户名）
   */
  async unlockAccount(identifier: string): Promise<void> {
    const lockKey = `login:lock:${identifier}`;
    await this.redisService.del(lockKey);
  }
}
