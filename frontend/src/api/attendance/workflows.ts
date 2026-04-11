import { request } from '@/utils/request';
import { withIdempotencyKey } from './utils';
import type { 
  AttendanceWorkflowQuery, 
  AttendanceLeavePayload, 
  AttendanceOvertimePayload, 
  AttendancePatchCardPayload, 
  AttendanceScheduleChangePayload,
  MutationRequestOptions 
} from './types';

export const workflowApi = {
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
