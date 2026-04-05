import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { BusinessLockService } from './services/business-lock.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor';
import { PermissionGuard } from './guards/permission.guard';
import { OperationLogInterceptor } from './interceptors/operation-log.interceptor';
import { AuditLogService } from './services/audit-log.service';
import { IdempotencyService } from './services/idempotency.service';
import { MinioService } from './services/minio.service';
import { MessageService } from './services/message.service';
import { RedisService } from './services/redis.service';
import { ScopeService } from './services/scope.service';

@Module({
  providers: [
    MinioService,
    MessageService,
    ScopeService,
    AuditLogService,
    BusinessLockService,
    RedisService,
    IdempotencyService,
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
  exports: [MinioService, MessageService, ScopeService, AuditLogService, BusinessLockService, RedisService, IdempotencyService]
})
export class CommonModule {}
