import type { ProColumns } from "@ant-design/pro-components";
import { Space, Button, Popconfirm } from "antd";
import { Permission } from "@/components/permission/Permission";

export const getUserColumns = (onEdit: (record: any) => void, onDelete: (id: string) => void, onReset: (id: string) => void, onAssign: (record: any) => void): ProColumns<any>[] => [
  { title: "用户名", dataIndex: "username" },
  { title: "姓名", dataIndex: "name" },
  { title: "手机号", dataIndex: "phone" },
  { title: "邮箱", dataIndex: "email" },
  {
    title: "状态",
    dataIndex: "status",
    render: (_, record) => (record.status === 1 ? "启用" : "禁用"),
  },
  {
    title: "操作",
    render: (_, record) => (
      <Space>
        <Permission code="system:user:assign-role">
          <Button type="link" onClick={() => onAssign(record)}>分配角色</Button>
        </Permission>
        <Permission code="system:user:update">
          <Button type="link" onClick={() => onEdit(record)}>编辑</Button>
        </Permission>
        <Permission code="system:user:reset-password">
          <Popconfirm title="确认重置密码？" onConfirm={() => onReset(record.id)}>
            <Button type="link">重置密码</Button>
          </Popconfirm>
        </Permission>
        <Permission code="system:user:delete">
          <Popconfirm title="确认删除？" onConfirm={() => onDelete(record.id)}>
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </Permission>
      </Space>
    ),
  },
];
