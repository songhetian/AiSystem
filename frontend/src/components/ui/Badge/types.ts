/**
 * Badge组件类型定义
 */

import React from 'react';

export type BadgeColor = 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
  /** 徽章颜色 */
  color?: BadgeColor;
  /** 徽章内容（数字或文本） */
  count?: React.ReactNode;
  /** 最大显示数字（超过显示为count+） */
  overflowCount?: number;
  /** 是否显示为小红点 */
  dot?: boolean;
  /** 是否显示徽章 */
  showZero?: boolean;
  /** 子元素 */
  children?: React.ReactNode;
  /** 徽章偏移量 [x, y] */
  offset?: [number, number];
  /** 额外的类名 */
  className?: string;
  /** 额外的样式 */
  style?: React.CSSProperties;
}
