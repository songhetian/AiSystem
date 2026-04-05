import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

type LockStore = 'redis' | 'memory';

@Injectable()
export class BusinessLockService {
  private readonly logger = new Logger(BusinessLockService.name);
  private readonly memoryLocks = new Set<string>();
  private warnedMemoryFallback = false;

  constructor(private readonly redisService: RedisService) {}

  async runExclusive<T>(key: string, ttlSeconds: number, handler: () => Promise<T>) {
    const lockKey = `biz-lock:${key}`;
    const lock = await this.acquire(lockKey, ttlSeconds);
    if (!lock.acquired) {
      throw new ConflictException('业务正在处理中，请稍后重试');
    }

    try {
      return await handler();
    } finally {
      await this.release(lockKey, lock.store);
    }
  }

  private async acquire(key: string, ttlSeconds: number): Promise<{ acquired: boolean; store: LockStore }> {
    try {
      const created = await this.redisService.setNx(key, '1', ttlSeconds);
      if (created === 'OK') {
        this.logRedisRecovered();
        return { acquired: true, store: 'redis' };
      }

      if (created === null && this.redisService.isReady()) {
        return { acquired: false, store: 'redis' };
      }
    } catch (error) {
      this.warnMemoryFallback(error);
    }

    if (this.memoryLocks.has(key)) {
      return { acquired: false, store: 'memory' };
    }

    this.memoryLocks.add(key);
    return { acquired: true, store: 'memory' };
  }

  private async release(key: string, store: LockStore) {
    if (store === 'memory') {
      this.memoryLocks.delete(key);
      return;
    }

    try {
      await this.redisService.del(key);
      this.logRedisRecovered();
    } catch (error) {
      this.warnMemoryFallback(error);
      this.memoryLocks.delete(key);
    }
  }

  private warnMemoryFallback(error: unknown) {
    if (this.warnedMemoryFallback) {
      return;
    }

    this.warnedMemoryFallback = true;
    this.logger.warn(`Redis business lock unavailable, falling back to memory lock. ${String(error)}`);
  }

  private logRedisRecovered() {
    if (!this.warnedMemoryFallback || !this.redisService.isReady()) {
      return;
    }

    this.warnedMemoryFallback = false;
    this.logger.log('Redis business lock recovered, memory fallback disabled.');
  }
}
