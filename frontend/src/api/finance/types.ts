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
  applicantName?: string;
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

export interface CashRecord {
  id: string;
  type: number;
  amount: number;
  source: string;
  biz_id?: string;
  biz_type?: string;
  create_time: string;
  [key: string]: any;
}
