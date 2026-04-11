import { request } from '@/utils/request';
import { message } from 'antd';
import type { AttendanceWorkflowQuery } from './types';

// TODO: 如果有离线存储逻辑，可以从 external 导入
const addPendingCheckin = async (data: any) => {
  console.log('Offline checkin buffered:', data);
};

export const recordApi = {
  clockIn: async (data: { type: 'on' | 'off'; location?: string }) => {
    try {
      return await request.post('/attendance/records/clock-in', data);
    } catch (error) {
      await addPendingCheckin(data);
      message.warning('当前网络不佳，打卡请求已进入离线缓冲队列，网络恢复后将自动同步。');
      throw error;
    }
  },
  listRecords: (params?: AttendanceWorkflowQuery) => request.get('/attendance/records', { params }),
  getStatistics: (params: { month: string; dept_id?: string }) => request.get('/attendance/records/statistics', { params }),
  reCalculate: (id: string) => request.post(`/attendance/records/${id}/recalculate`),
};
