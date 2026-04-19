import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DegradationService } from "../services/degradation.service";
import {
  DEGRADATION_KEY,
  DegradationOptions,
} from "../decorators/degradation.decorator";

/**
 * 降级守卫
 * 根据系统负载自动降级非核心功能
 */
@Injectable()
export class DegradationGuard implements CanActivate {
  private readonly logger = new Logger(DegradationGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly degradationService: DegradationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<DegradationOptions>(
      DEGRADATION_KEY,
      context.getHandler(),
    );

    if (!options) {
      return true;
    }

    try {
      const shouldDegrade = await this.degradationService.shouldDegrade(
        options.level,
      );

      if (shouldDegrade) {
        this.logger.warn(
          `Function degraded at level ${options.level}: ${context.getHandler().name}`,
        );

        // 如果有降级处理函数，执行降级逻辑
        if (options.fallback) {
          const request = context.switchToHttp().getRequest();
          const result = await options.fallback(request);

          // 返回降级结果
          const response = context.switchToHttp().getResponse();
          response.json({
            code: HttpStatus.OK,
            message: options.message || "功能已降级",
            data: result,
          });

          return false;
        }

        // 非核心功能直接拒绝
        if (!options.isCore) {
          throw new HttpException(
            {
              code: HttpStatus.SERVICE_UNAVAILABLE,
              message: options.message || "当前功能暂时不可用，请稍后再试",
              data: null,
            },
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Degradation guard error: ${errorMessage}`);
      // 降级服务故障时，允许请求通过
      return true;
    }
  }
}
