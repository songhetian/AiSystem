import { useState, useEffect } from "react";

export interface UserPreferences {
  // 双栏布局宽度
  dragAssignLeftWidth?: number;
  dragAssignRightWidth?: number;

  // 权限分组方式
  permissionGroupBy?: "module" | "type" | "none";

  // 批量操作默认选项
  batchOperationDefault?: "assign" | "revoke";

  // 表格每页显示数量
  pageSize?: number;

  // 搜索历史
  searchHistory?: string[];

  // 筛选条件记忆
  lastFilters?: Record<string, any>;
}

const STORAGE_KEY = "user-preferences";
const MAX_SEARCH_HISTORY = 10;

/**
 * 用户偏好设置 Hook
 */
export const usePreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });

  // 保存到 localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }));
  };

  const addSearchHistory = (keyword: string) => {
    if (!keyword.trim()) return;

    setPreferences((prev) => {
      const history = prev.searchHistory || [];
      const newHistory = [
        keyword,
        ...history.filter((item) => item !== keyword),
      ].slice(0, MAX_SEARCH_HISTORY);

      return { ...prev, searchHistory: newHistory };
    });
  };

  const clearSearchHistory = () => {
    setPreferences((prev) => ({ ...prev, searchHistory: [] }));
  };

  const saveFilters = (key: string, filters: any) => {
    setPreferences((prev) => ({
      ...prev,
      lastFilters: {
        ...prev.lastFilters,
        [key]: filters,
      },
    }));
  };

  const getFilters = (key: string) => {
    return preferences.lastFilters?.[key];
  };

  const resetPreferences = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPreferences({});
  };

  return {
    preferences,
    updatePreferences,
    addSearchHistory,
    clearSearchHistory,
    saveFilters,
    getFilters,
    resetPreferences,
  };
};
