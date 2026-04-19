import { message } from 'antd';
import request from '@/utils/request';
import type { AttendanceWorkflowQuery } from './types';
import {
  addPendingCheckin,
  deletePendingCheckin,
  getAllPendingCheckins,
} from '@/utils/db';

async function flushPendingCheckins() {
  const pendingItems = await getAllPendingCheckins();
  for (const item of pendingItems) {
    try {
      await request.post('/attendance/records/clock-in', {
        type: item.type,
        location: item.location,
      });
      await deletePendingCheckin(item.id);
    } catch {
      break;
    }
  }
}

let onlineSyncBound = false;

function bindOnlineSync() {
  if (onlineSyncBound || typeof window === 'undefined') return;
  window.addEventListener('online', () => {
    void flushPendingCheckins();
  });
  onlineSyncBound = true;
}

bindOnlineSync();

export const recordApi = {
  clockIn: async (data: { type: 'on' | 'off'; location?: string }) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        await flushPendingCheckins();
      }
      const result = await request.post('/attendance/records/clock-in', data);
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        await flushPendingCheckins();
      }
      return result;
    } catch (error) {
      await addPendingCheckin(data);
      message.warning('当前网络异常，打卡请求已进入离线缓冲队列，网络恢复后会自动补发。');
      throw error;
    }
  },
  listRecords: (params?: AttendanceWorkflowQuery) =>
    request.get('/attendance/records', { params }),
  getStatistics: (params: { month: string; dept_id?: string }) =>
    request.get('/attendance/records/statistics', { params }),
  reCalculate: (id: string) =>
    request.post(`/attendance/records/${id}/recalculate`),
};
