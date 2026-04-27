/**
 * MetricsCard组件类型定义
 */

import React from 'react';

export type TrendType = 'up' | 'down' | 'flat';

export interface MetricsCardProps {
  /** 指标标题 */
  title: React.ReactNode;
  /** 指标值 */
  value: React.ReactNode;
  /** 指标单位 */
  unit?: string;
  /** 趋势类型 */
  trend?: TrendType;
  /** 趋势值（百分比） */
  trendValue?: number;
  /** 趋势描述 */
  trendText?: string;
  /** 图标 */
  icon?: React.ReactNode;
  /** 图标背景色 */
  iconColor?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** 额外信息 */
  extra?: React.ReactNode;
  /** 是否使用毛玻璃效果 */
  glass?: boolean;
  /** 是否可点击 */
  clickable?: boolean;
  /** 点击事件 */
  onClick?: () => void;
  /** 额外的类名 */
  className?: string;
  /** 额外的样式 */
  style?: React.CSSProperties;
}
