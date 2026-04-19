import { useEffect, useRef, useState } from 'react';

/**
 * 自动保存配置
 */
export interface AutoSaveOptions<T> {
  /**
   * 存储键名
   */
  key: string;

  /**
   * 自动保存间隔（毫秒），默认 30 秒
   */
  interval?: number;

  /**
   * 是否启用自动保存，默认 true
   */
  enabled?: boolean;

  /**
   * 保存前的数据验证函数
   */
  validate?: (data: T) => boolean;

  /**
   * 保存成功回调
   */
  onSave?: (data: T) => void;

  /**
   * 保存失败回调
   */
  onError?: (error: Error) => void;
}

/**
 * 通用自动保存 Hook
 * 实现表单或任意数据的自动保存逻辑
 *
 * @param data - 需要自动保存的数据
 * @param options - 自动保存配置
 * @returns 自动保存状态和控制方法
 *
 * @example
 * ```tsx
 * const [formData, setFormData] = useState({ name: '', content: '' });
 *
 * const {
 *   lastSavedAt,
 *   isSaving,
 *   clearDraft,
 *   restoreDraft,
 *   saveDraft
 * } = useAutoSave(formData, {
 *   key: 'my-form-draft',
 *   interval: 30000,
 *   validate: (data) => data.name.length > 0,
 *   onSave: (data) => console.log('Saved:', data)
 * });
 * ```
 */
export function useAutoSave<T = any>(
  data: T,
  options: AutoSaveOptions<T>,
) {
  const {
    key,
    interval = 30000,
    enabled = true,
    validate,
    onSave,
    onError,
  } = options;

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const dataRef = useRef<T>(data);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 更新数据引用
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // 保存草稿到 localStorage
  const saveDraft = (draftData?: T) => {
    const dataToSave = draftData ?? dataRef.current;

    // 验证数据
    if (validate && !validate(dataToSave)) {
      return false;
    }

    try {
      setIsSaving(true);
      const storageKey = `auto-save-${key}`;
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      const now = new Date();
      setLastSavedAt(now);

      // 保存时间戳
      localStorage.setItem(`${storageKey}-timestamp`, now.toISOString());

      onSave?.(dataToSave);
      return true;
    } catch (error) {
      console.error('[AutoSave] 保存失败:', error);
      onError?.(error as Error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // 从 localStorage 恢复草稿
  const restoreDraft = (): T | null => {
    try {
      const storageKey = `auto-save-${key}`;
      const savedData = localStorage.getItem(storageKey);
      const savedTimestamp = localStorage.getItem(`${storageKey}-timestamp`);

      if (savedData) {
        const parsedData = JSON.parse(savedData) as T;

        if (savedTimestamp) {
          setLastSavedAt(new Date(savedTimestamp));
        }

        return parsedData;
      }

      return null;
    } catch (error) {
      console.error('[AutoSave] 恢复草稿失败:', error);
      onError?.(error as Error);
      return null;
    }
  };

  // 清除草稿
  const clearDraft = () => {
    try {
      const storageKey = `auto-save-${key}`;
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}-timestamp`);
      setLastSavedAt(null);
      return true;
    } catch (error) {
      console.error('[AutoSave] 清除草稿失败:', error);
      onError?.(error as Error);
      return false;
    }
  };

  // 检查是否有草稿
  const hasDraft = (): boolean => {
    const storageKey = `auto-save-${key}`;
    return localStorage.getItem(storageKey) !== null;
  };

  // 自动保存定时器
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // 清除旧定时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // 设置新定时器
    timerRef.current = setInterval(() => {
      saveDraft();
    }, interval);

    // 清理函数
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, interval, key]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    /**
     * 最后保存时间
     */
    lastSavedAt,

    /**
     * 是否正在保存
     */
    isSaving,

    /**
     * 手动保存草稿
     */
    saveDraft,

    /**
     * 恢复草稿
     */
    restoreDraft,

    /**
     * 清除草稿
     */
    clearDraft,

    /**
     * 检查是否有草稿
     */
    hasDraft,
  };
}
