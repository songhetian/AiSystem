import request from '@/utils/request';

export const statsApi = {
  // 报销统计
  getReimbursementStats: (params: {
    platform_id: string;
    start_date?: string;
    end_date?: string;
    dept_id?: string;
  }) => request.get('/finance/reimbursements/stats', { params }),

  // 采购统计
  getPurchaseStats: (params: {
    platform_id: string;
    start_date?: string;
    end_date?: string;
    dept_id?: string;
  }) => request.get('/finance/purchases/stats', { params }),

  // 收支统计
  getCashRecordStats: (params: {
    platform_id: string;
    start_date?: string;
    end_date?: string;
    type?: string;
  }) => request.get('/finance/cash-records/stats', { params }),
};
