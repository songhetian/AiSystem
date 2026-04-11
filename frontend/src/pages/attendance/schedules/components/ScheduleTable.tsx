import { useDroppable } from "@dnd-kit/core";
import { Table, Typography } from "antd";
import type { ProColumns } from "@ant-design/pro-components";

const { Text } = Typography;

interface ScheduleTableProps {
  data: any;
  loading: boolean;
}

const DroppableCell = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`w-full h-full min-h-[40px] ${isOver ? 'bg-blue-50' : ''}`}>
      {children}
    </div>
  );
};

export const ScheduleTable = ({ data, loading }: ScheduleTableProps) => {
  if (!data) return null;

  const columns: ProColumns<any>[] = [
    { title: "员工", dataIndex: "employee_name", fixed: "left", width: 120 },
    ...data.days.map((day: any) => ({
      title: day.label,
      dataIndex: day.key,
      width: 100,
      render: (_: any, record: any) => (
        <DroppableCell id={`cell-${record.employee_id}-${day.key}`}>
          {record.schedules.find((s: any) => s.date === day.key)?.shift_name || ""}
        </DroppableCell>
      ),
    })),
  ];

  return (
    <Table
      columns={columns}
      dataSource={data.rows}
      loading={loading}
      rowKey="employee_id"
      bordered
      scroll={{ x: 1500 }}
    />
  );
};
