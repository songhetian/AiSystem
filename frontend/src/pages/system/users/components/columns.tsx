import type { ProColumns } from "@ant-design/pro-components";
import { Space, Button, Popconfirm } from "antd";
import { Permission } from "@/components/permission/Permission";
import type { ColumnConfig } from "@/components/table/ColumnCustomizer";

export const getUserColumns = (
  onEdit: (record: any) => void,
  onDelete: (id: string) => void,
  onReset: (id: string) => void,
  onAssign: (record: any) => void,
  columnConfig?: ColumnConfig[],
): ProColumns<any>[] => {
  const allColumns: ProColumns<any>[] = [
    { key: "username", title: "用户名", dataIndex: "username" },
    { key: "name", title: "姓名", dataIndex: "name" },
    { key: "phone", title: "手机号", dataIndex: "phone" },
    { key: "email", title: "邮箱", dataIndex: "email" },
    {
      key: "status",
      title: "状态",
      dataIndex: "status",
      render: (_, record) => (record.status === 1 ? "启用" : "禁用"),
    },
    {
      key: "last_login_time",
      title: "最后登录",
      dataIndex: "last_login_time",
      valueType: "dateTime",
    },
    {
      key: "create_time",
      title: "创建时间",
      dataIndex: "create_time",
      valueType: "dateTime",
    },
    {
      key: "actions",
      title: "操作",
      render: (_, record) => (
        <Space>
          <Permission code="system:user:assign-role">
            <Button type="link" onClick={() => onAssign(record)}>
              分配角色
            </Button>
          </Permission>
          <Permission code="system:user:update">
            <Button type="link" onClick={() => onEdit(record)}>
              编辑
            </Button>
          </Permission>
          <Permission code="system:user:reset-password">
            <Popconfirm
              title="确认重置密码？"
              onConfirm={() => onReset(record.id)}
            >
              <Button type="link">重置密码</Button>
            </Popconfirm>
          </Permission>
          <Permission code="system:user:delete">
            <Popconfirm
              title="确认删除？"
              onConfirm={() => onDelete(record.id)}
            >
              <Button type="link" danger>
                删除
              </Button>
            </Popconfirm>
          </Permission>
        </Space>
      ),
    },
  ];

  // 如果提供了列配置，则根据配置过滤和排序
  if (columnConfig) {
    const visibleKeys = new Set(
      columnConfig.filter((c) => c.visible).map((c) => c.key),
    );
    return columnConfig
      .filter((c) => c.visible)
      .map((c) => allColumns.find((col) => col.key === c.key))
      .filter(Boolean) as ProColumns<any>[];
  }

  return allColumns;
};
