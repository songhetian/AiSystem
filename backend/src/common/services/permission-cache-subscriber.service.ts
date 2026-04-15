import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from './redis.service';
import { PermissionGuard } from '../guards/permission.guard';
import { ModuleRef } from '@nestjs/core';

/**
 * 权限缓存订阅服务（V2.0 新增）
 * 功能：
 * 1. 订阅Redis的权限变更事件
 * 2. 通知PermissionGuard清除内存缓存
 * 3. 确保多节点部署时权限变更实时生效
 */
@Injectable()
export class PermissionCacheSubscriber implements OnModuleInit {
  private readonly logger = new Logger(PermissionCacheSubscriber.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async onModuleInit() {
    // 订阅权限变更事件
    await this.subscribePermissionChanges();
  }

  private async subscribePermissionChanges() {
    try {
      await this.redisService.subscribe('permission:changed', (message) => {
        try {
          const event = JSON.parse(message);
          this.logger.log(`Permission changed event received: ${JSON.stringify(event)}`);
          
          // 获取PermissionGuard实例并清除缓存
          const permissionGuards = this.moduleRef.get(PermissionGuard, { strict: false });
          if (permissionGuards && typeof (permissionGuards as any).clearCache === 'function') {
            (permissionGuards as any).clearCache();
            this.logger.log('Permission cache cleared successfully');
          }
        } catch (error) {
          this.logger.error('Failed to process permission change event', error);
        }
      });
      
      this.logger.log('Permission cache subscriber initialized');
    } catch (error) {
      this.logger.error('Failed to subscribe to permission changes', error);
    }
  }
}
