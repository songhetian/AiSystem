import request from '@/utils/request';

// ==================== 类型定义 ====================

/**
 * 全局Prompt
 */
export interface GlobalPrompt {
  id: string;
  name: string;
  content: string;
  applicable_scenarios: string;
  enabled: number;
  version: number;
  platform_id: string;
  platform_name?: string;
  sort: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

/**
 * 部门Prompt
 */
export interface DepartmentPrompt {
  id: string;
  name: string;
  content: string;
  applicable_scenarios: string;
  enabled: number;
  version: number;
  platform_id: string;
  platform_name?: string;
  dept_id: string;
  dept_name?: string;
  parent_global_prompt_id?: string;
  parent_global_prompt_name?: string;
  sort: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

/**
 * Prompt模板
 */
export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  industry: string;
  description?: string;
  is_builtin: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

/**
 * 版本记录
 */
export interface VersionRecord {
  id: string;
  prompt_id: string;
  prompt_type: 'global' | 'department';
  version: number;
  content: string;
  applicable_scenarios: string;
  change_description?: string;
  modified_by: string;
  modified_by_name?: string;
  modified_at: string;
  [key: string]: any;
}

/**
 * 审计日志
 */
export interface AuditLog {
  id: string;
  operation_type: string;
  operator_id: string;
  operator_name: string;
  timestamp: string;
  prompt_id: string;
  prompt_name: string;
  prompt_type: 'global' | 'department';
  before_content?: string;
  after_content?: string;
  reason?: string;
  ip_address?: string;
  [key: string]: any;
}

/**
 * 查询参数
 */
export interface QueryPromptsParams {
  keyword?: string;
  enabled?: number;
  platform_id?: string;
  dept_id?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 保存全局Prompt DTO
 */
export interface SaveGlobalPromptDto {
  name: string;
  content: string;
  applicable_scenarios: string;
  enabled?: number;
  platform_id: string;
  sort?: number;
}

/**
 * 保存部门Prompt DTO
 */
export interface SaveDepartmentPromptDto {
  name: string;
  content: string;
  applicable_scenarios: string;
  enabled?: number;
  platform_id: string;
  dept_id: string;
  parent_global_prompt_id?: string;
  sort?: number;
}

/**
 * 保存模板 DTO
 */
export interface SavePromptTemplateDto {
  name: string;
  content: string;
  category: string;
  industry: string;
  description?: string;
}

/**
 * 批量操作 DTO
 */
export interface BatchPromptOperationDto {
  ids: string[];
}

/**
 * 预览Prompt DTO
 */
export interface PreviewPromptDto {
  content: string;
  test_conversation: string;
}

/**
 * 预览结果
 */
export interface PreviewResult {
  score: number;
  violations: Array<{
    source: 'global' | 'department';
    rule: string;
    deduction: number;
    promptId: string;
    promptName: string;
  }>;
  suggestions: string[];
  summary: {
    totalViolations: number;
    totalDeduction: number;
    passed: boolean;
  };
}

/**
 * 查询审计日志参数
 */
export interface QueryAuditLogsParams {
  operator_id?: string;
  operation_type?: string;
  prompt_type?: 'global' | 'department';
  start_date?: string;
  end_date?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 版本比较结果
 */
export interface VersionDiff {
  fromVersion: number;
  toVersion: number;
  changes: Array<{
    field: string;
    oldValue: string;
    newValue: string;
  }>;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ==================== API 客户端 ====================

/**
 * 质检Prompt API客户端
 * 封装所有质检Prompt相关的API调用
 */
export const qualityPromptApi = {
  // ==================== 全局Prompt管理 (11个端点) ====================

  /**
   * 查询全局Prompt列表
   */
  queryGlobalPrompts: (params?: QueryPromptsParams) =>
    request.get<PaginatedResponse<GlobalPrompt>>('/quality-prompts/global', { params }),

  /**
   * 获取全局Prompt详情
   */
  getGlobalPromptById: (id: string) =>
    request.get<GlobalPrompt>(`/quality-prompts/global/${id}`),

  /**
   * 创建全局Prompt
   */
  createGlobalPrompt: (data: SaveGlobalPromptDto) =>
    request.post<GlobalPrompt>('/quality-prompts/global', data),

  /**
   * 更新全局Prompt
   */
  updateGlobalPrompt: (id: string, data: SaveGlobalPromptDto) =>
    request.put<GlobalPrompt>(`/quality-prompts/global/${id}`, data),

  /**
   * 删除全局Prompt
   */
  deleteGlobalPrompt: (id: string) =>
    request.delete<void>(`/quality-prompts/global/${id}`),

  /**
   * 启用全局Prompt
   */
  enableGlobalPrompt: (id: string) =>
    request.patch<GlobalPrompt>(`/quality-prompts/global/${id}/enable`),

  /**
   * 禁用全局Prompt
   */
  disableGlobalPrompt: (id: string) =>
    request.patch<GlobalPrompt>(`/quality-prompts/global/${id}/disable`),

  /**
   * 获取全局Prompt版本历史
   */
  getGlobalPromptVersions: (id: string) =>
    request.get<VersionRecord[]>(`/quality-prompts/global/${id}/versions`),

  /**
   * 回滚全局Prompt到指定版本
   */
  rollbackGlobalPrompt: (id: string, version: number) =>
    request.post<GlobalPrompt>(`/quality-prompts/global/${id}/rollback`, { version }),

  /**
   * 导出全局Prompt
   */
  exportGlobalPrompts: (params?: QueryPromptsParams) =>
    request.get<Blob>('/quality-prompts/global/export', {
      params,
      responseType: 'blob',
    }),

  /**
   * 导入全局Prompt
   */
  importGlobalPrompts: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request.post<{ success: number; failure: number; errors: string[] }>(
      '/quality-prompts/global/import',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
  },

  // ==================== 部门Prompt管理 (11个端点) ====================

  /**
   * 查询部门Prompt列表
   */
  queryDepartmentPrompts: (params?: QueryPromptsParams) =>
    request.get<PaginatedResponse<DepartmentPrompt>>('/quality-prompts/department', { params }),

  /**
   * 获取部门Prompt详情
   */
  getDepartmentPromptById: (id: string) =>
    request.get<DepartmentPrompt>(`/quality-prompts/department/${id}`),

  /**
   * 创建部门Prompt
   */
  createDepartmentPrompt: (data: SaveDepartmentPromptDto) =>
    request.post<DepartmentPrompt>('/quality-prompts/department', data),

  /**
   * 更新部门Prompt
   */
  updateDepartmentPrompt: (id: string, data: SaveDepartmentPromptDto) =>
    request.put<DepartmentPrompt>(`/quality-prompts/department/${id}`, data),

  /**
   * 删除部门Prompt
   */
  deleteDepartmentPrompt: (id: string) =>
    request.delete<void>(`/quality-prompts/department/${id}`),

  /**
   * 启用部门Prompt
   */
  enableDepartmentPrompt: (id: string) =>
    request.patch<DepartmentPrompt>(`/quality-prompts/department/${id}/enable`),

  /**
   * 禁用部门Prompt
   */
  disableDepartmentPrompt: (id: string) =>
    request.patch<DepartmentPrompt>(`/quality-prompts/department/${id}/disable`),

  /**
   * 获取部门Prompt版本历史
   */
  getDepartmentPromptVersions: (id: string) =>
    request.get<VersionRecord[]>(`/quality-prompts/department/${id}/versions`),

  /**
   * 回滚部门Prompt到指定版本
   */
  rollbackDepartmentPrompt: (id: string, version: number) =>
    request.post<DepartmentPrompt>(`/quality-prompts/department/${id}/rollback`, { version }),

  /**
   * 导出部门Prompt
   */
  exportDepartmentPrompts: (params?: QueryPromptsParams) =>
    request.get<Blob>('/quality-prompts/department/export', {
      params,
      responseType: 'blob',
    }),

  /**
   * 导入部门Prompt
   */
  importDepartmentPrompts: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request.post<{ success: number; failure: number; errors: string[] }>(
      '/quality-prompts/department/import',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
  },

  // ==================== 模板库管理 (7个端点) ====================

  /**
   * 查询模板列表
   */
  queryTemplates: (params?: { category?: string; industry?: string; keyword?: string }) =>
    request.get<PromptTemplate[]>('/quality-prompts/templates', { params }),

  /**
   * 获取模板详情
   */
  getTemplateById: (id: string) =>
    request.get<PromptTemplate>(`/quality-prompts/templates/${id}`),

  /**
   * 创建自定义模板
   */
  createTemplate: (data: SavePromptTemplateDto) =>
    request.post<PromptTemplate>('/quality-prompts/templates', data),

  /**
   * 更新自定义模板
   */
  updateTemplate: (id: string, data: SavePromptTemplateDto) =>
    request.put<PromptTemplate>(`/quality-prompts/templates/${id}`, data),

  /**
   * 删除自定义模板
   */
  deleteTemplate: (id: string) =>
    request.delete<void>(`/quality-prompts/templates/${id}`),

  /**
   * 获取模板分类列表
   */
  getTemplateCategories: () =>
    request.get<string[]>('/quality-prompts/templates/categories'),

  /**
   * 获取模板行业列表
   */
  getTemplateIndustries: () =>
    request.get<string[]>('/quality-prompts/templates/industries'),

  // ==================== 版本管理 (3个端点) ====================

  /**
   * 获取Prompt版本历史（通用）
   */
  getVersionHistory: (id: string, type: 'global' | 'department') =>
    request.get<VersionRecord[]>(`/quality-prompts/${id}/versions`, {
      params: { type },
    }),

  /**
   * 比较两个版本的差异
   */
  compareVersions: (
    id: string,
    versionId: string,
    fromVersion: number,
    toVersion: number,
    type: 'global' | 'department',
  ) =>
    request.get<VersionDiff>(
      `/quality-prompts/${id}/versions/${versionId}/diff`,
      {
        params: { fromVersion, toVersion, type },
      },
    ),

  /**
   * 回滚到指定版本（通用）
   */
  rollbackToVersion: (id: string, versionId: string, type: 'global' | 'department') =>
    request.post<GlobalPrompt | DepartmentPrompt>(
      `/quality-prompts/${id}/versions/${versionId}/rollback`,
      null,
      {
        params: { type },
      },
    ),

  // ==================== 批量操作 (2个端点) ====================

  /**
   * 批量启用Prompt
   */
  batchEnablePrompts: (data: BatchPromptOperationDto, type: 'global' | 'department') =>
    request.post<{ success: number; failure: number }>(
      '/quality-prompts/batch-enable',
      data,
      {
        params: { type },
      },
    ),

  /**
   * 批量禁用Prompt
   */
  batchDisablePrompts: (data: BatchPromptOperationDto, type: 'global' | 'department') =>
    request.post<{ success: number; failure: number }>(
      '/quality-prompts/batch-disable',
      data,
      {
        params: { type },
      },
    ),

  // ==================== 预览功能 (1个端点) ====================

  /**
   * 预览Prompt质检效果
   */
  previewPrompt: (data: PreviewPromptDto) =>
    request.post<PreviewResult>('/quality-prompts/preview', data),

  // ==================== 审计日志 (2个端点) ====================

  /**
   * 查询审计日志
   */
  queryAuditLogs: (params?: QueryAuditLogsParams) =>
    request.get<PaginatedResponse<AuditLog>>('/quality-prompts/audit-logs', { params }),

  /**
   * 导出审计日志
   */
  exportAuditLogs: (params?: QueryAuditLogsParams) =>
    request.get<Blob>('/quality-prompts/audit-logs/export', {
      params,
      responseType: 'blob',
    }),
};

export default qualityPromptApi;
