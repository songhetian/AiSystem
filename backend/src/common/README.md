# 后端公共模块使用指南

## 📋 概述

本目录包含后端所有公共模块，提供全局通用功能，供所有业务模块复用。

## 🎯 核心原则

1. **模块化**：功能独立，职责单一
2. **可复用**：所有业务模块可直接使用
3. **高可用**：实现熔断、限流、降级机制
4. **安全性**：提供完善的安全防护

## 📦 目录结构

```
common/
├── config/              # 配置管理
│   └── high-availability.config.ts  # 高可用配置
├── decorators/          # 装饰器
│   ├── circuit-breaker.decorator.ts  # 熔断装饰器
│   ├── rate-limiter.decorator.ts     # 限流装饰器
│   ├── degradation.decorator.ts      # 降级装饰器
│   ├── security.decorator.ts         # 安全装饰器
│   ├── api-docs.decorator.ts         # API文档装饰器
│   ├── cache.decorator.ts            # 缓存装饰器
│   ├── idempotent.decorator.ts       # 幂等装饰器
│   └── ...
├── filters/             # 过滤器
│   ├── global-exception.filter.ts    # 全局异常过滤器
│   └── http-exception.filter.ts      # HTTP异常过滤器
├── guards/              # 守卫
│   ├── jwt-auth.guard.ts             # JWT认证守卫
│   ├── permission.guard.ts           # 权限守卫
│   ├── rate-limiter.guard.ts         # 限流守卫
│   ├── degradation.guard.ts          # 降级守卫
│   ├── anti-replay.guard.ts          # 防重放守卫
│   └── ...
├── interceptors/        # 拦截器
│   ├── standard-response.interceptor.ts  # 标准响应拦截器
│   ├── api-response.interceptor.ts       # API响应拦截器
│   ├── performance.interceptor.ts        # 性能监控拦截器
│   ├── cache.interceptor.ts              # 缓存拦截器
│   └── ...
├── services/            # 服务
│   ├── redis.service.ts              # Redis服务
│   ├── degradation.service.ts        # 降级服务
│   ├── message.service.ts            # 消息服务
│   ├── minio.service.ts              # MinIO服务
│   └── ...
└── utils/               # 工具类
    ├── crypto.util.ts                # 加密工具
    ├── mask.util.ts                  # 脱敏工具
    ├── password.util.ts              # 密码工具
    └── ...
```

## 🚀 快速开始

### 1. 熔断机制

**使用场景**：调用第三方接口、不稳定的外部服务

```typescript
import { CircuitBreaker } from "@/common/decorators/circuit-breaker.decorator";

export class ThirdPartyService {
  @CircuitBreaker({
    failureThreshold: 10, // 连续失败10次触发熔断
    resetTimeout: 60000, // 熔断60秒
    fallback: () => {
      // 降级处理
      return { success: false, message: "服务暂时不可用" };
    },
  })
  async callThirdPartyApi(params: any) {
    // 调用第三方接口
    return await this.httpService.post("https://api.example.com", params);
  }
}
```

### 2. 限流机制

**使用场景**：防止接口被高频请求

```typescript
import { Controller, Post } from "@nestjs/common";
import {
  RateLimit,
  RateLimitType,
} from "@/common/decorators/rate-limiter.decorator";

@Controller("users")
export class UserController {
  // 单IP限流：每分钟最多10次
  @Post("login")
  @RateLimit({
    type: RateLimitType.IP,
    limit: 10,
    window: 60,
  })
  async login(@Body() dto: LoginDto) {
    return await this.authService.login(dto);
  }

  // 单用户限流：每10秒最多5次
  @Post("submit")
  @RateLimit({
    type: RateLimitType.USER,
    limit: 5,
    window: 10,
  })
  async submit(@Body() dto: SubmitDto) {
    return await this.userService.submit(dto);
  }

  // 接口级限流：每秒最多20次，启用排队
  @Post("payment")
  @RateLimit({
    type: RateLimitType.API,
    limit: 20,
    window: 1,
    enableQueue: true,
    queueSize: 50,
  })
  async payment(@Body() dto: PaymentDto) {
    return await this.paymentService.process(dto);
  }
}
```

### 3. 降级机制

**使用场景**：系统负载过高时自动降级非核心功能

```typescript
import { Controller, Get } from "@nestjs/common";
import {
  Degradation,
  DegradationLevel,
} from "@/common/decorators/degradation.decorator";

@Controller("reports")
export class ReportController {
  // 非核心功能，一级降级时关闭
  @Get("export")
  @Degradation({
    level: DegradationLevel.LIGHT,
    message: "当前功能暂时不可用，请稍后再试",
  })
  async exportReport(@Query() query: ExportDto) {
    return await this.reportService.export(query);
  }

  // 次要核心功能，二级降级时简化
  @Get("statistics")
  @Degradation({
    level: DegradationLevel.MEDIUM,
    isCore: true,
    fallback: (req) => {
      // 简化统计逻辑，只返回基础数据
      return this.reportService.getBasicStats(req.query);
    },
  })
  async getStatistics(@Query() query: StatsDto) {
    return await this.reportService.getFullStatistics(query);
  }

  // 核心功能，三级降级时仍保留
  @Get("core-data")
  @Degradation({
    level: DegradationLevel.HEAVY,
    isCore: true,
  })
  async getCoreData(@Query() query: QueryDto) {
    return await this.reportService.getCoreData(query);
  }
}
```

### 4. 安全防护

#### 4.1 防重放攻击

