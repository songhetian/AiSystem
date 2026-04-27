/**
 * ActionBar组件类型定义
 */

import React from 'react';

export interface ActionItem {
  /** 操作键 */
  key: string;
  /** 操作文本 */
  label: React.ReactNode;
  /** 操作图标 */
  icon?: React.ReactNode;
  /** 按钮类型 */
  type?: 'primary' | 'default' | 'dashed' | 'text' | 'link';
  /** 是否危险按钮 */
  danger?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 点击事件 */
  onClick?: () => void;
}

export interface ActionBarProps {
  /** 操作项配置 */
  actions: ActionItem[];
  /** 左侧额外内容 */
  extra?: React.ReactNode;
  /** 是否使用毛玻璃效果 */
  glass?: boolean;
  /** 对齐方式 */
  align?: 'left' | 'right' | 'space-between';
  /** 额外的类名 */
  className?: string;
  /** 额外的样式 */
  style?: React.CSSProperties;
}
