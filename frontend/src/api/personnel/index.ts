import request from "@/utils/request";

export const personnelApi = {
  listDepartments: () => request.get("/personnel/departments"),
  createDepartment: (payload: Record<string, unknown>) =>
    request.post("/personnel/departments", payload),
  updateDepartment: (id: string, payload: Record<string, unknown>) =>
    request.patch(`/personnel/departments/${id}`, payload),
  deleteDepartment: (id: string) => request.delete(`/personnel/departments/${id}`),
  listPositions: () => request.get("/personnel/positions"),
  createPosition: (payload: Record<string, unknown>) =>
    request.post("/personnel/positions", payload),
  updatePosition: (id: string, payload: Record<string, unknown>) =>
    request.patch(`/personnel/positions/${id}`, payload),
  deletePosition: (id: string) => request.delete(`/personnel/positions/${id}`),
  updatePositionSort: (items: Array<{ id: string; sort: number }>) =>
    request.post("/personnel/positions/sort", { items }),
  listEmployees: () => request.get("/personnel/employees"),
  createEmployee: (payload: Record<string, unknown>) =>
    request.post("/personnel/employees", payload),
  updateEmployee: (id: string, payload: Record<string, unknown>) =>
    request.patch(`/personnel/employees/${id}`, payload),
  batchUpdateEmployeeStatus: (payload: { ids: string[]; status: number }) =>
    request.patch("/personnel/employees/batch/status", payload),
  deleteEmployee: (id: string) => request.delete(`/personnel/employees/${id}`),
  uploadEmployeeIdCard: (id: string, side: "front" | "back", file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request.post(
      `/personnel/employees/${id}/id-card/${side}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
  },
  getEmployeeIdCardUrl: (
    id: string,
    side: "front" | "back",
  ): Promise<{ url: string | null }> =>
    request.get(`/personnel/employees/${id}/id-card/${side}`),
  // ✅ 新增：导出/导入
  exportEmployees: () =>
    request.get("/personnel/employees/export", { responseType: "blob" }),
  importEmployees: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request.post<{ success: number; failed: number; errors: string[] }>(
      "/personnel/employees/import",
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
  },
  downloadImportTemplate: () =>
    request.get("/personnel/employees/import/template", {
      responseType: "blob",
    }),
};
