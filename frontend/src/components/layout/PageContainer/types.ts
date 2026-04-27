/**
 * PageContainer组件类型定义
 */

import React from 'react';

export interface PageContainerProps {
  /** 页面标题 */
  title?: React.ReactNode;
  /** 页面副标题 */
  subTitle?: React.ReactNode;
  /** 页面额外内容（显示在标题右侧） */
  extra?: React.ReactNode;
  /** 面包屑配置 */
  breadcrumb?: {
    items: Array<{
      title: React.ReactNode;
      path?: string;
    }>;
  };
  /** 标签页配置 */
  tabs?: {
    activeKey?: string;
    items: Array<{
      key: string;
      label: React.ReactNode;
    }>;
    onChange?: (key: string) => void;
  };
  /** 页面内容 */
  children: React.ReactNode;
  /** 是否使用毛玻璃效果 */
  glass?: boolean;
  /** 是否显示返回按钮 */
  showBack?: boolean;
  /** 返回事件 */
  onBack?: () => void;
  /** 额外的类名 */
  className?: string;
  /** 额外的样式 */
  style?: React.CSSProperties;
  /** 内容区域样式 */
  contentStyle?: React.CSSProperties;
}
