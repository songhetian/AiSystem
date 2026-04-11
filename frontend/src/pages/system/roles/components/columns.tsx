import type { ProColumns } from "@ant-design/pro-components";
import { Space, Button, Popconfirm } from "antd";
import { Permission } from "@/components/permission/Permission";

export const getRoleColumns = (onEdit: (record: any) => void, onDelete: (id: string) => void): ProColumns<any>[] => [
  { title: "角色名称", dataIndex: "role_name" },
  { title: "角色编码", dataIndex: "role_code" },
  { title: "描述", dataIndex: "description" },
  {
    title: "状态",
    dataIndex: "status",
    render: (_, record) => (record.status === 1 ? "启用" : "禁用"),
  },
  {
    title: "操作",
    render: (_, record) => (
      <Space>
        <Permission code="system:role:update">
          <Button type="link" onClick={() => onEdit(record)}>编辑</Button>
        </Permission>
        <Permission code="system:role:delete">
          <Popconfirm title="确认删除？" onConfirm={() => onDelete(record.id)}>
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </Permission>
      </Space>
    ),
  },
];
