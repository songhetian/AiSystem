import { request } from '@/utils/request';
import type { ReimbursementRecord, ExpenseType } from './types';

export const reimbursementApi = {
  listExpenseTypes: () => request.get<ExpenseType[]>('/finance/expense-types'),
  listReimbursements: (params?: any) => request.get<ReimbursementRecord[]>('/finance/reimbursements', { params }),
  createReimbursement: (payload: any) => request.post('/finance/reimbursements', payload),
};
