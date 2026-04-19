import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { qualityPromptApi } from '@/api/quality-prompt';
import type {
  GlobalPrompt,
  QueryPromptsParams,
  SaveGlobalPromptDto,
} from '@/api/quality-prompt';

/**
 * 全局Prompt管理 Hook
 * 使用React Query管理全局Prompt数据,实现缓存和自动刷新
 *
 * @param params - 查询参数
 * @returns 全局Prompt数据和操作方法
 *
 * @example
 * ```tsx
 * const {
 *   data,
 *   isLoading,
 *   create,
 *   update,
 *   remove,
 *   enable,
 *   disable,
 *   refetch
 * } = useGlobalPrompts({ platform_id: '123' });
 * ```
 */
export function useGlobalPrompts(params?: QueryPromptsParams) {
  const queryClient = useQueryClient();

  // 查询全局Prompt列表
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['global-prompts', params],
    queryFn: () => qualityPromptApi.queryGlobalPrompts(params),
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    gcTime: 10 * 60 * 1000, // 10分钟垃圾回收
  });

  // 创建全局Prompt
  const createMutation = useMutation({
    mutationFn: (dto: SaveGlobalPromptDto) =>
      qualityPromptApi.createGlobalPrompt(dto),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['global-prompts'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '创建失败');
    },
  });

  // 更新全局Prompt
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SaveGlobalPromptDto }) =>
      qualityPromptApi.updateGlobalPrompt(id, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['global-prompts'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '更新失败');
    },
  });

  // 删除全局Prompt
  const deleteMutation = useMutation({
    mutationFn: (id: string) => qualityPromptApi.deleteGlobalPrompt(id),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['global-prompts'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '删除失败');
    },
  });

  // 启用全局Prompt
  const enableMutation = useMutation({
    mutationFn: (id: string) => qualityPromptApi.enableGlobalPrompt(id),
    onSuccess: () => {
      message.success('启用成功');
      queryClient.invalidateQueries({ queryKey: ['global-prompts'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '启用失败');
    },
  });

  // 禁用全局Prompt
  const disableMutation = useMutation({
    mutationFn: (id: string) => qualityPromptApi.disableGlobalPrompt(id),
    onSuccess: () => {
      message.success('禁用成功');
      queryClient.invalidateQueries({ queryKey: ['global-prompts'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '禁用失败');
    },
  });

  // 批量启用
  const batchEnableMutation = useMutation({
    mutationFn: (ids: string[]) =>
      qualityPromptApi.batchEnablePrompts({ ids }, 'global'),
    onSuccess: (result) => {
      message.success(`批量启用成功: ${result.success}条, 失败: ${result.failure}条`);
      queryClient.invalidateQueries({ queryKey: ['global-prompts'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '批量启用失败');
    },
  });

  // 批量禁用
  const batchDisableMutation = useMutation({
    mutationFn: (ids: string[]) =>
      qualityPromptApi.batchDisablePrompts({ ids }, 'global'),
    onSuccess: (result) => {
      message.success(`批量禁用成功: ${result.success}条, 失败: ${result.failure}条`);
      queryClient.invalidateQueries({ queryKey: ['global-prompts'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '批量禁用失败');
    },
  });

  return {
    // 数据
    data: data?.data || [],
    total: data?.total || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 20,

    // 状态
    isLoading,
    error,

    // 操作方法
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    remove: deleteMutation.mutate,
    removeAsync: deleteMutation.mutateAsync,
    enable: enableMutation.mutate,
    enableAsync: enableMutation.mutateAsync,
    disable: disableMutation.mutate,
    disableAsync: disableMutation.mutateAsync,
    batchEnable: batchEnableMutation.mutate,
    batchEnableAsync: batchEnableMutation.mutateAsync,
    batchDisable: batchDisableMutation.mutate,
    batchDisableAsync: batchDisableMutation.mutateAsync,

    // 刷新
    refetch,

    // 操作状态
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isEnabling: enableMutation.isPending,
    isDisabling: disableMutation.isPending,
    isBatchEnabling: batchEnableMutation.isPending,
    isBatchDisabling: batchDisableMutation.isPending,
  };
}
