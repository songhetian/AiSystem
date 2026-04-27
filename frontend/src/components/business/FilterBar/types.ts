/**
 * FilterBar组件类型定义
 */

import React from 'react';

export interface FilterItem {
  /** 字段名 */
  name: string;
  /** 标签 */
  label: string;
  /** 输入类型 */
  type: 'input' | 'select' | 'dateRange' | 'date' | 'custom';
  /** 占位符 */
  placeholder?: string;
  /** 选项（用于select类型） */
  options?: Array<{ label: string; value: any }>;
  /** 自定义渲染（用于custom类型） */
  render?: () => React.ReactNode;
  /** 默认值 */
  defaultValue?: any;
  /** 是否必填 */
  required?: boolean;
}

export interface FilterBarProps {
  /** 筛选项配置 */
  items: FilterItem[];
  /** 初始值 */
  initialValues?: Record<string, any>;
  /** 是否显示展开/收起按钮 */
  collapsible?: boolean;
  /** 默认展开的行数 */
  defaultRows?: number;
  /** 是否使用毛玻璃效果 */
  glass?: boolean;
  /** 搜索按钮文本 */
  searchText?: string;
  /** 重置按钮文本 */
  resetText?: string;
  /** 搜索事件 */
  onSearch?: (values: Record<string, any>) => void;
  /** 重置事件 */
  onReset?: () => void;
  /** 值变化事件 */
  onChange?: (values: Record<string, any>) => void;
  /** 额外的类名 */
  className?: string;
  /** 额外的样式 */
  style?: React.CSSProperties;
}
