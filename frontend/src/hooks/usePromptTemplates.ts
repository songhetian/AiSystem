import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { qualityPromptApi } from '@/api/quality-prompt';
import type {
  PromptTemplate,
  SavePromptTemplateDto,
} from '@/api/quality-prompt';

/**
 * Prompt模板库管理 Hook
 * 使用React Query管理模板库数据
 *
 * @param params - 查询参数
 * @returns 模板库数据和操作方法
 *
 * @example
 * ```tsx
 * const {
 *   data,
 *   isLoading,
 *   categories,
 *   industries,
 *   create,
 *   update,
 *   remove,
 *   refetch
 * } = usePromptTemplates({ category: 'politeness' });
 * ```
 */
export function usePromptTemplates(params?: {
  category?: string;
  industry?: string;
  keyword?: string;
}) {
  const queryClient = useQueryClient();

  // 查询模板列表
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['prompt-templates', params],
    queryFn: () => qualityPromptApi.queryTemplates(params),
    staleTime: 10 * 60 * 1000, // 10分钟缓存 (模板变化较少)
    gcTime: 30 * 60 * 1000, // 30分钟垃圾回收
  });

  // 查询模板分类列表
  const {
    data: categories,
    isLoading: isCategoriesLoading,
  } = useQuery({
    queryKey: ['prompt-template-categories'],
    queryFn: () => qualityPromptApi.getTemplateCategories(),
    staleTime: 30 * 60 * 1000, // 30分钟缓存 (分类很少变化)
    gcTime: 60 * 60 * 1000, // 60分钟垃圾回收
  });

  // 查询模板行业列表
  const {
    data: industries,
    isLoading: isIndustriesLoading,
  } = useQuery({
    queryKey: ['prompt-template-industries'],
    queryFn: () => qualityPromptApi.getTemplateIndustries(),
    staleTime: 30 * 60 * 1000, // 30分钟缓存 (行业很少变化)
    gcTime: 60 * 60 * 1000, // 60分钟垃圾回收
  });

  // 创建自定义模板
  const createMutation = useMutation({
    mutationFn: (dto: SavePromptTemplateDto) =>
      qualityPromptApi.createTemplate(dto),
    onSuccess: () => {
      message.success('创建模板成功');
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '创建模板失败');
    },
  });

  // 更新自定义模板
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SavePromptTemplateDto }) =>
      qualityPromptApi.updateTemplate(id, data),
    onSuccess: () => {
      message.success('更新模板成功');
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '更新模板失败');
    },
  });

  // 删除自定义模板
  const deleteMutation = useMutation({
    mutationFn: (id: string) => qualityPromptApi.deleteTemplate(id),
    onSuccess: () => {
      message.success('删除模板成功');
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '删除模板失败');
    },
  });

  // 获取模板详情
  const getTemplateById = async (id: string) => {
    try {
      const template = await qualityPromptApi.getTemplateById(id);
      return template;
    } catch (error: any) {
      message.error(error?.message || '获取模板详情失败');
      throw error;
    }
  };

  return {
    // 数据
    data: data || [],
    categories: categories || [],
    industries: industries || [],

    // 状态
    isLoading: isLoading || isCategoriesLoading || isIndustriesLoading,
    error,

    // 操作方法
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    remove: deleteMutation.mutate,
    removeAsync: deleteMutation.mutateAsync,
    getById: getTemplateById,

    // 刷新
    refetch,

    // 操作状态
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
