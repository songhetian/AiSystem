/**
 * Form组件类型定义
 */

import React from 'react';
import { FormProps as AntFormProps, FormItemProps as AntFormItemProps } from 'antd';

export type FormLayout = 'horizontal' | 'vertical' | 'inline';
export type FormSize = 'small' | 'middle' | 'large';

export interface FormProps extends AntFormProps {
  /** 表单布局 */
  layout?: FormLayout;
  /** 表单尺寸 */
  size?: FormSize;
  /** 是否使用毛玻璃效果 */
  glass?: boolean;
  /** 标签对齐方式 */
  labelAlign?: 'left' | 'right';
  /** 标签宽度 */
  labelCol?: {
    span?: number;
    offset?: number;
  };
  /** 控件宽度 */
  wrapperCol?: {
    span?: number;
    offset?: number;
  };
  /** 是否显示冒号 */
  colon?: boolean;
  /** 表单初始值 */
  initialValues?: Record<string, any>;
  /** 提交事件 */
  onFinish?: (values: any) => void;
  /** 提交失败事件 */
  onFinishFailed?: (errorInfo: any) => void;
  /** 表单值变化事件 */
  onValuesChange?: (changedValues: any, allValues: any) => void;
  /** 额外的类名 */
  className?: string;
  /** 额外的样式 */
  style?: React.CSSProperties;
  /** 子元素 */
  children?: React.ReactNode;
}

export interface FormItemProps extends AntFormItemProps {
  /** 字段名 */
  name?: string | string[];
  /** 标签文本 */
  label?: React.ReactNode;
  /** 是否必填 */
  required?: boolean;
  /** 校验规则 */
  rules?: any[];
  /** 提示信息 */
  tooltip?: React.ReactNode;
  /** 额外的提示信息 */
  extra?: React.ReactNode;
  /** 是否隐藏 */
  hidden?: boolean;
  /** 标签对齐方式 */
  labelAlign?: 'left' | 'right';
  /** 标签宽度 */
  labelCol?: {
    span?: number;
    offset?: number;
  };
  /** 控件宽度 */
  wrapperCol?: {
    span?: number;
    offset?: number;
  };
  /** 额外的类名 */
  className?: string;
  /** 额外的样式 */
  style?: React.CSSProperties;
  /** 子元素 */
  children?: React.ReactNode;
}
