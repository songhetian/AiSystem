import request from "@/utils/request";

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const unwrapPaginated = <T>(
  payload: T[] | PaginatedResponse<T>,
): T[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  return Array.isArray(payload?.data) ? payload.data : [];
};

export interface UserRecord {
  id: string;
  username: string;
  name: string;
  phone?: string;
  email?: string;
  status: number;
  [key: string]: any;
}

export interface PlatformRecord {
  id: string;
  name: string;
  code: string;
  status: number;
  [key: string]: any;
}

export interface DepartmentRecord {
  id: string;
  name: string;
  code: string;
  parent_id?: string | null;
  platform_id?: string;
  status: number;
  sort: number;
  children?: DepartmentRecord[];
  [key: string]: any;
}

export interface CreateDepartmentPayload {
  name: string;
  code: string;
  parent_id?: string | null;
  platform_id?: string | null;
  status?: number;
  sort?: number;
}

export interface ShopRecord {
  id: string;
  name: string;
  code: string;
  platform_id: string;
  department_id: string;
  status: number;
  [key: string]: any;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  service_type: string;
  api_key: string;
  api_secret?: string;
  endpoint?: string;
  platform_id: string;
  dept_id?: string | null;
  status: number;
  [key: string]: any;
}

export interface IntegrationRecord {
  id: string;
  source_name: string;
  api_endpoint: string;
  method: string;
  mapping_json: Record<string, string>;
  platform_id: string;
  status: number;
  [key: string]: any;
}

export interface MappingTemplateRecord {
  id: string;
  name: string;
  data_type: "order" | "product" | "customer";
  platform_id: string;
  parent_id?: string; // [NEW] 模版继承
  mapping_rules: Record<string, string>;
  cleaning_rules?: Record<string, string>;
  is_public: number;
  status: number;
  [key: string]: any;
}

export interface PlatformConfigRecord {
  id: string;
  platform_id: string;
  dept_id: string;
  shop_id?: string;
  template_id?: string;
  app_key?: string;
  app_secret?: string;
  api_endpoint?: string;
  is_master: number; // [NEW]
  status: number;
  [key: string]: any;
}

export interface MessageStats {
  unreadCount: number;
  totalCount?: number;
  approvalCount?: number;
  scheduleCount?: number;
  systemCount?: number;
  [key: string]: any;
}

