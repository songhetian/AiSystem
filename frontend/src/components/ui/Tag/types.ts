/**
 * Tag组件类型定义
 */

import React from 'react';

export type TagColor = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type TagSize = 'sm' | 'base' | 'lg';

export interface TagProps {
  /** 标签颜色 */
  color?: TagColor;
  /** 标签尺寸 */
  size?: TagSize;
  /** 标签图标 */
  icon?: React.ReactNode;
  /** 标签文本 */
  children: React.ReactNode;
  /** 是否可关闭 */
  closable?: boolean;
  /** 关闭事件 */
  onClose?: () => void;
  /** 额外的类名 */
  className?: string;
  /** 额外的样式 */
  style?: React.CSSProperties;
  /** 点击事件 */
  onClick?: () => void;
}
