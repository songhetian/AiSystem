import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 雪花算法 (Snowflake) 实现
 * 格式: 1位符号位 + 41位时间戳 + 10位机器/工作节点ID + 12位序列号
 */
@Injectable()
export class SnowflakeService {
  private readonly epoch = 1640995200000n; // 2022-01-01 00:00:00
  private readonly workerIdBits = 10n;
  private readonly sequenceBits = 12n;

  private readonly maxWorkerId = -1n ^ (-1n << this.workerIdBits);
  private readonly sequenceMask = -1n ^ (-1n << this.sequenceBits);

  private readonly workerIdShift = this.sequenceBits;
  private readonly timestampShift = this.sequenceBits + this.workerIdBits;

  private lastTimestamp = -1n;
  private workerId = 0n;
  private sequence = 0n;

  constructor(private configService: ConfigService) {
    const id = BigInt(this.configService.get<number>('WORKER_ID') || 1);
    if (id > this.maxWorkerId || id < 0n) {
      throw new Error(`Worker ID 必须在 0 和 ${this.maxWorkerId} 之间`);
    }
    this.workerId = id;
  }

  nextId(): string {
    let timestamp = BigInt(Date.now());

    if (timestamp < this.lastTimestamp) {
      throw new Error('时钟回拨，拒绝生成 ID');
    }

    if (this.lastTimestamp === timestamp) {
      this.sequence = (this.sequence + 1n) & this.sequenceMask;
      if (this.sequence === 0n) {
        timestamp = this.waitNextMillis(this.lastTimestamp);
      }
    } else {
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    const id =
      ((timestamp - this.epoch) << this.timestampShift) |
      (this.workerId << this.workerIdShift) |
      this.sequence;

    return id.toString();
  }

  private waitNextMillis(lastTimestamp: bigint): bigint {
    let timestamp = BigInt(Date.now());
    while (timestamp <= lastTimestamp) {
      timestamp = BigInt(Date.now());
    }
    return timestamp;
  }
}
