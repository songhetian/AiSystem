import { request } from '@/utils/request';

export interface CreateUserPayload {
  username: string;
  password: string;
  name: string;
  phone?: string;
  email?: string;
}

export interface CreateRolePayload {
  role_name: string;
  role_code: string;
  description?: string;
}

export interface CreateMenuPayload {
  menu_name: string;
  menu_code: string;
  route?: string;
  type: number;
  sort?: number;
}

export interface CreateApiPayload {
  api_path: string;
  request_method: string;
  api_name: string;
  role_ids: string[];
}

export interface CreateButtonPayload {
  button_name: string;
  button_code: string;
  menu_id: string;
  status: number;
}

export interface CreatePlatformPayload {
  name: string;
  code: string;
  description?: string;
  status?: number;
  owner_id?: string;
}

export interface CreateDepartmentPayload {
  name: string;
  code: string;
  parent_id?: string;
  sort?: number;
  status?: number;
  platform_id?: string;
  owner_id?: string;
}

export interface CreateShopPayload {
  name: string;
  code: string;
  type?: number;
  address?: string;
  phone?: string;
  description?: string;
  platform_id: string;
  department_id: string;
  owner_id?: string;
  status?: number;
}

export interface QueryLogsPayload {
  keyword?: string;
  username?: string;
  start_date?: string;
  end_date?: string;
  status?: number;
}

export interface QueryMessagesPayload {
  keyword?: string;
  read_status?: number;
}

export interface MessageStats {
  unreadCount: number;
}

export interface SystemMessagePayload {
  requestId?: string;
  requestNo?: string;
  bizType?: string;
  bizId?: string;
  bizNo?: string;
  comment?: string;
  changeId?: string;
  changeNo?: string;
  changeDate?: string;
  leaveId?: string;
  leaveNo?: string;
  leaveType?: string;
  startTime?: string;
  endTime?: string;
  employeeId?: string;
  employeeName?: string;
  beforeShiftName?: string | null;
  afterShiftName?: string | null;
  affectedSchedules?: number;
  affectedRecords?: number;
  [key: string]: unknown;
}

export interface SystemMessageRecord {
  id: string;
  title: string;
  content: string;
  message_type: string;
  route?: string;
  read_status: number;
  read_time?: string;
  create_time: string;
  sender_name?: string;
  payload?: SystemMessagePayload;
}

export const systemApi = {
  listUsers: () => request.get('/system/users'),
  createUser: (payload: CreateUserPayload) => request.post('/system/users', payload),
  updateUser: (id: string, payload: Record<string, unknown>) => request.patch(`/system/users/${id}`, payload),
  deleteUser: (id: string) => request.delete(`/system/users/${id}`),
  resetUserPassword: (id: string, payload?: { password?: string }) => request.patch(`/system/users/${id}/reset-password`, payload ?? {}),
  batchUpdateUserStatus: (payload: { ids: string[]; status: number }) => request.patch('/system/users/batch/status', payload),
  listRoles: () => request.get('/system/roles'),
  createRole: (payload: CreateRolePayload) => request.post('/system/roles', payload),
  updateRole: (id: string, payload: Record<string, unknown>) => request.patch(`/system/roles/${id}`, payload),
  deleteRole: (id: string) => request.delete(`/system/roles/${id}`),
  copyRole: (id: string, payload?: { role_name?: string; role_code?: string }) => request.post(`/system/roles/${id}/copy`, payload ?? {}),
  listMenus: () => request.get('/system/menus'),
  listMenuTree: (roleId?: string) => request.get(`/system/menus/tree${roleId ? `?role_id=${roleId}` : ''}`),
  createMenu: (payload: CreateMenuPayload) => request.post('/system/menus', payload),
  updateMenu: (id: string, payload: Record<string, unknown>) => request.patch(`/system/menus/${id}`, payload),
  sortMenus: (payload: { items: Array<{ id: string; parent_id?: string | null; sort: number }> }) =>
    request.post('/system/menus/sort', payload),
  deleteMenu: (id: string) => request.delete(`/system/menus/${id}`),
  listButtons: () => request.get('/system/buttons'),
  createButton: (payload: CreateButtonPayload) => request.post('/system/buttons', payload),
  updateButton: (id: string, payload: Record<string, unknown>) => request.patch(`/system/buttons/${id}`, payload),
  deleteButton: (id: string) => request.delete(`/system/buttons/${id}`),
  listApis: () => request.get('/system/apis'),
  createApi: (payload: CreateApiPayload) => request.post('/system/apis', payload),
  updateApi: (id: string, payload: Record<string, unknown>) => request.patch(`/system/apis/${id}`, payload),
  deleteApi: (id: string) => request.delete(`/system/apis/${id}`),
  listPlatforms: () => request.get('/system/platforms'),
  createPlatform: (payload: CreatePlatformPayload) => request.post('/system/platforms', payload),
  updatePlatform: (id: string, payload: Record<string, unknown>) => request.patch(`/system/platforms/${id}`, payload),
  deletePlatform: (id: string) => request.delete(`/system/platforms/${id}`),
  listDepartments: () => request.get('/system/departments'),
  listDepartmentTree: () => request.get('/system/departments/tree'),
  createDepartment: (payload: CreateDepartmentPayload) => request.post('/system/departments', payload),
  updateDepartment: (id: string, payload: Record<string, unknown>) => request.patch(`/system/departments/${id}`, payload),
  deleteDepartment: (id: string) => request.delete(`/system/departments/${id}`),
  listShops: () => request.get('/system/shops'),
  createShop: (payload: CreateShopPayload) => request.post('/system/shops', payload),
  updateShop: (id: string, payload: Record<string, unknown>) => request.patch(`/system/shops/${id}`, payload),
  deleteShop: (id: string) => request.delete(`/system/shops/${id}`),
  listLoginLogs: (params?: QueryLogsPayload) => request.get('/system/logs/login', { params }),
  listOperationLogs: (params?: QueryLogsPayload) => request.get('/system/logs/operation', { params }),
  listMessages: (params?: QueryMessagesPayload) => request.get('/system/messages', { params }),
  messageStats: () => request.get('/system/messages/stats'),
  markMessageRead: (id: string) => request.patch(`/system/messages/${id}/read`),
  markAllMessagesRead: () => request.patch('/system/messages/read-all'),
  assignUserRoles: (payload: { user_id: string; role_ids: string[] }) =>
    request.post('/system/permissions/user-roles', payload),
  getUserRoles: (userId: string) => request.get(`/system/permissions/user-roles/${userId}`),
  assignRoleResources: (payload: { role_id: string; menu_ids: string[]; button_ids: string[] }) =>
    request.post('/system/permissions/role-resources', payload),
  getRoleResources: (roleId: string) => request.get(`/system/permissions/role-resources/${roleId}`)
};
