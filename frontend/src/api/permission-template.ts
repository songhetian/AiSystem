import { request } from "@/utils/request";

export interface PermissionTemplate {
  id: string;
  template_name: string;
  template_type: "system" | "custom";
  description?: string;
  permission_config: {
    type?: "all" | "custom";
    menuIds?: string[];
    buttonIds?: string[];
  };
  category?: string;
  platform_id?: string;
  dept_id?: string;
  is_default: number;
  created_by?: string;
  create_time?: string;
  update_time?: string;
}

export interface CreatePermissionTemplateParams {
  templateName: string;
  templateType: "system" | "custom";
  description?: string;
  permissionConfig: {
    type?: "all" | "custom";
    menuIds?: string[];
    buttonIds?: string[];
  };
  category?: string;
  platformId?: string;
  deptId?: string;
}

export interface UpdatePermissionTemplateParams {
  id: string;
  templateName?: string;
  description?: string;
  permissionConfig?: {
    type?: "all" | "custom";
    menuIds?: string[];
    buttonIds?: string[];
  };
  category?: string;
}

export interface QueryPermissionTemplateParams {
  templateType?: string;
  category?: string;
  keyword?: string;
}

export interface ApplyTemplateParams {
  templateId: string;
  roleId: string;
  partial?: number;
  selectedPermissionIds?: string[];
}

export interface ExportTemplateParams {
  templateIds: string[];
  encrypted?: number;
}

export interface ImportTemplateParams {
  templates: any[];
  overwrite?: number;
}

export const permissionTemplateApi = {
  /**
   * 获取模板列表
   */
  getTemplateList: (
    params?: QueryPermissionTemplateParams,
  ): Promise<PermissionTemplate[]> => {
    return request.get("/system/permission-template/list", { params });
  },

  /**
   * 获取模板详情
   */
  getTemplateById: (id: string): Promise<PermissionTemplate> => {
    return request.get(`/system/permission-template/${id}`);
  },

  /**
   * 创建模板
   */
  createTemplate: (data: CreatePermissionTemplateParams) => {
    return request.post("/system/permission-template/create", data);
  },

  /**
   * 更新模板
   */
  updateTemplate: (data: UpdatePermissionTemplateParams) => {
    return request.post("/system/permission-template/update", data);
  },

  /**
   * 删除模板
   */
  deleteTemplate: (id: string) => {
    return request.delete(`/system/permission-template/${id}`);
  },

  /**
   * 应用模板到角色
   */
  applyTemplate: (data: ApplyTemplateParams) => {
    return request.post("/system/permission-template/apply", data);
  },

  /**
   * 导出模板
   */
  exportTemplates: (data: ExportTemplateParams) => {
    return request.post("/system/permission-template/export", data);
  },

  /**
   * 导入模板
   */
  importTemplates: (data: ImportTemplateParams) => {
    return request.post("/system/permission-template/import", data);
  },

  /**
   * 复制模板
   */
  copyTemplate: (id: string, newName: string) => {
    return request.post(`/system/permission-template/copy/${id}`, { newName });
  },
};