```typescript
import { Controller, Post } from "@nestjs/common";
import { AntiReplay } from "@/common/decorators/security.decorator";

@Controller("payment")
export class PaymentController {
  @Post("submit")
  @AntiReplay({
    enabled: true,
    timeWindow: 300, // 5分钟时间窗口
    nonceRequired: true, // 需要随机字符串
  })
  async submitPayment(@Body() dto: PaymentDto) {
    // 请求头需包含：
    // x-timestamp: 时间戳
    // x-nonce: 随机字符串
    return await this.paymentService.submit(dto);
  }
}
```

#### 4.2 数据脱敏

```typescript
import { Controller, Get } from "@nestjs/common";
import { DataMask } from "@/common/decorators/security.decorator";

@Controller("users")
export class UserController {
  @Get(":id")
  @DataMask({
    fields: ["phone", "idCard", "email"],
    maskType: "phone",
  })
  async getUserInfo(@Param("id") id: string) {
    // 返回的数据会自动脱敏
    // phone: 138****1234
    // idCard: 110101****1234
    // email: ab****@example.com
    return await this.userService.findOne(id);
  }
}
```

### 5. API文档

```typescript
import { Controller, Get, Post } from "@nestjs/common";
import { ApiDocs } from "@/common/decorators/api-docs.decorator";

@Controller("users")
export class UserController {
  @Get()
  @ApiDocs({
    summary: "获取用户列表",
    description: "分页查询用户列表，支持按用户名、手机号搜索",
    auth: true,
    successMessage: "查询成功",
    errorCodes: [400, 401, 403],
  })
  async getUsers(@Query() query: QueryDto) {
    return await this.userService.findAll(query);
  }

  @Post()
  @ApiDocs({
    summary: "创建用户",
    description: "创建新用户，用户名和手机号必须唯一",
    auth: true,
    successMessage: "创建成功",
    errorCodes: [400, 401, 403, 409],
  })
  async createUser(@Body() dto: CreateUserDto) {
    return await this.userService.create(dto);
  }
}
```

### 6. 标准化响应

所有接口自动返回标准格式：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    // 响应数据
  },
  "timestamp": "2024-05-20T10:30:00Z",
  "path": "/api/v1/users"
}
```

错误响应：

```json
{
  "code": 400,
  "message": "请求参数错误",
  "data": null,
  "timestamp": "2024-05-20T10:30:00Z",
  "path": "/api/v1/users"
}
```

## 🔧 配置管理

### 修改配置

编辑 `config/high-availability.config.ts` 文件：

```typescript
export const HighAvailabilityConfig = {
  circuitBreaker: {
    default: {
      failureThreshold: 10, // 修改失败阈值
      resetTimeout: 60000, // 修改熔断时间
    },
  },
  rateLimit: {
    ip: {
      limit: 10, // 修改限流次数
      window: 60, // 修改时间窗口
    },
  },
  // ...
};
```

### 动态获取配置

```typescript
import { getConfig } from "@/common/config/high-availability.config";

const ipLimit = getConfig("rateLimit.ip.limit");
const cpuThreshold = getConfig("degradation.thresholds.cpu.light");
```

### 动态更新配置

```typescript
import { updateConfig } from "@/common/config/high-availability.config";

// 更新IP限流配置
updateConfig("rateLimit.ip.limit", 20);

// 更新CPU阈值
updateConfig("degradation.thresholds.cpu.light", 90);
```

## 📊 监控与日志

### 查看熔断状态

```typescript
// 在控制器中注入服务
constructor(private readonly degradationService: DegradationService) {}

// 获取当前降级级别
const level = await this.degradationService.getCurrentLevel();

// 手动触发降级
await this.degradationService.manualDegrade(
  DegradationLevel.MEDIUM,
  'admin',
  '系统维护'
);

// 恢复正常
await this.degradationService.recover();
```

### 日志记录

所有熔断、限流、降级操作都会自动记录日志：

```
[CircuitBreaker] 服务 callThirdPartyApi 已触发熔断！封禁时长: 60000ms
[RateLimiter] Rate limit exceeded for ip: 192.168.1.1, limit: 10/60s
[Degradation] System degradation level changed to 2, reason: CPU: 92.5%, Memory: 85.2%
```

## 🚨 告警配置

编辑配置文件设置告警：

```typescript
monitoring: {
  alert: {
    channels: ['email', 'sms', 'system'],
    recipients: {
      email: ['admin@example.com'],
      sms: ['+86-13800138000'],
    },
    thresholds: {
      circuitBreakerOpen: 3,   // 3个接口熔断触发告警
      rateLimitExceeded: 100,  // 限流次数超过100触发告警
      degradationLevel: 2,     // 降级级别达到2触发告警
    },
  },
}
```

## 📝 最佳实践

### 1. 熔断器使用建议

- ✅ 所有第三方接口调用必须使用熔断器
- ✅ 不稳定的内部服务也应使用熔断器
- ✅ 提供合理的降级处理函数
- ❌ 不要在核心业务逻辑中使用熔断器

### 2. 限流使用建议

- ✅ 登录、支付等核心接口必须限流
- ✅ 根据业务场景选择合适的限流类型
- ✅ 核心接口可启用请求排队
- ❌ 不要对所有接口都设置相同的限流阈值

### 3. 降级使用建议

- ✅ 明确区分核心功能和非核心功能
- ✅ 非核心功能应设置较低的降级级别
- ✅ 提供合理的降级提示信息
- ❌ 不要将所有功能都标记为核心功能

### 4. 安全防护建议

- ✅ 支付、敏感操作必须防重放
- ✅ 所有敏感数据必须脱敏
- ✅ 高频接口必须防刷
- ❌ 不要在日志中记录敏感信息

## 🔗 相关文档

- [NestJS官方文档](https://docs.nestjs.com/)
- [Redis官方文档](https://redis.io/documentation)
- [Prisma官方文档](https://www.prisma.io/docs)

---

**最后更新时间**: 2026-04-15
**文档版本**: V1.0
