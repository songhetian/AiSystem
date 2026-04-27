/**
 * Drawer组件类型定义
 */

import React from 'react';
import { DrawerProps as AntDrawerProps } from 'antd';

export type DrawerPlacement = 'top' | 'right' | 'bottom' | 'left';

export interface DrawerProps extends Omit<AntDrawerProps, 'footer'> {
  /** 是否显示抽屉 */
  visible?: boolean;
  /** 抽屉标题 */
  title?: React.ReactNode;
  /** 抽屉内容 */
  children?: React.ReactNode;
  /** 是否使用毛玻璃效果 */
  glass?: boolean;
  /** 抽屉宽度（placement为left或right时） */
  width?: number | string;
  /** 抽屉高度（placement为top或bottom时） */
  height?: number | string;
  /** 抽屉位置 */
  placement?: DrawerPlacement;
  /** 是否显示关闭按钮 */
  closable?: boolean;
  /** 是否显示遮罩 */
  mask?: boolean;
  /** 点击遮罩是否关闭 */
  maskClosable?: boolean;
  /** 底部内容 */
  footer?: React.ReactNode;
  /** 额外操作区域 */
  extra?: React.ReactNode;
  /** 关闭事件 */
  onClose?: (e: React.MouseEvent | React.KeyboardEvent) => void;
  /** 额外的类名 */
  className?: string;
  /** 额外的样式 */
  style?: React.CSSProperties;
  /** 内容区域样式 */
  bodyStyle?: React.CSSProperties;
  /** 头部样式 */
  headerStyle?: React.CSSProperties;
  /** 底部样式 */
  footerStyle?: React.CSSProperties;
}
