/**
 * SectionCard组件类型定义
 */

import React from 'react';

export interface SectionCardProps {
  /** 区块标题 */
  title?: React.ReactNode;
  /** 区块描述 */
  description?: React.ReactNode;
  /** 区块额外内容（显示在标题右侧） */
  extra?: React.ReactNode;
  /** 区块内容 */
  children: React.ReactNode;
  /** 是否使用毛玻璃效果 */
  glass?: boolean;
  /** 是否可折叠 */
  collapsible?: boolean;
  /** 默认是否展开 */
  defaultCollapsed?: boolean;
  /** 是否显示分隔线 */
  divider?: boolean;
  /** 内边距大小 */
  padding?: 'none' | 'sm' | 'base' | 'lg';
  /** 额外的类名 */
  className?: string;
  /** 额外的样式 */
  style?: React.CSSProperties;
  /** 头部样式 */
  headerStyle?: React.CSSProperties;
  /** 内容样式 */
  bodyStyle?: React.CSSProperties;
}
