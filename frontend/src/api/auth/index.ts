import request from "@/utils/request";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  phone: string;
  deptId: string;
  password: string;
  code: string;
  codeKey: string;
}

export interface CheckPhonePayload {
  phone: string;
}

export interface ApproveRegisterPayload {
  id: string;
  status: "approved" | "rejected";
  rejectReason?: string;
}

export interface BatchApproveRegisterPayload {
  ids: string[];
  status: "approved" | "rejected";
  rejectReason?: string;
}

export const authApi = {
  // 登录相关
  login: (payload: LoginPayload) => request.post("/auth/login", payload),
  me: () => request.get("/auth/me"),

  // 注册相关
  getCaptcha: () => request.get("/auth/register/captcha"),
  checkPhone: (payload: CheckPhonePayload) =>
    request.post("/auth/register/check-phone", payload),
  register: (payload: RegisterPayload) =>
    request.post("/auth/register", payload),

  // 注册审核相关（管理员）
  getRegisterList: (params: any) =>
    request.get("/auth/register/list", { params }),
  getRegisterDetail: (id: string) => request.get(`/auth/register/${id}`),
  approveRegister: (payload: ApproveRegisterPayload) =>
    request.post("/auth/register/approve", payload),
  batchApproveRegister: (payload: BatchApproveRegisterPayload) =>
    request.post("/auth/register/batch-approve", payload),
};
