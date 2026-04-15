import { SetMetadata } from '@nestjs/common';

export const DISTRIBUTED_LOCK_KEY = 'distributed_lock';

export interface DistributedLockOptions {
  /**
   * 锁定的 Key 模板，支持以 {body.id} 这种形式读取请求参数
   */
  key: string;
  /**
   * 锁定超时时间（秒），默认 60s
   */
  ttl?: number;
}

/**
 * 分布式业务执行锁装饰器 (V3.0)
 * 用于防止重型任务或具有并发风险的业务操作在集群内交叉执行。
 */
export const DistributedLock = (options: DistributedLockOptions) => SetMetadata(DISTRIBUTED_LOCK_KEY, options);
