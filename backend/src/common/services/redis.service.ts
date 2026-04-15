import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { createClient } from "redis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client?: ReturnType<typeof createClient>;
  private ready = false;

  async onModuleInit() {
    const client = this.createRedisClient();
    if (!client) {
      return;
    }

    client.on("error", () => {
      this.ready = false;
    });

    try {
      await client.connect();
      this.client = client;
      this.ready = true;
    } catch {
      this.ready = false;
    }
  }

  async onModuleDestroy() {
    if (!this.client) {
      return;
    }

    try {
      await this.client.quit();
    } catch {
      await this.client.disconnect();
    } finally {
      this.ready = false;
      this.client = undefined;
    }
  }

  isReady() {
    return this.ready && this.client?.isReady;
  }

  async get(key: string) {
    if (!this.isReady() || !this.client) {
      return null;
    }

    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number) {
    if (!this.isReady() || !this.client) {
      return null;
    }

    return this.client.set(key, value, {
      EX: ttlSeconds,
    });
  }

  async setNx(key: string, value: string, ttlSeconds: number) {
    if (!this.isReady() || !this.client) {
      return null;
    }

    return this.client.set(key, value, {
      EX: ttlSeconds,
      NX: true,
    });
  }

  async del(key: string) {
    if (!this.isReady() || !this.client) {
      return 0;
    }

    return this.client.del(key);
  }

  async incr(key: string) {
    if (!this.isReady() || !this.client) {
      return null;
    }

    return this.client.incr(key);
  }

  async expire(key: string, ttlSeconds: number) {
    if (!this.isReady() || !this.client) {
      return null;
    }

    return this.client.expire(key, ttlSeconds);
  }

  async deleteByPattern(pattern: string) {
    if (!this.isReady() || !this.client) {
      return 0;
    }

    const keys = await this.client.keys(pattern);
    if (!keys.length) {
      return 0;
    }

    return this.client.del(keys);
  }

  async eval(script: string, keys: string[], args: string[]) {
    if (!this.isReady() || !this.client) return null;
    return this.client.eval(script, {
      keys,
      arguments: args,
    });
  }

  async publish(channel: string, message: string) {
    if (!this.isReady() || !this.client) return;
    return this.client.publish(channel, message);
  }

  // ✅ 新增：List 操作，用于日志故障兜底缓存（PRD 2.1.2）
  async lpush(key: string, value: string) {
    if (!this.isReady() || !this.client) return null;
    return this.client.lPush(key, value);
  }

  async rpop(key: string): Promise<string | null> {
    if (!this.isReady() || !this.client) return null;
    return this.client.rPop(key);
  }

  async subscribe(channel: string, callback: (message: string) => void) {
    const subClient = this.createRedisClient();
    if (!subClient) return;
    await subClient.connect();
    await subClient.subscribe(channel, (message) => callback(message));
  }

  private createRedisClient() {
    const redisUrl = process.env.REDIS_URL?.trim();
    const host = process.env.REDIS_HOST?.trim();

    if (!redisUrl && !host) {
      return undefined;
    }

    if (redisUrl) {
      return createClient({
        url: redisUrl,
      });
    }

    return createClient({
      socket: {
        host,
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
      database: Number(process.env.REDIS_DB ?? 0),
      password: process.env.REDIS_PASSWORD || undefined,
    });
  }
}
