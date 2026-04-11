import { request } from "@/utils/request";

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
  listPlatforms: () => request.get<PlatformRecord[]>("/system/platforms"),
  createPlatform: (payload: any) => request.post("/system/platforms", payload),
  updatePlatform: (id: string, payload: any) =>
    request.patch(`/system/platforms/${id}`, payload),
  deletePlatform: (id: string) => request.delete(`/system/platforms/${id}`),
  batchUpdatePlatformStatus: (payload: { ids: string[]; status: number }) =>
    request.patch("/system/platforms/batch/status", payload),
  savePlatform: (payload: any) => request.post("/system/platforms", payload),

  listDepartments: () => request.get<DepartmentRecord[]>("/system/departments"),
  listDepartmentTree: () =>
    request.get<DepartmentRecord[]>("/system/departments/tree"),
  createDepartment: (payload: CreateDepartmentPayload) =>
    request.post("/system/departments", payload),
  updateDepartment: (id: string, payload: Record<string, unknown>) =>
    request.patch(`/system/departments/${id}`, payload),
  deleteDepartment: (id: string) => request.delete(`/system/departments/${id}`),
  batchUpdateDepartmentStatus: (payload: { ids: string[]; status: number }) =>
    request.patch("/system/departments/batch/status", payload),

  listShops: () => request.get<ShopRecord[]>("/system/shops"),
  createShop: (payload: any) => request.post("/system/shops", payload),
  updateShop: (id: string, payload: any) =>
    request.patch(`/system/shops/${id}`, payload),
  deleteShop: (id: string) => request.delete(`/system/shops/${id}`),
  batchUpdateShopStatus: (payload: { ids: string[]; status: number }) =>
    request.patch("/system/shops/batch/status", payload),

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
  markAllMessagesRead: () => request.post("/system/messages/read-all"),

  listOperationLogs: (params?: any) =>
    request.get<any>("/system/logs/operation", { params }),
  listLoginLogs: (params?: any) =>
    request.get<any>("/system/logs/login", { params }),

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

  listMenus: () => request.get<MenuRecord[]>("/system/menus"),
  listMenuTree: (roleId?: string) =>
    request.get<{ items: MenuTreeNode[] }>("/system/menus/tree", {
      params: roleId ? { role_id: roleId } : {},
    }),

  // 用户管理
  listUsers: () => request.get<UserRecord[]>("/system/users"),
  createUser: (payload: Partial<UserRecord>) =>
    request.post("/system/users", payload),
  updateUser: (id: string, payload: Partial<UserRecord>) =>
    request.patch(`/system/users/${id}`, payload),
  deleteUser: (id: string) => request.delete(`/system/users/${id}`),
  resetUserPassword: (id: string, payload: { password: string }) =>
    request.post(`/system/users/${id}/reset-password`, payload),
  batchUpdateUserStatus: (payload: { ids: string[]; status: number }) =>
    request.patch("/system/users/batch/status", payload),

  // 角色管理
  listRoles: () => request.get<RoleRecord[]>("/system/roles"),
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
};
