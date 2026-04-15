import { request } from "@/utils/request";

export interface ProductRecord {
  id: string;
  name: string;
  code: string;
  category_id?: string;
  description?: string;
  images?: string[];
  platform_id: string;
  department_id: string;
  status: number;
  skus?: SkuRecord[];
}

export interface SkuRecord {
  id: string;
  product_id: string;
  sku_code: string;
  spec_data?: any;
  price: number;
  stock: number;
  warn_stock: number;
  shop_id: string;
  status: number;
}

export const shopApi = {
  listProducts: (params?: any) =>
    request.get<ProductRecord[]>("/shop/products", { params }),
  createProduct: (payload: any) =>
    request.post<ProductRecord>("/shop/products", payload),
  updateProduct: (id: string, payload: any) =>
    request.patch<ProductRecord>(`/shop/products/${id}`, payload),
  deleteProduct: (id: string) => request.delete(`/shop/products/${id}`),
  syncSkus: (id: string, skus: any[]) =>
    request.post(`/shop/products/${id}/skus`, { skus }),
  updateProductSort: (items: Array<{ id: string; sort: number }>) =>
    request.post("/shop/products/sort", { items }),
};
