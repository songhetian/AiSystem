import { request } from '@/utils/request';

export interface ExpenseType {
  id: string;
  name: string;
  code: string;
}

export interface ReimbursementRecord {
  id: string;
  reim_no: string;
  expense_type_id: string;
  amount: number;
  reason: string;
  attachment_urls?: string[];
  applicant_id: string;
  status: number;
  create_time: string;
  [key: string]: any;
}

export interface PurchaseRecord {
  id: string;
  purchase_no: string;
  items: any[];
  total_amount: number;
  reason: string;
  status: number;
  create_time: string;
  [key: string]: any;
}

export const financeApi = {
  listExpenseTypes: () => request.get<ExpenseType[]>('/finance/expense-types'),
  listReimbursements: (params?: any) => request.get<ReimbursementRecord[]>('/finance/reimbursements', { params }),
  createReimbursement: (payload: any) => request.post('/finance/reimbursements', payload),
  
  listPurchases: (params?: any) => request.get<PurchaseRecord[]>('/finance/purchases', { params }),
  createPurchase: (payload: any) => request.post('/finance/purchases', payload),

  listCashRecords: (params?: any) => request.get('/finance/cash-records', { params }),
  getDashboardStats: (platformId: string) => request.get<any>('/finance/dashboard/stats', { params: { platform_id: platformId } }),
};
