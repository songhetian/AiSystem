import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Form, Popconfirm, Space } from "antd";
import { systemApi } from "@/api/system";
import { Permission } from "@/components/permission/Permission";
import { BaseTable } from "@/components/table/BaseTable";
import { useSystemCrud } from "./hooks/useSystemCrud";
import { getUserColumns } from "./components/columns";
import { UserModal } from "./components/UserModal";
import { AssignRoleModal } from "./components/AssignRoleModal";

export default function SystemUsersPage() {
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>();
  const [editing, setEditing] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();

  const { data = [], isLoading } = useQuery({
    queryKey: ["system-users"],
    queryFn: systemApi.listUsers,
  });
  const { data: roles = [] } = useQuery({
    queryKey: ["system-roles-options"],
    queryFn: systemApi.listRoles,
  });

  const crud = useSystemCrud(["system-users"], {
    create: systemApi.createUser,
    update: systemApi.updateUser,
    delete: systemApi.deleteUser,
  });

  return (
    <Card
      title="用户管理"
      extra={
        <Space>
          <Permission code="system:user:batch-status">
            <Button
              disabled={selectedIds.length === 0}
              onClick={() =>
                systemApi
                  .batchUpdateUserStatus({ ids: selectedIds, status: 1 })
                  .then(crud.refresh)
              }
            >
              批量启用
            </Button>
            <Button
              disabled={selectedIds.length === 0}
              onClick={() =>
                systemApi
                  .batchUpdateUserStatus({ ids: selectedIds, status: 0 })
                  .then(crud.refresh)
              }
            >
              批量禁用
            </Button>
          </Permission>
          <Permission code="system:user:create">
            <Button
              type="primary"
              onClick={() => {
                setEditing(null);
                form.resetFields();
                setOpen(true);
              }}
            >
              新增用户
            </Button>
          </Permission>
        </Space>
      }
    >
      <BaseTable
        rowKey="id"
        columns={getUserColumns(
          (rec) => {
            setEditing(rec);
            form.setFieldsValue(rec);
            setOpen(true);
          },
          crud.remove,
          (id) =>
            systemApi
              .resetUserPassword(id, { password: "123456" })
              .then(crud.refresh),
          async (rec) => {
            setCurrentUserId(rec.id);
            const r = await systemApi.getUserRoles(rec.id);
            assignForm.setFieldsValue({ role_ids: r.role_ids });
            setAssignOpen(true);
          },
        )}
        dataSource={data}
        loading={isLoading}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys: React.Key[]) => setSelectedIds(keys as string[]),
        }}
      />

      <UserModal
        open={open}
        editing={editing}
        form={form}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
      />
      <AssignRoleModal
        open={assignOpen}
        form={assignForm}
        roles={roles}
        onCancel={() => setAssignOpen(false)}
        onOk={() => assignForm.submit()}
      />
    </Card>
  );
}
