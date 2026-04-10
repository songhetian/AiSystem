import { request } from '@/utils/request';

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
  platform_id?: string;
  status: number;
  [key: string]: any;
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

export const systemApi = {
  // 平台管理
  listPlatforms: () => request.get<PlatformRecord[]>('/system/platforms'),
  savePlatform: (payload: any) => request.post('/system/platforms', payload),
  
  // 部门管理
  listDepartments: () => request.get<DepartmentRecord[]>('/system/departments'),
  
  // 店铺管理
  listShops: () => request.get<ShopRecord[]>('/system/shops'),
  createShop: (payload: any) => request.post('/system/shops', payload),
  updateShop: (id: string, payload: any) => request.patch(`/system/shops/${id}`, payload),
  deleteShop: (id: string) => request.delete(`/system/shops/${id}`),

  // API Key 凭据管理
  listApiKeys: () => request.get<any[]>('/system/api-keys'),
  saveApiKey: (payload: any) => request.post('/system/api-keys', payload),

  // 接口权限管理
  listApis: () => request.get<any[]>('/system/apis'),
  getApiStats: (id: string) => request.get<any>(`/system/apis/${id}/stats`),
  createApi: (payload: any) => request.post('/system/apis', payload),
  updateApi: (id: string, payload: any) => request.patch(`/system/apis/${id}`, payload),
  deleteApi: (id: string) => request.delete(`/system/apis/${id}`),

  // 消息中心
  listMessages: (params?: any) => request.get<any[]>('/system/messages', { params }),
  markMessageRead: (id: string) => request.patch(`/system/messages/${id}/read`),
  markAllMessagesRead: () => request.post('/system/messages/read-all'),

  // 操作日志
  listOperationLogs: (params?: any) => request.get<any>('/system/logs/operation', { params }),
  listLoginLogs: (params?: any) => request.get<any>('/system/logs/login', { params }),

  // 个人中心
  updateProfile: (payload: any) => request.patch('/system/users/profile', payload),
  updateProfilePassword: (payload: any) => request.post('/system/users/profile/password', payload),
};
