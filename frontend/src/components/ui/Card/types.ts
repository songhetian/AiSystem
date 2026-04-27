/**
 * Card组件类型定义
 */

import React from 'react';

export interface CardProps {
  /** 卡片标题 */
  title?: React.ReactNode;
  /** 卡片额外内容（显示在标题右侧） */
  extra?: React.ReactNode;
  /** 卡片内容 */
  children: React.ReactNode;
  /** 是否使用毛玻璃效果 */
  glass?: boolean;
  /** 阴影大小 */
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** 圆角大小 */
  radius?: 'none' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl';
  /** 内边距大小 */
  padding?: 'none' | 'sm' | 'base' | 'lg';
  /** 是否显示边框 */
  bordered?: boolean;
  /** 是否可悬停（悬停时有提升效果） */
  hoverable?: boolean;
  /** 额外的类名 */
  className?: string;
  /** 额外的样式 */
  style?: React.CSSProperties;
  /** 点击事件 */
  onClick?: () => void;
  /** 卡片头部样式 */
  headerStyle?: React.CSSProperties;
  /** 卡片内容样式 */
  bodyStyle?: React.CSSProperties;
}
