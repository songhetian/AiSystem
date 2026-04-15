export * from './types';
export * from './shifts';
export * from './schedules';
export * from './records';
export * from './workflows';

import { shiftApi } from './shifts';
import { scheduleApi } from './schedules';
import { recordApi } from './records';
import { workflowApi } from './workflows';
import { coverageApi, aiScheduleApi, settingsApi, employeeScheduleApi } from './extensions';

export * from './extensions';

// 聚合 API 对象，保持原有调用方式兼容性
export const attendanceApi = {
  ...shiftApi,
  ...scheduleApi,
  ...recordApi,
  ...workflowApi,
  ...coverageApi,
  ...aiScheduleApi,
  ...settingsApi,
  ...employeeScheduleApi,
};
