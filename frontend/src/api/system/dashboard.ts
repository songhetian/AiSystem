import request from "@/utils/request";

/**
 * 统一数据大屏与治理接口 (完全版)
 * 符合 PRD 2.1 - 2.5 需求
 */
export const dashboardApi = {
  // --- 模板列表与管理 (PRD 2.1) ---
  listTemplates: () => request.get("/system/dashboard/templates"),
  createTemplate: (data: any) =>
    request.post("/system/dashboard/templates", data),
  updateTemplate: (id: string, data: any) =>
    request.put(`/system/dashboard/templates/${id}`, data),
  deleteTemplate: (id: string) =>
    request.delete(`/system/dashboard/templates/${id}`),
  copyTemplate: (id: string) =>
    request.post(`/system/dashboard/templates/${id}/copy`),

  // --- 核心聚合数据 (PRD 2.2) ---
  getGlobalOverview: () => request.get("/system/dashboard/global"),
  getEcommerceOverview: () => request.get("/system/dashboard/ecommerce"),
  getHrOverview: () => request.get("/system/dashboard/hr"),
  getServiceOverview: () => request.get("/system/dashboard/service"),
  getInterfaceMonitoring: () => request.get("/system/dashboard/interface"),

  // --- 共享与预警管理 (PRD 2.4 - 2.5) ---
  generateShareLink: (id: string, expireDays: number = 7) =>
    request.post(`/system/dashboard/templates/${id}/share`, { expireDays }),
  listAlertHistory: () => request.get("/system/dashboard/alerts"),

  // ✅ 新增：预警配置（补充文档.md 模块9）
  listAlertConfigs: () => request.get<any[]>("/system/dashboard/alert-configs"),
  saveAlertConfig: (payload: any) =>
    request.post("/system/dashboard/alert-configs", payload),
  toggleAlertConfig: (id: string, enabled: boolean) =>
    request.patch(`/system/dashboard/alert-configs/${id}/toggle`, { enabled }),
  deleteAlertConfig: (id: string) =>
    request.delete(`/system/dashboard/alert-configs/${id}`),
};
