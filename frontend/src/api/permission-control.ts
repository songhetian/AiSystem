import { request } from "@/utils/request";

export interface Permission {
  id: string;
  name: string;
  code: string;
  module: string;
  type: "menu" | "button";
}

export interface BatchAssignPermissionsParams {
  roleIds: string[];
  permissionIds: string[];
  action: "assign" | "revoke";
}

export interface PermissionControlConfig {
  id: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  needControl: number;
  exceptionRoles?: string[];
}

export interface UpdatePermissionControlParams {
  resourceType: string;
  resourceId: string;
  resourceName: string;
  needControl: number;
  exceptionRoles?: string[];
}

export interface SystemConfig {
  id: string;
  configKey: string;
  configValue: string;
  configType: string;
  description?: string;
  value: any;
}

export const permissionControlApi = {
  /**
   * 批量分配/取消权限
   */
  batchAssignPermissions: (data: BatchAssignPermissionsParams) => {
    return request.post("/system/permission-control/batch-assign", data);
  },

  /**
   * 获取可分配权限
   */
  getAvailablePermissions: (roleId: string): Promise<Permission[]> => {
    return request.get(`/system/permission-control/available/${roleId}`);
  },

  /**
   * 获取已分配权限
   */
  getAssignedPermissions: (roleId: string): Promise<Permission[]> => {
    return request.get(`/system/permission-control/assigned/${roleId}`);
  },

  /**
   * 获取权限控制配置列表
   */
  getPermissionControlList: (params?: {
    resourceType?: string;
    needControl?: number;
  }): Promise<PermissionControlConfig[]> => {
    return request.get("/system/permission-control/list", { params });
  },

  /**
   * 更新权限控制配置
   */
  updatePermissionControl: (data: UpdatePermissionControlParams) => {
    return request.post("/system/permission-control/update", data);
  },

  /**
   * 批量更新权限控制配置
   */
  batchUpdatePermissionControl: (configs: UpdatePermissionControlParams[]) => {
    return request.post("/system/permission-control/batch-update", { configs });
  },

  /**
   * 获取系统配置
   */
  getSystemConfig: (key: string): Promise<SystemConfig> => {
    return request.get(`/system/permission-control/config/${key}`);
  },

  /**
   * 更新系统配置
   */
  updateSystemConfig: (data: {
    configKey: string;
    configValue: string;
    configType: string;
    description?: string;
  }) => {
    return request.post("/system/permission-control/config/update", data);
  },
};
