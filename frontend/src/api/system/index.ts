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

export const systemApi = {
  listPlatforms: () => request.get<PlatformRecord[]>('/system/platforms'),
  savePlatform: (payload: any) => request.post('/system/platforms', payload),

  listDepartments: () => request.get<DepartmentRecord[]>('/system/departments'),

  listShops: () => request.get<ShopRecord[]>('/system/shops'),
  createShop: (payload: any) => request.post('/system/shops', payload),
  updateShop: (id: string, payload: any) => request.patch(`/system/shops/${id}`, payload),
  deleteShop: (id: string) => request.delete(`/system/shops/${id}`),

  listApiKeys: () => request.get<ApiKeyRecord[]>('/system/api-keys'),
  saveApiKey: (payload: Partial<ApiKeyRecord>) => request.post('/system/api-keys', payload),
  updateApiKey: (id: string, payload: Partial<ApiKeyRecord>) => request.patch(`/system/api-keys/${id}`, payload),
  deleteApiKey: (id: string) => request.delete(`/system/api-keys/${id}`),

  listIntegrations: () => request.get<IntegrationRecord[]>('/system/integrations'),
  createIntegration: (payload: Partial<IntegrationRecord>) => request.post('/system/integrations', payload),
  updateIntegration: (id: string, payload: Partial<IntegrationRecord>) => request.patch(`/system/integrations/${id}`, payload),
  deleteIntegration: (id: string) => request.delete(`/system/integrations/${id}`),

  listApis: () => request.get<any[]>('/system/apis'),
  getApiStats: (id: string) => request.get<any>(`/system/apis/${id}/stats`),
  createApi: (payload: any) => request.post('/system/apis', payload),
  updateApi: (id: string, payload: any) => request.patch(`/system/apis/${id}`, payload),
  deleteApi: (id: string) => request.delete(`/system/apis/${id}`),

  listMessages: (params?: any) => request.get<any[]>('/system/messages', { params }),
  markMessageRead: (id: string) => request.patch(`/system/messages/${id}/read`),
  markAllMessagesRead: () => request.post('/system/messages/read-all'),

  listOperationLogs: (params?: any) => request.get<any>('/system/logs/operation', { params }),
  listLoginLogs: (params?: any) => request.get<any>('/system/logs/login', { params }),

  updateProfile: (payload: any) => request.patch('/system/users/profile', payload),
  updateProfilePassword: (payload: any) => request.post('/system/users/profile/password', payload),
};
