import { ProTable, type ProColumns } from '@ant-design/pro-components';

export interface BaseTableProps<T extends Record<string, unknown>> {
  rowKey: string;
  columns: ProColumns<T>[];
  dataSource: T[];
  loading?: boolean;
  rowSelection?: Record<string, unknown>;
}

export function BaseTable<T extends Record<string, unknown>>(props: BaseTableProps<T>) {
  return (
    <ProTable<T>
      search={false}
      options={false}
      pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50] }}
      {...props}
    />
  );
}
