import { request } from '@/utils/request';
import type { PurchaseRecord } from './types';

export const purchaseApi = {
  listPurchases: (params?: any) => request.get<PurchaseRecord[]>('/finance/purchases', { params }),
  createPurchase: (payload: any) => request.post('/finance/purchases', payload),
};
