/**
 * ContentWrapper组件类型定义
 */

import React from 'react';

export interface ContentWrapperProps {
  /** 内容 */
  children: React.ReactNode;
  /** 是否使用毛玻璃效果 */
  glass?: boolean;
  /** 内边距大小 */
  padding?: 'none' | 'sm' | 'base' | 'lg';
  /** 是否显示边框 */
  bordered?: boolean;
  /** 圆角大小 */
  radius?: 'none' | 'sm' | 'base' | 'md' | 'lg' | 'xl';
  /** 阴影大小 */
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** 额外的类名 */
  className?: string;
  /** 额外的样式 */
  style?: React.CSSProperties;
}
