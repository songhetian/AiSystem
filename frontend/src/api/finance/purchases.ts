import { request } from "@/utils/request";
import type { PurchaseRecord } from "./types";

export const purchaseApi = {
  listPurchases: (params?: any) =>
    request.get<PurchaseRecord[]>("/finance/purchases", { params }),
  createPurchase: (payload: any) => request.post("/finance/purchases", payload),
  cancelPurchase: (id: string, reason: string) =>
    request.post(`/finance/purchases/${id}/cancel`, { reason }),
  completePurchase: (
    id: string,
    payload: { actual_amount: number; supplier_info: string },
  ) => request.post(`/finance/purchases/${id}/complete`, payload),
};
