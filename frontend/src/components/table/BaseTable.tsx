import { ProTable, type ProColumns } from '@ant-design/pro-components';

export interface BaseTableProps<T extends object> {
  rowKey: string;
  columns: ProColumns<T>[];
  dataSource: T[];
  loading?: boolean;
  rowSelection?: Record<string, unknown>;
  pagination?: Record<string, unknown>;
}

export function BaseTable<T extends object>(props: BaseTableProps<T>) {
  return (
    <ProTable<T>
      search={false}
      options={false}
      pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50] }}
      {...props}
    />
  );
}

export default BaseTable;
