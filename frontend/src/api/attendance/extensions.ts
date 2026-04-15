import { request } from "../request";

export interface CheckCoveragePayload {
  check_date: string;
  start_time: string;
  end_time: string;
  shift_ids: string[];
}

export interface CoverageReport {
  id: string;
  check_date: string;
  start_time: string;
  end_time: string;
  checked_shift_ids: string[];
  checked_shift_names: string[];
  total_coverage_hours: string;
  missing_coverage_hours: string;
  overlapping_hours: string;
  platform_id: string;
  dept_id: string;
  create_time: string;
}

export interface AIScheduleGeneratePayload {
  start_date: string;
  end_date: string;
  dept_id: string;
  priority?: "fairness" | "coverage";
  max_hours_per_week?: number;
  max_consecutive_days?: number;
  daily_max_hours?: number;
  min_shift_staff?: number;
  shift_ids?: string[];
  lock_employee_ids?: string[];
}

export interface ScheduleResultItem {
  employee_id: string;
  employee_name: string;
  schedule_date: string;
  shift_id: string;
  shift_name: string;
  dept_id: string;
  is_warning: boolean;
  warning_reason?: string;
}

export interface ScheduleDraft {
  id: string;
  name: string;
  mode: string;
  total_scheduled: number;
  warning_count: number;
  compliance_rate: number;
  satisfaction_rate: number;
  fitting_rate: number;
  data: ScheduleResultItem[];
}

export interface AIScheduleGenerateResponse {
  success: boolean;
  drafts: ScheduleDraft[];
}

export const coverageApi = {
  checkCoverage: (data: CheckCoveragePayload) =>
    request.post<CoverageReport>("/attendance/coverage/check", data),
  getCoverageReports: (params?: { start_date?: string; end_date?: string }) =>
    request.get<CoverageReport[]>("/attendance/coverage/reports", { params }),
};

export const aiScheduleApi = {
  generateDrafts: (data: AIScheduleGeneratePayload) =>
    request.post<AIScheduleGenerateResponse>(
      "/attendance/ai-schedule/generate",
      data,
    ),
  applyDraft: (
    data: ScheduleResultItem[],
    historyMeta?: {
      draft_name: string;
      dept_id: string;
      start_date: string;
      end_date: string;
      compliance_rate: number;
      warning_count: number;
    },
  ) =>
    request.post<{ success: boolean; count: number }>(
      "/attendance/ai-schedule/apply",
      { draftData: data, historyMeta },
    ),
  getHistory: () => request.get<any[]>("/attendance/ai-schedule/history"),
  getAnalytics: (params: {
    dept_id: string;
    start_date: string;
    end_date: string;
  }) => request.get<any>("/attendance/ai-schedule/analytics", { params }),
  autoOptimizeDraft: (data: {
    draftData: ScheduleResultItem[];
    config: AIScheduleGeneratePayload;
  }) =>
    request.post<{
      success: boolean;
      data: ScheduleResultItem[];
      meta: ScheduleDraft;
    }>("/attendance/ai-schedule/auto-optimize", data),
  getReplacementCandidates: (data: {
    date: string;
    shiftName: string;
    draftData: ScheduleResultItem[];
    config: AIScheduleGeneratePayload;
  }) =>
    request.post<any[]>("/attendance/ai-schedule/replacement-candidates", data),
  saveStaffingDemands: (data: {
    dept_id: string;
    demands: { date: string; shift_name: string; required_count: number }[];
  }) =>
    request.post<{ success: boolean }>(
      "/attendance/ai-schedule/staffing-demands",
      data,
    ),
  publishSchedules: (data: {
    dept_id: string;
    start_date: string;
    end_date: string;
  }) =>
    request.post<{ success: boolean; count: number; employee_count: number }>(
      "/attendance/ai-schedule/publish",
      data,
    ),
  getMySchedules: (params: { start_date: string; end_date: string }) =>
    request.get<any[]>("/attendance/ai-schedule/my", { params }),
  submitSwapRequest: (data: {
    date: string;
    before_shift: string;
    after_shift: string;
    reason: string;
  }) =>
    request.post<{ success: boolean; change_no: string }>(
      "/attendance/ai-schedule/swap-request",
      data,
    ),
  getPendingSwaps: (params: { dept_id: string }) =>
    request.get<any[]>("/attendance/ai-schedule/pending-swaps", { params }),
};

export const settingsApi = {
  getAiConfig: () => request.get<any>("/attendance/settings"),
  updateAiConfig: (data: any) => request.put<any>("/attendance/settings", data),
  // ✅ 新增：考勤规则配置
  getAttendanceConfig: () => request.get<any>("/attendance/rules/config"),
  saveAttendanceConfig: (data: any) =>
    request.post<any>("/attendance/rules/config", data),
};

export const employeeScheduleApi = {
  getMySchedule: (params: { start_date: string; end_date: string }) =>
    request.get<any>("/attendance/employee-schedule/my-schedule", { params }),
  getPreference: (employeeId: string) =>
    request.get<any>("/attendance/employee-schedule/preference", {
      params: { employee_id: employeeId },
    }),
  savePreference: (employeeId: string, preference: any) =>
    request.post<any>("/attendance/employee-schedule/preference", {
      employee_id: employeeId,
      preference,
    }),
  submitSwapRequest: (data: {
    schedule_date: string;
    current_shift_name: string;
    target_shift_name: string;
    reason: string;
  }) => request.post<any>("/attendance/employee-schedule/swap-request", data),
  listSwapRequests: () =>
    request.get<any[]>("/attendance/employee-schedule/swap-requests"),
  submitFeedback: (data: {
    schedule_date: string;
    rating: string;
    comment?: string;
  }) => request.post<any>("/attendance/employee-schedule/feedback", data),
  listTemplates: () =>
    request.get<any[]>("/attendance/employee-schedule/templates"),
  saveTemplate: (data: { name: string; params: Record<string, any> }) =>
    request.post<any>("/attendance/employee-schedule/templates", data),
  deleteTemplate: (id: string) =>
    request.delete<any>(`/attendance/employee-schedule/templates/${id}`),
  listAllSwapRequests: () =>
    request.get<any[]>("/attendance/employee-schedule/all-swap-requests"),
  approveSwapRequest: (id: string) =>
    request.post<any>("/attendance/employee-schedule/approve-swap-request", {
      id,
    }),
  rejectSwapRequest: (id: string) =>
    request.post<any>("/attendance/employee-schedule/reject-swap-request", {
      id,
    }),
};
