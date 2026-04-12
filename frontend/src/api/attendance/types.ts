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

export interface AttendanceScheduleShift {
  id: string;
  name: string;
  on_duty_time: string;
  off_duty_time: string;
}

export interface AttendanceScheduleDay {
  key: string;
  label: string;
  weekday: string;
}

export interface AttendanceScheduleCell {
  date: string;
  schedule_id?: string;
  shift_name: string | null;
  shift_id: string | null;
  on_duty_time: string | null;
  off_duty_time: string | null;
}

export interface AttendanceScheduleRow {
  employee_id: string;
  employee_name: string;
  employee_no?: string;
  department_name?: string;
  schedules: AttendanceScheduleCell[];
}

export interface AttendanceScheduleDashboard {
  days: AttendanceScheduleDay[];
  rows: AttendanceScheduleRow[];
  shifts: AttendanceScheduleShift[];
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
  };
  summary?: {
    employee_count: number;
    scheduled_count?: number;
  };
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

export interface MutationRequestOptions {
  idempotencyKey?: string;
}
