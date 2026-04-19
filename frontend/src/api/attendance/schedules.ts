import request from '@/utils/request';
import type { AttendanceScheduleDashboard, ScheduleAssignPayload, ImportSchedulePayload } from './types';

export const scheduleApi = {
  getDashboard: (params?: Record<string, string>) =>
    request.get<AttendanceScheduleDashboard>('/attendance/schedules', { params }),
  saveSchedule: (payload: ScheduleAssignPayload) => request.post('/attendance/schedules', payload),
  deleteSchedule: (id: string) => request.delete(`/attendance/schedules/${id}`),
  importSchedules: (payload: ImportSchedulePayload) => request.post('/attendance/schedules/import', payload),
  exportSchedules: (params?: Record<string, string>) => request.get('/attendance/schedules/export', { params }),
  downloadTemplate: () => request.get('/attendance/schedules/template'),
};
