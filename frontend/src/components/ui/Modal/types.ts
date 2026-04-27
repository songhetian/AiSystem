/**
 * Modal组件类型定义
 */

import React from 'react';
import { ModalProps as AntModalProps } from 'antd';

export interface ModalProps extends Omit<AntModalProps, 'footer'> {
  /** 是否显示模态框 */
  visible?: boolean;
  /** 模态框标题 */
  title?: React.ReactNode;
  /** 模态框内容 */
  children?: React.ReactNode;
  /** 是否使用毛玻璃效果 */
  glass?: boolean;
  /** 模态框宽度 */
  width?: number | string;
  /** 是否显示关闭按钮 */
  closable?: boolean;
  /** 是否显示遮罩 */
  mask?: boolean;
  /** 点击遮罩是否关闭 */
  maskClosable?: boolean;
  /** 是否居中显示 */
  centered?: boolean;
  /** 底部内容 */
  footer?: React.ReactNode | null;
  /** 确认按钮文字 */
  okText?: string;
  /** 取消按钮文字 */
  cancelText?: string;
  /** 确认按钮类型 */
  okType?: 'primary' | 'danger';
  /** 确认按钮加载状态 */
  confirmLoading?: boolean;
  /** 关闭事件 */
  onCancel?: (e: React.MouseEvent<HTMLElement>) => void;
  /** 确认事件 */
  onOk?: (e: React.MouseEvent<HTMLElement>) => void;
  /** 额外的类名 */
  className?: string;
  /** 额外的样式 */
  style?: React.CSSProperties;
  /** 内容区域样式 */
  bodyStyle?: React.CSSProperties;
}
