/**
 * PageHeader组件类型定义
 */

import React from 'react';

export interface PageHeaderProps {
  /** 页面标题 */
  title: React.ReactNode;
  /** 页面副标题 */
  subTitle?: React.ReactNode;
  /** 标签 */
  tags?: React.ReactNode;
  /** 额外内容 */
  extra?: React.ReactNode;
  /** 底部内容 */
  footer?: React.ReactNode;
  /** 是否显示返回按钮 */
  showBack?: boolean;
  /** 返回事件 */
  onBack?: () => void;
  /** 是否使用毛玻璃效果 */
  glass?: boolean;
  /** 额外的类名 */
  className?: string;
  /** 额外的样式 */
  style?: React.CSSProperties;
}
