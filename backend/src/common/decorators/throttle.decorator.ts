import { SetMetadata } from '@nestjs/common';

export const THROTTLE_LIMIT_KEY = 'throttle_limit';
export const THROTTLE_TTL_KEY = 'throttle_ttl';

/**
 * 自定义限流装饰器 (V3.0)
 * @param limit 请求次数限制
 * @param ttl 时间窗口（秒）
 */
export const Throttle = (limit: number, ttl: number = 60) => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    SetMetadata(THROTTLE_LIMIT_KEY, limit)(target, key, descriptor);
    SetMetadata(THROTTLE_TTL_KEY, ttl)(target, key, descriptor);
  };
};
