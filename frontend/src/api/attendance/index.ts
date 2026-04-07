import { request } from '@/utils/request';

export interface AttendanceShiftPayload {
  name: string;
  on_duty_time: string;
  off_duty_time: string;
  late_threshold?: number;
  early_threshold?: number;
  absenteeism_threshold?: number;
  status?: number;
}

export interface ScheduleAssignPayload {
  shift_id?: string;
  items: Array<{
    employee_id: string;
    schedule_date: string;
  }>;
}

export interface ImportSchedulePayload {
  rows: Array<{
    employee_no?: string;
    employee_name?: string;
    department_name?: string;
    schedule_date: string;
    shift_name: string;
  }>;
}

export interface AttendanceWorkflowQuery {
  keyword?: string;
  employee_id?: string;
  platform_id?: string;
  dept_id?: string;
  start_date?: string;
  end_date?: string;
  approval_status?: number;
}

export interface AttendanceLeavePayload {
  leave_no?: string;
  approval_request_id?: string;
  approval_request_no?: string;
  employee_id: string;
  leave_type: string;
  start_time: string;
  end_time: string;
  duration_hours?: number;
  reason?: string;
  approval_status?: number;
  approved_by?: string;
  approved_time?: string;
  sync_attendance?: number;
  sync_schedule?: number;
  attachment_urls?: string[];
}

export interface AttendanceOvertimePayload {
  overtime_no?: string;
  approval_request_id?: string;
  approval_request_no?: string;
  employee_id: string;
  start_time: string;
  end_time: string;
  duration_hours?: number;
  reason?: string;
  approval_status?: number;
  approved_by?: string;
  approved_time?: string;
  sync_attendance?: number;
  sync_schedule?: number;
  attachment_urls?: string[];
}

export interface AttendancePatchCardPayload {
  patch_no?: string;
  approval_request_id?: string;
  approval_request_no?: string;
  employee_id: string;
  patch_date: string;
  patch_type: string;
  target_time: string;
  reason?: string;
  approval_status?: number;
  approved_by?: string;
  approved_time?: string;
  sync_attendance?: number;
  attachment_urls?: string[];
}

export interface AttendanceScheduleChangePayload {
  change_no?: string;
  employee_id: string;
  change_date: string;
  before_shift_name?: string;
  after_shift_name?: string;
  change_type: string;
  reason?: string;
  operator_id?: string;
  notify_status?: number;
}

interface MutationRequestOptions {
  idempotencyKey?: string;
}

function withIdempotencyKey(idempotencyKey?: string) {
  return idempotencyKey
    ? {
        headers: {
          'x-idempotency-key': idempotencyKey
        }
      }
    : undefined;
}

export const attendanceApi = {
  getDashboard: (params?: Record<string, string>) => request.get('/attendance/schedules', { params }),
  listShifts: () => request.get('/attendance/shifts'),
  createShift: (payload: AttendanceShiftPayload) => request.post('/attendance/shifts', payload),
  updateShift: (id: string, payload: Partial<AttendanceShiftPayload>) => request.patch(`/attendance/shifts/${id}`, payload),
  deleteShift: (id: string) => request.delete(`/attendance/shifts/${id}`),
  saveSchedule: (payload: ScheduleAssignPayload) => request.post('/attendance/schedules', payload),
  deleteSchedule: (id: string) => request.delete(`/attendance/schedules/${id}`),
  importSchedules: (payload: ImportSchedulePayload) => request.post('/attendance/schedules/import', payload),
  exportSchedules: (params?: Record<string, string>) => request.get('/attendance/schedules/export', { params }),
  downloadTemplate: () => request.get('/attendance/schedules/template'),
  listRecords: (params?: AttendanceWorkflowQuery) => request.get('/attendance/records', { params }),
  getStatistics: (params: { month: string; dept_id?: string }) => request.get('/attendance/records/statistics', { params }),
  reCalculate: (id: string) => request.post(`/attendance/records/${id}/recalculate`),
  listLeaves: (params?: AttendanceWorkflowQuery) => request.get('/attendance/leaves', { params }),
  createLeave: (payload: AttendanceLeavePayload, options?: MutationRequestOptions) =>
    request.post('/attendance/leaves', payload, withIdempotencyKey(options?.idempotencyKey)),
  updateLeave: (id: string, payload: AttendanceLeavePayload, options?: MutationRequestOptions) =>
    request.patch(`/attendance/leaves/${id}`, payload, withIdempotencyKey(options?.idempotencyKey)),
  deleteLeave: (id: string) => request.delete(`/attendance/leaves/${id}`),
  listOvertimes: (params?: AttendanceWorkflowQuery) => request.get('/attendance/overtimes', { params }),
  createOvertime: (payload: AttendanceOvertimePayload, options?: MutationRequestOptions) =>
    request.post('/attendance/overtimes', payload, withIdempotencyKey(options?.idempotencyKey)),
  updateOvertime: (id: string, payload: AttendanceOvertimePayload, options?: MutationRequestOptions) =>
    request.patch(`/attendance/overtimes/${id}`, payload, withIdempotencyKey(options?.idempotencyKey)),
  deleteOvertime: (id: string) => request.delete(`/attendance/overtimes/${id}`),
  listPatchCards: (params?: AttendanceWorkflowQuery) => request.get('/attendance/patch-cards', { params }),
  createPatchCard: (payload: AttendancePatchCardPayload, options?: MutationRequestOptions) =>
    request.post('/attendance/patch-cards', payload, withIdempotencyKey(options?.idempotencyKey)),
  updatePatchCard: (id: string, payload: AttendancePatchCardPayload, options?: MutationRequestOptions) =>
    request.patch(`/attendance/patch-cards/${id}`, payload, withIdempotencyKey(options?.idempotencyKey)),
  deletePatchCard: (id: string) => request.delete(`/attendance/patch-cards/${id}`),
  listScheduleChanges: (params?: AttendanceWorkflowQuery) => request.get('/attendance/schedule-changes', { params }),
  createScheduleChange: (payload: AttendanceScheduleChangePayload, options?: MutationRequestOptions) =>
    request.post('/attendance/schedule-changes', payload, withIdempotencyKey(options?.idempotencyKey)),
  updateScheduleChange: (id: string, payload: AttendanceScheduleChangePayload, options?: MutationRequestOptions) =>
    request.patch(`/attendance/schedule-changes/${id}`, payload, withIdempotencyKey(options?.idempotencyKey)),
  deleteScheduleChange: (id: string) => request.delete(`/attendance/schedule-changes/${id}`)
};
