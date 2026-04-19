import { Table } from "antd";
import type { ColumnType } from "antd/es/table";
import { RequestStatusTag } from "./RequestStatusTag";

interface RequestTableProps {
  data: any[];
  loading: boolean;
  columns: ColumnType<any>[];
}

export const RequestTable = ({ data, loading, columns }: RequestTableProps) => {
  return (
    <Table
      dataSource={data}
      columns={[
        ...columns,
        {
          title: "审批状态",
          dataIndex: "approval_status",
          render: (status: number) => <RequestStatusTag status={status} />,
        },
      ]}
      loading={loading}
      rowKey="id"
      bordered
    />
  );
};
