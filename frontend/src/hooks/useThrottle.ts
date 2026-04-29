import { useCallback, useRef } from 'react';

/**
 * 节流 Hook
 * Task 16.2: 实现搜索防抖和节流
 * Requirements: 23.1, 23.4
 *
 * 用于限制函数执行频率，防止重复点击
 *
 * @param callback 需要节流的回调函数
 * @param delay 节流延迟时间（毫秒），默认 1000ms
 * @returns 节流后的函数
 *
 * @example
 * const handleExport = useThrottle(() => {
 *   exportData();
 * }, 1000);
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 1000
): (...args: Parameters<T>) => void {
  const lastRun = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRun.current;

      if (timeSinceLastRun >= delay) {
        // 如果距离上次执行已经超过延迟时间，立即执行
        callback(...args);
        lastRun.current = now;
      } else {
        // 否则，清除之前的定时器，设置新的定时器
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRun.current = Date.now();
        }, delay - timeSinceLastRun);
      }
    },
    [callback, delay]
  );
}

/**
 * 简单节流 Hook（仅在冷却期内阻止执行）
 *
 * @param callback 需要节流的回调函数
 * @param delay 节流延迟时间（毫秒），默认 1000ms
 * @returns 节流后的函数
 *
 * @example
 * const handleClick = useSimpleThrottle(() => {
 *   console.log('Clicked');
 * }, 1000);
 */
export function useSimpleThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 1000
): (...args: Parameters<T>) => void {
  const isThrottled = useRef<boolean>(false);

  return useCallback(
    (...args: Parameters<T>) => {
      if (isThrottled.current) {
        return;
      }

      callback(...args);
      isThrottled.current = true;

      setTimeout(() => {
        isThrottled.current = false;
      }, delay);
    },
    [callback, delay]
  );
}
