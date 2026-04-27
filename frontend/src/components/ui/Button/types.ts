/**
 * Button组件类型定义
 */

import React from 'react';

export type ButtonType = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'base' | 'lg';
export type ButtonShape = 'default' | 'round' | 'circle';

export interface ButtonProps {
  /** 按钮类型 */
  type?: ButtonType;
  /** 按钮尺寸 */
  size?: ButtonSize;
  /** 按钮形状 */
  shape?: ButtonShape;
  /** 按钮图标 */
  icon?: React.ReactNode;
  /** 按钮文本 */
  children?: React.ReactNode;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 是否块级按钮（占满父容器宽度） */
  block?: boolean;
  /** 是否危险按钮（红色） */
  danger?: boolean;
  /** HTML按钮类型 */
  htmlType?: 'button' | 'submit' | 'reset';
  /** 额外的类名 */
  className?: string;
  /** 额外的样式 */
  style?: React.CSSProperties;
  /** 点击事件 */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}
