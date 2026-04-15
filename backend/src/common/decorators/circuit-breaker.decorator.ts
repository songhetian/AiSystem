import { Logger } from '@nestjs/common';

/**
 * 工业级熔断器配置接口
 */
export interface CircuitBreakerOptions {
  failureThreshold: number; // 失败阈值
  resetTimeout: number;    // 熔断时长 (ms)
  fallback?: (...args: any[]) => any; // 降级处理函数
}

/**
 * 极简熔断装饰器 (V5.0)
 * 职责：当外部服务（如 OSS, AI）连续报错时，自动进入熔断状态，保护系统稳定。
 */
export function CircuitBreaker(options: CircuitBreakerOptions) {
  const logger = new Logger('CircuitBreaker');
  let failures = 0;
  let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  let nextAttempt = 0;

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const now = Date.now();

      // 1. 检查熔断状态
      if (state === 'OPEN') {
        if (now > nextAttempt) {
          state = 'HALF_OPEN';
          logger.warn(`[V5.0] 服务 ${propertyKey} 尝试半开探测...`);
        } else {
          logger.error(`[V5.0] 服务 ${propertyKey} 处于熔断状态，拒绝请求`);
          if (options.fallback) {
            return options.fallback.apply(this, args);
          }
          throw new Error(`Circuit breaker is OPEN for ${propertyKey}`);
        }
      }

      try {
        const result = await originalMethod.apply(this, args);
        
        // 执行成功，重置计数器
        if (state === 'HALF_OPEN') {
          logger.log(`[V5.0] 服务 ${propertyKey} 探测成功，恢复健康状态`);
        }
        failures = 0;
        state = 'CLOSED';
        return result;
      } catch (error) {
        failures++;
        logger.error(`[V5.0] 服务 ${propertyKey} 调用异常 (${failures}/${options.failureThreshold}): ${error.message}`);

        if (failures >= options.failureThreshold) {
          state = 'OPEN';
          nextAttempt = now + options.resetTimeout;
          logger.error(`[V5.0] 服务 ${propertyKey} 已触发熔断！封禁时长: ${options.resetTimeout}ms`);
        }

        if (options.fallback) {
          return options.fallback.apply(this, args);
        }
        throw error;
      }
    };

    return descriptor;
  };
}
