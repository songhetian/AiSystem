import { ProTable, type ProColumns } from "@ant-design/pro-components";
import type { SpinProps } from "antd";

export interface BaseTableProps<T extends object> {
  rowKey?: string;
  columns: ProColumns<T>[];
  dataSource?: T[];
  loading?: boolean | SpinProps;
  rowSelection?: Record<string, unknown>;
  pagination?: Record<string, unknown>;
  request?: (
    params: Record<string, any>,
    sort?: Record<string, any>,
    filter?: Record<string, any>,
  ) => Promise<{
    data: T[];
    success: boolean;
    total?: number;
  }>;
  toolBarRender?: () => React.ReactNode[];
  scroll?: { x?: number; y?: number };
  [key: string]: any;
}

export function BaseTable<T extends object>(props: BaseTableProps<T>) {
  return (
    <ProTable<T>
      search={false}
      options={props.options !== false ? {
        fullScreen: false,
        reload: false,
        setting: { draggable: true, checkable: true },
        density: true,
      } : false}
      columnsState={{
        persistenceKey: props.persistenceKey,
        persistenceType: "localStorage",
      }}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        pageSizeOptions: [10, 20, 50],
      }}
      {...props}
    />
  );
}

export default BaseTable;
