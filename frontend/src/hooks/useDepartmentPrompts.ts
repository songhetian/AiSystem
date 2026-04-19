import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { qualityPromptApi } from '@/api/quality-prompt';
import type {
  DepartmentPrompt,
  QueryPromptsParams,
  SaveDepartmentPromptDto,
} from '@/api/quality-prompt';

/**
 * 部门Prompt管理 Hook
 * 使用React Query管理部门Prompt数据,实现缓存和自动刷新
 *
 * @param params - 查询参数
 * @returns 部门Prompt数据和操作方法
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
 * } = useDepartmentPrompts({ dept_id: '456' });
 * ```
 */
export function useDepartmentPrompts(params?: QueryPromptsParams) {
  const queryClient = useQueryClient();

  // 查询部门Prompt列表
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['department-prompts', params],
    queryFn: () => qualityPromptApi.queryDepartmentPrompts(params),
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    gcTime: 10 * 60 * 1000, // 10分钟垃圾回收
  });

  // 创建部门Prompt
  const createMutation = useMutation({
    mutationFn: (dto: SaveDepartmentPromptDto) =>
      qualityPromptApi.createDepartmentPrompt(dto),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['department-prompts'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '创建失败');
    },
  });

  // 更新部门Prompt
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SaveDepartmentPromptDto }) =>
      qualityPromptApi.updateDepartmentPrompt(id, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['department-prompts'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '更新失败');
    },
  });

  // 删除部门Prompt
  const deleteMutation = useMutation({
    mutationFn: (id: string) => qualityPromptApi.deleteDepartmentPrompt(id),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['department-prompts'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '删除失败');
    },
  });

  // 启用部门Prompt
  const enableMutation = useMutation({
    mutationFn: (id: string) => qualityPromptApi.enableDepartmentPrompt(id),
    onSuccess: () => {
      message.success('启用成功');
      queryClient.invalidateQueries({ queryKey: ['department-prompts'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '启用失败');
    },
  });

  // 禁用部门Prompt
  const disableMutation = useMutation({
    mutationFn: (id: string) => qualityPromptApi.disableDepartmentPrompt(id),
    onSuccess: () => {
      message.success('禁用成功');
      queryClient.invalidateQueries({ queryKey: ['department-prompts'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '禁用失败');
    },
  });

  // 批量启用
  const batchEnableMutation = useMutation({
    mutationFn: (ids: string[]) =>
      qualityPromptApi.batchEnablePrompts({ ids }, 'department'),
    onSuccess: (result) => {
      message.success(`批量启用成功: ${result.success}条, 失败: ${result.failure}条`);
      queryClient.invalidateQueries({ queryKey: ['department-prompts'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '批量启用失败');
    },
  });

  // 批量禁用
  const batchDisableMutation = useMutation({
    mutationFn: (ids: string[]) =>
      qualityPromptApi.batchDisablePrompts({ ids }, 'department'),
    onSuccess: (result) => {
      message.success(`批量禁用成功: ${result.success}条, 失败: ${result.failure}条`);
      queryClient.invalidateQueries({ queryKey: ['department-prompts'] });
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
