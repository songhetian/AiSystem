import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RedisService } from "../services/redis.service";
import {
  ANTI_REPLAY_KEY,
  AntiReplayOptions,
} from "../decorators/security.decorator";

/**
 * 防重放攻击守卫
 * 通过时间戳和随机字符串防止请求被重放
 */
@Injectable()
export class AntiReplayGuard implements CanActivate {
  private readonly logger = new Logger(AntiReplayGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<AntiReplayOptions>(
      ANTI_REPLAY_KEY,
      context.getHandler(),
    );

    if (!options || !options.enabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const timestamp = request.headers["x-timestamp"] || request.body?.timestamp;
    const nonce = request.headers["x-nonce"] || request.body?.nonce;

    try {
      // 检查时间戳
      if (!timestamp) {
        throw new HttpException(
          {
            code: HttpStatus.BAD_REQUEST,
            message: "缺少时间戳参数",
            data: null,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const requestTime = parseInt(timestamp, 10);
      const currentTime = Date.now();
      const timeWindow = (options.timeWindow || 300) * 1000; // 默认5分钟

      // 验证时间戳有效性
      if (Math.abs(currentTime - requestTime) > timeWindow) {
        this.logger.warn(
          `Request timestamp expired: ${timestamp}, current: ${currentTime}`,
        );
        throw new HttpException(
          {
            code: HttpStatus.BAD_REQUEST,
            message: "请求已过期，请重新发起请求",
            data: null,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // 检查随机字符串
      if (options.nonceRequired) {
        if (!nonce) {
          throw new HttpException(
            {
              code: HttpStatus.BAD_REQUEST,
              message: "缺少随机字符串参数",
              data: null,
            },
            HttpStatus.BAD_REQUEST,
          );
        }

        // 检查nonce是否已使用
        const nonceKey = `anti_replay:nonce:${nonce}`;
        const exists = await this.redisService.get(nonceKey);

        if (exists) {
          this.logger.warn(`Duplicate nonce detected: ${nonce}`);
          throw new HttpException(
            {
              code: HttpStatus.BAD_REQUEST,
              message: "请求已被处理，请勿重复提交",
              data: null,
            },
            HttpStatus.BAD_REQUEST,
          );
        }

        // 记录nonce，设置过期时间
        await this.redisService.set(nonceKey, "1", options.timeWindow || 300);
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Anti-replay guard error: ${errorMessage}`);
      // Redis故障时降级，允许请求通过
      return true;
    }
  }
}
