import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CircuitBreaker } from "../decorators/circuit-breaker.decorator";
import { RateLimit, RateLimitType } from "../decorators/rate-limiter.decorator";
import {
  Degradation,
  DegradationLevel,
} from "../decorators/degradation.decorator";
import { AntiReplay, DataMask } from "../decorators/security.decorator";
import { ApiDocs } from "../decorators/api-docs.decorator";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RateLimiterGuard } from "../guards/rate-limiter.guard";
import { DegradationGuard } from "../guards/degradation.guard";
import { AntiReplayGuard } from "../guards/anti-replay.guard";

/**
 * 高可用功能使用示例控制器
 *
 * 本控制器展示了如何综合使用：
 * 1. 熔断机制
 * 2. 限流机制
 * 3. 降级机制
 * 4. 安全防护
 * 5. API文档
 */
@ApiTags("高可用示例")
@Controller("examples/high-availability")
@UseGuards(JwtAuthGuard)
export class HighAvailabilityExampleController {
  /**
   * 示例1：熔断机制
   * 调用第三方接口时使用熔断器保护
   */
  @Get("circuit-breaker")
  @ApiDocs({
    summary: "熔断机制示例",
    description: "演示如何使用熔断器保护第三方接口调用",
    auth: true,
    successMessage: "调用成功",
    errorCodes: [500, 503],
  })
  @CircuitBreaker({
    failureThreshold: 5, // 连续失败5次触发熔断
    resetTimeout: 30000, // 熔断30秒
    fallback: () => {
      // 降级处理
      return {
        success: false,
        message: "第三方服务暂时不可用，请稍后再试",
        data: null,
      };
    },
  })
  async callThirdPartyService(@Query("url") url: string) {
    // 模拟调用第三方接口
    // 实际使用时替换为真实的第三方接口调用
    const response = await fetch(url);
    return await response.json();
  }

  /**
   * 示例2：IP限流
   * 防止单个IP高频请求
   */
  @Post("rate-limit/ip")
  @UseGuards(RateLimiterGuard)
  @ApiDocs({
    summary: "IP限流示例",
    description: "单个IP每分钟最多10次请求",
    auth: true,
    successMessage: "请求成功",
    errorCodes: [429],
  })
  @RateLimit({
    type: RateLimitType.IP,
    limit: 10, // 每分钟10次
    window: 60,
    message: "请求过于频繁，请稍后再试",
  })
  async ipRateLimitExample(@Body() data: any) {
    return {
      success: true,
      message: "请求处理成功",
      data,
    };
  }

  /**
   * 示例3：用户限流
   * 防止单个用户高频操作
   */
  @Post("rate-limit/user")
  @UseGuards(RateLimiterGuard)
  @ApiDocs({
    summary: "用户限流示例",
    description: "单个用户每10秒最多5次请求",
    auth: true,
    successMessage: "操作成功",
    errorCodes: [429],
  })
  @RateLimit({
    type: RateLimitType.USER,
    limit: 5, // 每10秒5次
    window: 10,
    message: "操作过于频繁，请稍后再试",
  })
  async userRateLimitExample(@Body() data: any) {
    return {
      success: true,
      message: "操作处理成功",
      data,
    };
  }

