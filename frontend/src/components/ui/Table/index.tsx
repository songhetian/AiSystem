/**
 * Table组件 - 高密度表格
 * 基于Ant Design Table封装，支持毛玻璃效果、多种密度、斑马纹
 */

import React from 'react';
import { Table as AntTable } from 'antd';
import classNames from 'classnames';
import { TableProps } from './types';
import styles from './index.module.less';

export const Table = <T extends object = any>({
  columns,
  dataSource,
  glass = false,
  density = 'default',
  bordered = false,
  striped = false,
  hoverable = true,
  loading = false,
  pagination,
  rowSelection,
  onRow,
  className,
  style,
  ...restProps
}: TableProps<T>) => {
  const tableClass = classNames(
    styles.table,
    {
      [styles.glass]: glass,
      [styles[`density-${density}`]]: density,
      [styles.striped]: striped,
      [styles.hoverable]: hoverable,
    },
    className
  );

  // 转换列配置为Ant Design格式
  const antColumns = columns.map((col) => ({
    ...col,
    ellipsis: col.ellipsis !== false, // 默认开启省略
  }));

  // 分页配置
  const paginationConfig = pagination === false ? false : {
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number) => `共 ${total} 条`,
    ...pagination,
  };

  return (
    <div className={tableClass} style={style}>
      <AntTable<T>
        columns={antColumns}
        dataSource={dataSource}
        bordered={bordered}
        loading={loading}
        pagination={paginationConfig}
        rowSelection={rowSelection}
        onRow={onRow}
        {...restProps}
      />
    </div>
  );
};

export default Table;
