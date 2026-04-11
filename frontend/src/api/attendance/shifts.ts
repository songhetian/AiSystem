import { request } from '@/utils/request';
import type { AttendanceShiftPayload } from './types';

export const shiftApi = {
  listShifts: () => request.get('/attendance/shifts'),
  createShift: (payload: AttendanceShiftPayload) => request.post('/attendance/shifts', payload),
  updateShift: (id: string, payload: Partial<AttendanceShiftPayload>) => request.patch(`/attendance/shifts/${id}`, payload),
  deleteShift: (id: string) => request.delete(`/attendance/shifts/${id}`),
};
