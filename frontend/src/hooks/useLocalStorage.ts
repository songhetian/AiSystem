import { useState, useEffect, useCallback } from "react";

/**
 * LocalStorage Hook
 * 支持自动序列化/反序列化
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // 从 localStorage 读取初始值
  const readValue = useCallback((): T => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // 保存到 localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue],
  );

  // 删除 localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [initialValue, key]);

  // 监听其他标签页的变化
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Error parsing localStorage key "${key}":`, error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue, removeValue];
}

/**
 * 操作状态记忆管理器
 */
export class StateMemoryManager {
  private static readonly PREFIX = "state_memory_";

  /**
   * 保存状态
   */
  static save<T>(key: string, state: T): void {
    try {
      localStorage.setItem(
        `${this.PREFIX}${key}`,
        JSON.stringify({
          data: state,
          timestamp: Date.now(),
        }),
      );
    } catch (error) {
      console.error("Failed to save state:", error);
    }
  }

  /**
   * 读取状态
   */
  static load<T>(key: string, maxAge?: number): T | null {
    try {
      const stored = localStorage.getItem(`${this.PREFIX}${key}`);
      if (!stored) return null;

      const { data, timestamp } = JSON.parse(stored);

      // 检查是否过期
      if (maxAge && Date.now() - timestamp > maxAge) {
        this.remove(key);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Failed to load state:", error);
      return null;
    }
  }

  /**
   * 删除状态
   */
  static remove(key: string): void {
    try {
      localStorage.removeItem(`${this.PREFIX}${key}`);
    } catch (error) {
      console.error("Failed to remove state:", error);
    }
  }

  /**
   * 清除所有状态
   */
  static clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error("Failed to clear states:", error);
    }
  }
}
