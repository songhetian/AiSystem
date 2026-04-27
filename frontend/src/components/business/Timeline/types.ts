/**
 * Timeline组件类型定义
 */

import React from 'react';

export interface TimelineItem {
  /** 唯一标识 */
  key: string;
  /** 时间 */
  time: string;
  /** 标题 */
  title: React.ReactNode;
  /** 描述 */
  description?: React.ReactNode;
  /** 状态 */
  status?: 'success' | 'processing' | 'error' | 'warning' | 'default';
  /** 图标 */
  icon?: React.ReactNode;
  /** 额外内容 */
  extra?: React.ReactNode;
}

export interface TimelineProps {
  /** 时间轴项 */
  items: TimelineItem[];
  /** 是否使用毛玻璃效果 */
  glass?: boolean;
  /** 是否反向排列 */
  reverse?: boolean;
  /** 模式 */
  mode?: 'left' | 'right' | 'alternate';
  /** 额外的类名 */
  className?: string;
  /** 额外的样式 */
  style?: React.CSSProperties;
}
