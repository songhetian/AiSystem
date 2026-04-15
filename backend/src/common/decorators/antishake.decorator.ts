import { SetMetadata } from '@nestjs/common';

export const ANTISHAKE_KEY = 'antishake';

/**
 * 后端接口防抖装饰器 (V3.0)
 * @param ms 防抖时间（毫秒），默认 1000ms
 */
export const AntiShake = (ms: number = 1000) => SetMetadata(ANTISHAKE_KEY, ms);
