import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { RealtimeGateway } from "./gateways/realtime.gateway";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { PermissionGuard } from "./guards/permission.guard";
import { ThrottlerGuard } from "./guards/throttler.guard";
import { AntiShakeGuard } from "./guards/antishake.guard";
import { IdempotencyInterceptor } from "./interceptors/idempotency.interceptor";
import { OperationLogInterceptor } from "./interceptors/operation-log.interceptor";
import { BusinessLockInterceptor } from "./interceptors/business-lock.interceptor";
import { CacheInterceptor } from "./interceptors/cache.interceptor";
import { CacheEvictInterceptor } from "./interceptors/cache-evict.interceptor";
import { QueryOptimizeInterceptor } from "./interceptors/query-optimize.interceptor";
import { AuditLogService } from "./services/audit-log.service";
import { BusinessLockService } from "./services/business-lock.service";
import { CacheSubscriber } from "./services/cache-subscriber.service";
import { IdempotencyService } from "./services/idempotency.service";
import { MessageService } from "./services/message.service";
import { MinioService } from "./services/minio.service";
import { RealtimeService } from "./services/realtime.service";
import { RedisService } from "./services/redis.service";
import { ScopeService } from "./services/scope.service";
import { VectorService } from "./services/vector.service";
import { DeliveryAdapterService } from "./services/delivery-adapter.service";
import { TemplateEngineHelper } from "./helpers/template-engine.helper";
import { PermissionCacheSubscriber } from "./services/permission-cache-subscriber.service";
import { PaginationService } from "./services/pagination.service";
import { CaptchaService } from "./services/captcha.service";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "changeme",
    }),
  ],
  providers: [
    MinioService,
    MessageService,
    RealtimeService,
    RealtimeGateway,
    ScopeService,
    AuditLogService,
    BusinessLockService,
    RedisService,
    CacheSubscriber,
    PermissionCacheSubscriber, // V2.0 新增：权限缓存订阅
    IdempotencyService,
    VectorService,
    DeliveryAdapterService,
    TemplateEngineHelper,
    PaginationService,
    CaptchaService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AntiShakeGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: BusinessLockInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: OperationLogInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheEvictInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: QueryOptimizeInterceptor,
    },
  ],
  exports: [
    MinioService,
    MessageService,
    RealtimeService,
    ScopeService,
    AuditLogService,
    BusinessLockService,
    RedisService,
    CacheSubscriber,
    PermissionCacheSubscriber,
    IdempotencyService,
    VectorService,
    DeliveryAdapterService,
    TemplateEngineHelper,
    PaginationService,
    CaptchaService,
  ],
})
export class CommonModule {}
