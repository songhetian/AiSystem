/**
 * Table组件类型定义
 */

import React from 'react';
import { TableProps as AntTableProps } from 'antd';

export interface TableColumn<T = any> {
  /** 列标题 */
  title: React.ReactNode;
  /** 列数据字段 */
  dataIndex?: string;
  /** 列唯一标识 */
  key?: string;
  /** 列宽度 */
  width?: number | string;
  /** 列对齐方式 */
  align?: 'left' | 'center' | 'right';
  /** 是否固定列 */
  fixed?: 'left' | 'right';
  /** 是否可排序 */
  sorter?: boolean | ((a: T, b: T) => number);
  /** 自定义渲染 */
  render?: (value: any, record: T, index: number) => React.ReactNode;
  /** 是否省略显示 */
  ellipsis?: boolean;
}

export interface TableProps<T = any> extends Omit<AntTableProps<T>, 'columns'> {
  /** 表格列配置 */
  columns: TableColumn<T>[];
  /** 表格数据 */
  dataSource?: T[];
  /** 是否使用毛玻璃效果 */
  glass?: boolean;
  /** 表格密度 */
  density?: 'default' | 'compact' | 'comfortable';
  /** 是否显示边框 */
  bordered?: boolean;
  /** 是否显示斑马纹 */
  striped?: boolean;
  /** 是否可悬停 */
  hoverable?: boolean;
  /** 加载状态 */
  loading?: boolean;
  /** 分页配置 */
  pagination?: false | {
    current?: number;
    pageSize?: number;
    total?: number;
    showSizeChanger?: boolean;
    showQuickJumper?: boolean;
    showTotal?: (total: number) => React.ReactNode;
    onChange?: (page: number, pageSize: number) => void;
  };
  /** 行选择配置 */
  rowSelection?: {
    selectedRowKeys?: React.Key[];
    onChange?: (selectedRowKeys: React.Key[], selectedRows: T[]) => void;
    type?: 'checkbox' | 'radio';
  };
  /** 行点击事件 */
  onRow?: (record: T, index: number) => {
    onClick?: (event: React.MouseEvent<HTMLElement>) => void;
    onDoubleClick?: (event: React.MouseEvent<HTMLElement>) => void;
  };
  /** 额外的类名 */
  className?: string;
  /** 额外的样式 */
  style?: React.CSSProperties;
}
