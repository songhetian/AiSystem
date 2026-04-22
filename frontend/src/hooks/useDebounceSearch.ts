import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

interface UseDebounceSearchOptions<T> {
  searchFn: (query: string) => Promise<T>;
  delay?: number;
  minLength?: number;
  enabled?: boolean;
}

/**
 * 防抖搜索 Hook
 * 用于优化搜索输入性能,避免频繁请求
 * 
 * @example
 * const { searchTerm, setSearchTerm, data, isLoading } = useDebounceSearch({
 *   searchFn: (query) => api.search(query),
 *   delay: 300,
 *   minLength: 2,
 * });
 */
export function useDebounceSearch<T>({
  searchFn,
  delay = 300,
  minLength = 2,
  enabled = true,
}: UseDebounceSearchOptions<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  // 防抖处理
  useEffect(() => {
    if (!enabled) return;

    if (searchTerm.length >= minLength) {
      const timer = setTimeout(() => {
        setDebouncedTerm(searchTerm);
      }, delay);

      return () => clearTimeout(timer);
    } else {
      setDebouncedTerm('');
    }
  }, [searchTerm, delay, minLength, enabled]);

  // 查询数据
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['search', debouncedTerm],
    queryFn: () => searchFn(debouncedTerm),
    enabled: enabled && debouncedTerm.length >= minLength,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    gcTime: 10 * 60 * 1000, // 10分钟后清理
  });

  // 清空搜索
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedTerm('');
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    debouncedTerm,
    data,
    isLoading,
    error,
    hasQuery: debouncedTerm.length >= minLength,
    clearSearch,
    refetch,
  };
}

export default useDebounceSearch;
