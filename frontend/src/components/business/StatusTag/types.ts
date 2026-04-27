/**
 * StatusTag组件类型定义
 */

import React from 'react';

export type StatusType =
  | 'success'
  | 'processing'
  | 'error'
  | 'warning'
  | 'default'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'inactive'
  | 'online'
  | 'offline';

export interface StatusTagProps {
  /** 状态类型 */
  status: StatusType;
  /** 状态文本（如果不提供，使用默认文本） */
  text?: React.ReactNode;
  /** 是否显示状态点 */
  showDot?: boolean;
  /** 尺寸 */
  size?: 'small' | 'default' | 'large';
  /** 额外的类名 */
  className?: string;
  /** 额外的样式 */
  style?: React.CSSProperties;
}

// 状态配置映射
export const STATUS_CONFIG: Record<StatusType, { text: string; color: string }> = {
  success: { text: '成功', color: 'success' },
  processing: { text: '处理中', color: 'info' },
  error: { text: '失败', color: 'danger' },
  warning: { text: '警告', color: 'warning' },
  default: { text: '默认', color: 'default' },
  pending: { text: '待审批', color: 'warning' },
  approved: { text: '已通过', color: 'success' },
  rejected: { text: '已拒绝', color: 'danger' },
  active: { text: '启用', color: 'success' },
  inactive: { text: '禁用', color: 'default' },
  online: { text: '在线', color: 'success' },
  offline: { text: '离线', color: 'default' },
};
