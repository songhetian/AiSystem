import type { SystemMessagePayload, SystemMessageRecord } from '@/api/system';

export type NoticeVariant = 'approval' | 'success' | 'warning' | 'schedule' | 'system';
export type MessageCategory = 'approval' | 'schedule' | 'system';

export interface MessageAppearance {
  channelKey: string;
  variant: NoticeVariant;
  category: MessageCategory;
  label: string;
  title: string;
  priority: number;
  lifetimeMs: number;
}

export function resolveMessageAppearance(messageType?: string): MessageAppearance {
  if (!messageType) {
    return {
      channelKey: 'system',
      variant: 'system',
      category: 'system',
      label: '系统通道',
      title: '系统提醒',
      priority: 1,
      lifetimeMs: 5600
    };
  }

  if (messageType.startsWith('approval_')) {
    if (messageType.endsWith('_approved')) {
      return {
        channelKey: 'approval-result',
        variant: 'success',
        category: 'approval',
        label: '审批结果',
        title: '审批已办结',
        priority: 4,
        lifetimeMs: 8200
      };
    }

    if (messageType.endsWith('_rejected') || messageType.endsWith('_transferred')) {
      return {
        channelKey: 'approval-result',
        variant: 'warning',
        category: 'approval',
        label: '审批结果',
        title: '审批状态变更',
        priority: 5,
        lifetimeMs: 9000
      };
    }

    return {
      channelKey: 'approval-pending',
      variant: 'approval',
      category: 'approval',
      label: '审批待办',
      title: '待处理审批',
      priority: 6,
      lifetimeMs: 10000
    };
  }

  if (messageType.startsWith('schedule_change_')) {
    return {
      channelKey: 'schedule-change',
      variant: 'schedule',
      category: 'schedule',
      label: '调班通道',
      title: '班次调整提醒',
      priority: 3,
      lifetimeMs: 7600
    };
  }

  if (messageType === 'leave_sync_completed') {
    return {
      channelKey: 'leave-sync',
      variant: 'success',
      category: 'schedule',
      label: '联动结果',
      title: '请假联动完成',
      priority: 4,
      lifetimeMs: 8600
    };
  }

  if (messageType === 'system_alert') {
    return {
      channelKey: 'system-alert',
      variant: 'warning',
      category: 'system',
      label: '监控预警',
      title: '系统运行异常',
      priority: 9,
      lifetimeMs: 15000
    };
  }

  return {
    channelKey: messageType,
    variant: 'system',
    category: 'system',
    label: '消息通道',
    title: '系统消息提醒',
    priority: 1,
    lifetimeMs: 5600
  };
}

function compact(values: Array<string | number | null | undefined>) {
  return values
    .map((item) => (typeof item === 'number' ? String(item) : item?.trim()))
    .filter((item): item is string => Boolean(item));
}

export function buildMessageMetaTags(payload?: SystemMessagePayload) {
  if (!payload) {
    return [];
  }

  return compact([
    payload.requestNo ? `审批单 ${payload.requestNo}` : undefined,
    payload.changeNo ? `调班单 ${payload.changeNo}` : undefined,
    payload.leaveNo ? `请假单 ${payload.leaveNo}` : undefined,
    payload.employeeName ? `员工 ${payload.employeeName}` : undefined,
    payload.changeDate ? `日期 ${payload.changeDate.slice(0, 10)}` : undefined,
    payload.leaveType ? `类型 ${payload.leaveType}` : undefined,
    typeof payload.affectedSchedules === 'number' && payload.affectedSchedules > 0
      ? `排班 ${payload.affectedSchedules}`
      : undefined,
    typeof payload.affectedRecords === 'number' && payload.affectedRecords > 0
      ? `考勤 ${payload.affectedRecords}`
      : undefined,
    payload.api ? `接口 ${payload.api}` : undefined,
    typeof payload.successRate === 'number' ? `成功率 ${payload.successRate.toFixed(1)}%` : undefined
  ]).slice(0, 4);
}

export function buildMessageSearchText(item: Pick<SystemMessageRecord, 'title' | 'content' | 'message_type' | 'payload'>) {
  const payload = item.payload;
  return [
    item.title,
    item.content,
    item.message_type,
    payload?.requestNo,
    payload?.changeNo,
    payload?.leaveNo,
    payload?.employeeName,
    payload?.leaveType,
    payload?.bizNo,
    payload?.comment
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