  /**
   * 示例4：接口级限流（带排队）
   * 核心接口限流，超出限制后排队处理
   */
  @Post("rate-limit/api-queue")
  @UseGuards(RateLimiterGuard)
  @ApiDocs({
    summary: "接口级限流（排队）示例",
    description: "每秒最多20次请求，超出后排队处理",
    auth: true,
    successMessage: "处理成功",
    errorCodes: [429],
  })
  @RateLimit({
    type: RateLimitType.API,
    limit: 20, // 每秒20次
    window: 1,
    enableQueue: true, // 启用排队
    queueSize: 50, // 队列大小50
    queueTimeout: 5, // 队列超时5秒
  })
  async apiRateLimitWithQueueExample(@Body() data: any) {
    // 模拟耗时操作
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      success: true,
      message: "处理完成",
      data,
    };
  }

  /**
   * 示例5：一级降级（非核心功能）
   * 系统负载高时自动关闭
   */
  @Get("degradation/light")
  @UseGuards(DegradationGuard)
  @ApiDocs({
    summary: "一级降级示例",
    description: "非核心功能，系统负载高时自动关闭",
    auth: true,
    successMessage: "查询成功",
    errorCodes: [503],
  })
  @Degradation({
    level: DegradationLevel.LIGHT,
    message: "当前功能暂时不可用，请稍后再试",
  })
  async lightDegradationExample(@Query() query: any) {
    // 非核心功能：数据统计、报表导出等
    return {
      success: true,
      message: "统计数据查询成功",
      data: {
        total: 1000,
        active: 800,
        inactive: 200,
      },
    };
  }

  /**
   * 示例6：二级降级（次要核心功能）
   * 系统负载高时简化处理
   */
  @Get("degradation/medium")
  @UseGuards(DegradationGuard)
  @ApiDocs({
    summary: "二级降级示例",
    description: "次要核心功能，系统负载高时简化处理",
    auth: true,
    successMessage: "查询成功",
    errorCodes: [503],
  })
  @Degradation({
    level: DegradationLevel.MEDIUM,
    isCore: true,
    fallback: (req) => {
      // 简化处理：只返回基础数据
      return {
        success: true,
        message: "返回基础数据（已降级）",
        data: {
          basic: true,
          summary: "基础统计信息",
        },
      };
    },
  })
  async mediumDegradationExample(@Query() query: any) {
    // 次要核心功能：完整的数据查询
    return {
      success: true,
      message: "完整数据查询成功",
      data: {
        basic: true,
        detailed: true,
        summary: "完整统计信息",
        charts: [],
        reports: [],
      },
    };
  }

  /**
   * 示例7：三级降级（核心功能）
   * 即使系统负载极高也保留
   */
  @Get("degradation/heavy")
  @UseGuards(DegradationGuard)
  @ApiDocs({
    summary: "三级降级示例",
    description: "核心功能，即使系统负载极高也保留",
    auth: true,
    successMessage: "查询成功",
    errorCodes: [],
  })
  @Degradation({
    level: DegradationLevel.HEAVY,
    isCore: true,
  })
  async heavyDegradationExample(@Query() query: any) {
    // 核心功能：用户认证、核心数据查询、支付流程等
    return {
      success: true,
      message: "核心数据查询成功",
      data: {
        id: "123",
        name: "核心数据",
        status: "active",
      },
    };
  }

  /**
   * 示例8：防重放攻击
   * 支付等敏感操作必须防重放
   */
  @Post("security/anti-replay")
  @UseGuards(AntiReplayGuard)
  @ApiDocs({
    summary: "防重放攻击示例",
    description: "支付等敏感操作，防止请求被重放",
    auth: true,
    successMessage: "支付成功",
    errorCodes: [400, 401],
  })
  @AntiReplay({
    enabled: true,
    timeWindow: 300, // 5分钟时间窗口
    nonceRequired: true, // 需要随机字符串
  })
  async antiReplayExample(@Body() data: any) {
    // 请求头需包含：
    // x-timestamp: 当前时间戳
    // x-nonce: 随机字符串（UUID）
    return {
      success: true,
      message: "支付处理成功",
      orderId: "ORDER_" + Date.now(),
    };
  }

  /**
   * 示例9：数据脱敏
   * 返回用户信息时自动脱敏
   */
  @Get("security/data-mask/:id")
  @ApiDocs({
    summary: "数据脱敏示例",
    description: "返回用户信息时自动脱敏敏感数据",
    auth: true,
    successMessage: "查询成功",
    errorCodes: [404],
  })
  @DataMask({
    fields: ["phone", "idCard", "email"],
    maskType: "phone",
  })
  async dataMaskExample(@Param("id") id: string) {
    // 返回的数据会自动脱敏
    return {
      success: true,
      message: "用户信息查询成功",
      data: {
        id,
        name: "张三",
        phone: "13800138000", // 会脱敏为: 138****8000
        idCard: "110101199001011234", // 会脱敏为: 110101****1234
        email: "zhangsan@example.com", // 会脱敏为: zh****@example.com
      },
    };
  }

  /**
   * 示例10：综合使用
   * 同时使用多个功能保护接口
   */
  @Post("comprehensive")
  @UseGuards(RateLimiterGuard, DegradationGuard, AntiReplayGuard)
  @ApiDocs({
    summary: "综合使用示例",
    description: "同时使用熔断、限流、降级、防重放等功能",
    auth: true,
    successMessage: "处理成功",
    errorCodes: [400, 401, 429, 503],
  })
  @CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000,
    fallback: () => ({
      success: false,
      message: "服务暂时不可用",
    }),
  })
  @RateLimit({
    type: RateLimitType.USER,
    limit: 5,
    window: 10,
  })
  @Degradation({
    level: DegradationLevel.MEDIUM,
    isCore: true,
  })
  @AntiReplay({
    enabled: true,
    timeWindow: 300,
    nonceRequired: true,
  })
  @DataMask({
    fields: ["phone", "idCard"],
    maskType: "phone",
  })
  async comprehensiveExample(@Body() data: any) {
    // 这个接口受到全方位保护：
    // 1. 熔断保护：第三方服务故障时自动降级
    // 2. 限流保护：防止用户高频操作
    // 3. 降级保护：系统负载高时自动降级
    // 4. 防重放：防止请求被重放
    // 5. 数据脱敏：返回数据自动脱敏

    return {
      success: true,
      message: "处理成功",
      data: {
        id: "123",
        phone: "13800138000",
        idCard: "110101199001011234",
        result: "success",
      },
    };
  }
}
