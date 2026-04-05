import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

type IdempotencyStore = 'redis' | 'memory';

interface CompletedRequestRecord {
  body: unknown;
  expiresAt: number;
}

interface CompletedRequestResult {
  body: unknown;
  store: IdempotencyStore;
}

interface BeginRequestResult {
  acquired: boolean;
  store: IdempotencyStore;
}

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly completedRequests = new Map<string, CompletedRequestRecord>();
  private readonly inFlightRequests = new Set<string>();
  private readonly ttlSeconds = Number(process.env.IDEMPOTENCY_TTL_SECONDS ?? 300);
  private readonly ttlMs = this.ttlSeconds * 1000;
  private readonly lockTtlSeconds = Number(process.env.IDEMPOTENCY_LOCK_TTL_SECONDS ?? this.ttlSeconds);
  private warnedMemoryFallback = false;

  constructor(private readonly redisService: RedisService) {}

  async getCompleted(key: string): Promise<CompletedRequestResult | undefined> {
    this.prune();

    try {
      const cached = await this.redisService.get(this.buildCompletedKey(key));
      if (cached) {
        const record = JSON.parse(cached) as { body: unknown };
        this.logRedisRecovered();
        return {
          body: record.body,
          store: 'redis'
        };
      }
    } catch (error) {
      this.warnMemoryFallback(error);
    }

    const record = this.completedRequests.get(key);
    if (!record) {
      return undefined;
    }

    if (record.expiresAt <= Date.now()) {
      this.completedRequests.delete(key);
      return undefined;
    }

    return {
      body: record.body,
      store: 'memory'
    };
  }

  async begin(key: string): Promise<BeginRequestResult> {
    this.prune();

    try {
      const created = await this.redisService.setNx(this.buildLockKey(key), '1', this.lockTtlSeconds);
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

    if (this.inFlightRequests.has(key)) {
      return { acquired: false, store: 'memory' };
    }

    this.inFlightRequests.add(key);
    return { acquired: true, store: 'memory' };
  }

  async complete(key: string, body: unknown) {
    this.inFlightRequests.delete(key);
    this.completedRequests.set(key, {
      body,
      expiresAt: Date.now() + this.ttlMs
    });

    try {
      await Promise.all([
        this.redisService.set(this.buildCompletedKey(key), JSON.stringify({ body }), this.ttlSeconds),
        this.redisService.del(this.buildLockKey(key))
      ]);
      this.logRedisRecovered();
    } catch (error) {
      this.warnMemoryFallback(error);
    }
  }

  async fail(key: string) {
    this.inFlightRequests.delete(key);

    try {
      await this.redisService.del(this.buildLockKey(key));
      this.logRedisRecovered();
    } catch (error) {
      this.warnMemoryFallback(error);
    }
  }

  private buildCompletedKey(key: string) {
    return `idempotency:completed:${key}`;
  }

  private buildLockKey(key: string) {
    return `idempotency:lock:${key}`;
  }

  private prune() {
    const now = Date.now();

    for (const [key, record] of this.completedRequests.entries()) {
      if (record.expiresAt <= now) {
        this.completedRequests.delete(key);
      }
    }
  }

  private warnMemoryFallback(error: unknown) {
    if (this.warnedMemoryFallback) {
      return;
    }

    this.warnedMemoryFallback = true;
    this.logger.warn(`Redis idempotency unavailable, falling back to memory cache. ${String(error)}`);
  }

  private logRedisRecovered() {
    if (!this.warnedMemoryFallback || !this.redisService.isReady()) {
      return;
    }

    this.warnedMemoryFallback = false;
    this.logger.log('Redis idempotency recovered, memory fallback disabled.');
  }
}
