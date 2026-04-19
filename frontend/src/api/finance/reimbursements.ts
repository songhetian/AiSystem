import request from "@/utils/request";
import type { ReimbursementRecord, ExpenseType } from "./types";

export const reimbursementApi = {
  listExpenseTypes: () => request.get<ExpenseType[]>("/finance/expense-types"),
  listReimbursements: (params?: any) =>
    request.get<ReimbursementRecord[]>("/finance/reimbursements", { params }),
  createReimbursement: (payload: any) =>
    request.post("/finance/reimbursements", payload),
  withdrawReimbursement: (id: string) =>
    request.post(`/finance/reimbursements/${id}/withdraw`, {}),
  completePayment: (
    id: string,
    payload: { pay_method: string; remark?: string },
  ) => request.post(`/finance/reimbursements/${id}/pay`, payload),
};
