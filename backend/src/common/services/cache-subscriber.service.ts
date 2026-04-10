import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { RedisService } from '../services/redis.service';

@Injectable()
export class CacheSubscriber implements OnModuleInit {
  private readonly logger = new Logger(CacheSubscriber.name);

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    this.logger.log('Initializing Global Cache Subscriber...');

    // 订阅考勤相关缓存失效
    await this.redisService.subscribe('attendance:sync', (msg) => {
      this.logger.debug(`Cache invalidation received: ${msg}`);
      // 执行失效逻辑，如清理本地缓存或特定 Redis 前缀 Key
    });

    // 订阅知识库缓存失效
    await this.redisService.subscribe('knowledge:sync', (msg) => {
      this.logger.debug(`Cache invalidation received: ${msg}`);
      // 清理知识库相关缓存
    });

    // 订阅财务相关缓存失效
    await this.redisService.subscribe('finance:sync', (msg) => {
      this.logger.debug(`Cache invalidation received: ${msg}`);
      // 清理财务相关缓存
    });
  }
}