export interface SystemMessageRecord {
  id: string;
  title: string;
  content: string;
  message_type: string;
  read_status: number;
  create_time: string;
  route?: string;
  payload?: {
    requestId?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface SystemMessagePayload {
  requestId?: string;
  [key: string]: any;
}

export interface RoleRecord {
  id: string;
  name: string;
  code: string;
  status: number;
  [key: string]: any;
}

export interface ButtonRecord {
  id: string;
  button_name: string;
  button_code: string;
  menu_id?: string;
  status: number;
  menu?: {
    id: string;
    menu_name: string;
  };
  [key: string]: any;
}

export interface MenuRecord {
  id: string;
  menu_name: string;
  [key: string]: any;
}

export interface MenuTreeNode {
  id: string;
  menu_name: string;
  children?: MenuTreeNode[];
  [key: string]: any;
}

export const systemApi = {
  listPlatforms: () =>
    request
      .get<PlatformRecord[] | PaginatedResponse<PlatformRecord>>(
        "/system/platforms",
      )
      .then(unwrapPaginated),
  createPlatform: (payload: any) => request.post("/system/platforms", payload),
  updatePlatform: (id: string, payload: any) =>
    request.patch(`/system/platforms/${id}`, payload),
  deletePlatform: (id: string) => request.delete(`/system/platforms/${id}`),
  batchUpdatePlatformStatus: (payload: { ids: string[]; status: number }) =>
    request.patch("/system/platforms/batch/status", payload),
  savePlatform: (payload: any) => request.post("/system/platforms", payload),

  listDepartments: () =>
    request
      .get<DepartmentRecord[] | PaginatedResponse<DepartmentRecord>>(
        "/system/departments",
      )
      .then(unwrapPaginated),
  getPublicDepartments: () =>
    request.get<{ code: number; message: string; data: DepartmentRecord[] }>(
      "/system/departments/public",
    ),
  listDepartmentTree: () =>
    request.get<DepartmentRecord[]>("/system/departments/tree"),
  createDepartment: (payload: CreateDepartmentPayload) =>
    request.post("/system/departments", payload),
  updateDepartment: (id: string, payload: Record<string, unknown>) =>
    request.patch(`/system/departments/${id}`, payload),
  deleteDepartment: (id: string) => request.delete(`/system/departments/${id}`),
  batchUpdateDepartmentStatus: (payload: { ids: string[]; status: number }) =>
    request.patch("/system/departments/batch/status", payload),
  updateDepartmentSort: (
    items: Array<{ id: string; parent_id?: string | null; sort: number }>,
  ) => request.post("/system/departments/sort", { items }),

  listShops: () =>
    request
      .get<ShopRecord[] | PaginatedResponse<ShopRecord>>("/system/shops")
      .then(unwrapPaginated),
  createShop: (payload: any) => request.post("/system/shops", payload),
  updateShop: (id: string, payload: any) =>
    request.patch(`/system/shops/${id}`, payload),
  deleteShop: (id: string) => request.delete(`/system/shops/${id}`),
  batchUpdateShopStatus: (payload: { ids: string[]; status: number }) =>
    request.patch("/system/shops/batch/status", payload),
  updateShopSort: (items: Array<{ id: string; sort: number }>) =>
    request.post("/system/shops/sort", { items }),

  listApiKeys: () => request.get<ApiKeyRecord[]>("/system/api-keys"),
  saveApiKey: (payload: Partial<ApiKeyRecord>) =>
    request.post("/system/api-keys", payload),
  updateApiKey: (id: string, payload: Partial<ApiKeyRecord>) =>
    request.patch(`/system/api-keys/${id}`, payload),
  deleteApiKey: (id: string) => request.delete(`/system/api-keys/${id}`),

  listIntegrations: () =>
    request.get<IntegrationRecord[]>("/system/integrations"),
  createIntegration: (payload: Partial<IntegrationRecord>) =>
    request.post("/system/integrations", payload),
  updateIntegration: (id: string, payload: Partial<IntegrationRecord>) =>
    request.patch(`/system/integrations/${id}`, payload),
  deleteIntegration: (id: string) =>
    request.delete(`/system/integrations/${id}`),

  listApis: () => request.get<any[]>("/system/apis"),
  getApiStats: (id: string) => request.get<any>(`/system/apis/${id}/stats`),
  createApi: (payload: any) => request.post("/system/apis", payload),
  updateApi: (id: string, payload: any) =>
    request.patch(`/system/apis/${id}`, payload),
  deleteApi: (id: string) => request.delete(`/system/apis/${id}`),

  listMessages: (params?: any) =>
    request.get<SystemMessageRecord[]>("/system/messages", { params }),
  messageStats: () => request.get<MessageStats>("/system/messages/stats"),
  markMessageRead: (id: string) => request.patch(`/system/messages/${id}/read`),
  toggleMessageFavorite: (id: string) =>
    request.patch(`/system/messages/${id}/favorite`),
  moveToTrash: (ids: string[]) =>
    request.post("/system/messages/trash", { ids }),
  restoreFromTrash: (ids: string[]) =>
    request.post("/system/messages/restore", { ids }),
  purgeTrash: () => request.delete("/system/messages/trash"),
  markAllMessagesRead: () => request.patch("/system/messages/read-all"),

  // 消息模板管理
  listMessageTemplates: (params?: any) =>
    request.get("/system/messages/templates", { params }),
  saveMessageTemplate: (data: any) =>
    request.post("/system/messages/templates", data),
  sendTestMessage: (data: any) =>
    request.post("/system/messages/send-test", data),

  // ✅ 新增：消息设置（PRD 2.3.3）
  getMessageSettings: () =>
    request.get<{
      channels: string[];
      dnd_enabled: boolean;
      dnd_start: string;
      dnd_end: string;
      dnd_allow_urgent: boolean;
    }>("/system/messages/settings"),
  saveMessageSettings: (data: any) =>
    request.post("/system/messages/settings", data),

  listOperationLogs: (params?: any) =>
    request.get<any>("/system/logs/operation", { params }),
  listLoginLogs: (params?: any) =>
    request.get<any>("/system/logs/login", { params }),

  exportLoginLogs: (params?: any) =>
    request.get<any>("/system/logs/login/export", {
      params,
      responseType: "blob",
    }),

  exportOperationLogs: (params?: any) =>
    request.get<any>("/system/logs/operation/export", {
      params,
      responseType: "blob",
    }),

  updateProfile: (payload: any) =>
    request.patch("/system/users/profile", payload),
  updateProfilePassword: (payload: any) =>
    request.post("/system/users/profile/password", payload),

  listButtons: () => request.get<ButtonRecord[]>("/system/buttons"),
  createButton: (payload: Partial<ButtonRecord>) =>
    request.post("/system/buttons", payload),
  updateButton: (id: string, payload: Partial<ButtonRecord>) =>
    request.patch(`/system/buttons/${id}`, payload),
  deleteButton: (id: string) => request.delete(`/system/buttons/${id}`),

  listMenus: () =>
    request
      .get<MenuRecord[] | PaginatedResponse<MenuRecord>>("/system/menus")
      .then(unwrapPaginated),
  listMenuTree: (roleId?: string) =>
    request.get<{ items: MenuTreeNode[] }>("/system/menus/tree", {
      params: roleId ? { role_id: roleId } : {},
    }),
  createMenu: (payload: Partial<MenuRecord>) =>
    request.post("/system/menus", payload),
  updateMenu: (id: string, payload: Partial<MenuRecord>) =>
    request.patch(`/system/menus/${id}`, payload),
  deleteMenu: (id: string) => request.delete(`/system/menus/${id}`),
  updateMenuSort: (
    items: Array<{ id: string; parent_id?: string | null; sort: number }>,
  ) => request.post("/system/menus/sort", { items }),

  // 用户管理
  listUsers: () =>
    request
      .get<UserRecord[] | PaginatedResponse<UserRecord>>("/system/users")
      .then(unwrapPaginated),
  createUser: (payload: Partial<UserRecord>) =>
    request.post("/system/users", payload),
  updateUser: (id: string, payload: Partial<UserRecord>) =>
    request.patch(`/system/users/${id}`, payload),
  deleteUser: (id: string) => request.delete(`/system/users/${id}`),
  resetUserPassword: (id: string, payload: { password: string }) =>
    request.post(`/system/users/${id}/reset-password`, payload),
  batchResetPassword: (payload: { ids: string[]; password: string }) =>
    request.post("/system/users/batch/reset-password", payload),
  batchUpdateUserStatus: (payload: { ids: string[]; status: number }) =>
    request.patch("/system/users/batch/status", payload),
  batchAssignRoles: (payload: { ids: string[]; role_ids: string[] }) =>
    request.post("/system/users/batch/assign-roles", payload),

  // 角色管理
  listRoles: () =>
    request
      .get<RoleRecord[] | PaginatedResponse<RoleRecord>>("/system/roles")
      .then(unwrapPaginated),
  createRole: (payload: Partial<RoleRecord>) =>
    request.post("/system/roles", payload),
  updateRole: (id: string, payload: Partial<RoleRecord>) =>
    request.patch(`/system/roles/${id}`, payload),
  deleteRole: (id: string) => request.delete(`/system/roles/${id}`),
  copyRole: (id: string, payload: { name: string; code: string }) =>
    request.post(`/system/roles/${id}/copy`, payload),

  // 权限管理
  assignUserRoles: (payload: { user_id: string; role_ids: string[] }) =>
    request.post("/system/permissions/user-roles", payload),
  getUserRoles: (userId: string) =>
    request.get(`/system/permissions/user-roles/${userId}`),
  assignRolePermissions: (payload: {
    role_id: string;
    menu_ids: string[];
    button_ids: string[];
  }) => request.post("/system/permissions/role-resources", payload),
  getRolePermissions: (roleId: string) =>
    request.get(`/system/permissions/role-resources/${roleId}`),

  // 数据映射与集成 (V2.1/V2.2)
  listMappingTemplates: (platform_id?: string) =>
    request.get<MappingTemplateRecord[]>("/system/mapping/templates", {
      params: { platform_id },
    }),
  saveMappingTemplate: (payload: Partial<MappingTemplateRecord>) =>
    request.post("/system/mapping/templates", payload),
  listPlatformConfigs: (dept_id?: string) =>
    request.get<PlatformConfigRecord[]>("/system/mapping/configs", {
      params: { dept_id },
    }),
  savePlatformConfig: (payload: Partial<PlatformConfigRecord>) =>
    request.post("/system/mapping/configs", payload),
  listIntegrationLogs: (params?: any) =>
    request.get<any[]>("/system/mapping/logs", { params }),
  getHealthReport: (params: {
    platform_id: string;
    dept_id: string;
    shop_id?: string;
  }) => request.get<any>("/system/mapping/health", { params }),

  // ✅ 新增：定时脚本管理（数据映射.md 5）
  listIntegrationScripts: () => request.get<any[]>("/system/mapping/scripts"),
  saveIntegrationScript: (payload: any) =>
    request.post("/system/mapping/scripts", payload),
  toggleIntegrationScript: (id: string, enabled: boolean) =>
    request.patch(`/system/mapping/scripts/${id}/toggle`, { enabled }),
  triggerIntegrationScript: (id: string) =>
    request.post(`/system/mapping/scripts/${id}/trigger`, {}),
  deleteIntegrationScript: (id: string) =>
    request.delete(`/system/mapping/scripts/${id}`),

  // ✅ 新增：消息联动规则（消息功能.md 2.5）
  listMessageLinkageRules: () =>
    request.get<any[]>("/system/messages/linkage-rules"),
  saveMessageLinkageRule: (payload: any) =>
    request.post("/system/messages/linkage-rules", payload),
  toggleMessageLinkageRule: (id: string, enabled: boolean) =>
    request.patch(`/system/messages/linkage-rules/${id}/toggle`, { enabled }),
  deleteMessageLinkageRule: (id: string) =>
    request.delete(`/system/messages/linkage-rules/${id}`),
};
