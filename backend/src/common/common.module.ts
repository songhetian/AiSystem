import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './gateways/realtime.gateway';
import { BusinessLockService } from './services/business-lock.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ThrottlerGuard } from './guards/throttler.guard';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor';
import { PermissionGuard } from './guards/permission.guard';
import { OperationLogInterceptor } from './interceptors/operation-log.interceptor';
import { AuditLogService } from './services/audit-log.service';
import { IdempotencyService } from './services/idempotency.service';
import { MinioService } from './services/minio.service';
import { MessageService } from './services/message.service';
import { RealtimeService } from './services/realtime.service';
import { RedisService } from './services/redis.service';
import { ScopeService } from './services/scope.service';
import { VectorService } from './services/vector.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'changeme'
    })
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
    IdempotencyService,
    VectorService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: OperationLogInterceptor
    }
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
    IdempotencyService,
    VectorService
  ]
})
export class CommonModule {}
