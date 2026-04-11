import { request } from '@/utils/request';

export const cashApi = {
  listCashRecords: (params?: any) => request.get('/finance/cash-records', { params }),
  getDashboardStats: (platformId: string) => request.get<any>('/finance/dashboard/stats', { params: { platform_id: platformId } }),
};
