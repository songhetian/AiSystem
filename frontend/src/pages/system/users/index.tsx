import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Form, Input, Modal, Space, message } from "antd";
import { systemApi } from "@/api/system";
import { Permission } from "@/components/permission/Permission";
import { BaseTable } from "@/components/table/BaseTable";
import { BaseModal } from "@/components/common/BaseModal";
import {
  ColumnCustomizer,
  loadColumnConfig,
  type ColumnConfig,
} from "@/components/table/ColumnCustomizer";
import { useSystemCrud } from "./hooks/useSystemCrud";
import { getUserColumns } from "./components/columns";
import { UserModal } from "./components/UserModal";
import { AssignRoleModal } from "./components/AssignRoleModal";

// 定义默认列配置
const defaultColumns: ColumnConfig[] = [
  { key: "username", title: "用户名", visible: true, fixed: true },
  { key: "name", title: "姓名", visible: true },
  { key: "phone", title: "手机号", visible: true },
  { key: "email", title: "邮箱", visible: true },
  { key: "status", title: "状态", visible: true },
  { key: "last_login_time", title: "最后登录", visible: false },
  { key: "create_time", title: "创建时间", visible: false },
  { key: "actions", title: "操作", visible: true, fixed: true },
];

export default function SystemUsersPage() {
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [batchAssignOpen, setBatchAssignOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>();
  const [editing, setEditing] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() =>
    loadColumnConfig("system-users-columns", defaultColumns),
  );
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [batchAssignForm] = Form.useForm();
  const [resetPasswordForm] = Form.useForm();

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

  const queryClient = useQueryClient();
  const batchResetPasswordMutation = useMutation({
    mutationFn: (password: string) =>
      systemApi.batchResetPassword({ ids: selectedIds, password }),
    onSuccess: () => {
      message.success(`已成功重置 ${selectedIds.length} 个用户的密码`);
      setResetPasswordOpen(false);
      resetPasswordForm.resetFields();
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["system-users"] });
    },
    onError: (e: any) =>
      message.error(e?.response?.data?.message || "批量重置密码失败"),
  });

  const batchAssignRolesMutation = useMutation({
    mutationFn: (role_ids: string[]) =>
      systemApi.batchAssignRoles({ ids: selectedIds, role_ids }),
    onSuccess: () => {
      message.success(`已成功为 ${selectedIds.length} 个用户分配角色`);
      setBatchAssignOpen(false);
      batchAssignForm.resetFields();
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["system-users"] });
    },
    onError: (e: any) =>
      message.error(e?.response?.data?.message || "批量分配角色失败"),
  });

  return (
    <Card
      title="用户管理"
      extra={
        <Space>
          <ColumnCustomizer
            columns={columnConfig}
            onChange={setColumnConfig}
            storageKey="system-users-columns"
          />
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
          <Permission code="system:user:batch-reset-password">
            <Button
              disabled={selectedIds.length === 0}
              onClick={() => {
                resetPasswordForm.setFieldsValue({ password: "123456" });
                setResetPasswordOpen(true);
              }}
            >
              批量重置密码 {selectedIds.length > 0 && `(${selectedIds.length})`}
            </Button>
          </Permission>
          <Permission code="system:user:batch-assign-roles">
            <Button
              disabled={selectedIds.length === 0}
              onClick={() => {
                batchAssignForm.resetFields();
                setBatchAssignOpen(true);
              }}
            >
              批量分配角色 {selectedIds.length > 0 && `(${selectedIds.length})`}
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
          columnConfig,
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

      {/* 批量重置密码弹窗 */}
      <BaseModal
        open={resetPasswordOpen}
        title={`批量重置密码 (${selectedIds.length}个用户)`}
        onCancel={() => {
          setResetPasswordOpen(false);
          resetPasswordForm.resetFields();
        }}
        onOk={() =>
          resetPasswordForm
            .validateFields()
            .then((values) =>
              batchResetPasswordMutation.mutate(values.password),
            )
        }
        confirmLoading={batchResetPasswordMutation.isPending}
      >
        <Form form={resetPasswordForm} layout="vertical">
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800 font-bold mb-2">
              ⚠️ 即将重置 {selectedIds.length} 个用户的密码
            </p>
            <p className="text-sm text-orange-700">
              重置后，这些用户需要使用新密码登录。建议通过系统消息或其他方式通知用户。
            </p>
          </div>

          <Form.Item
            label="新密码"
            name="password"
            rules={[
              { required: true, message: "请输入新密码" },
              { min: 6, message: "密码长度至少6位" },
            ]}
          >
            <Input.Password
              placeholder="输入新密码（默认：123456）"
              autoComplete="new-password"
            />
          </Form.Item>

          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">💡 提示：</p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4">
              <li>• 默认密码为 123456</li>
              <li>• 建议用户首次登录后修改密码</li>
              <li>• 密码长度至少6位</li>
            </ul>
          </div>
        </Form>
      </BaseModal>

      {/* 批量分配角色弹窗 */}
      <BaseModal
        open={batchAssignOpen}
        title={`批量分配角色 (${selectedIds.length}个用户)`}
        onCancel={() => {
          setBatchAssignOpen(false);
          batchAssignForm.resetFields();
        }}
        onOk={() =>
          batchAssignForm
            .validateFields()
            .then((values) => batchAssignRolesMutation.mutate(values.role_ids))
        }
        confirmLoading={batchAssignRolesMutation.isPending}
      >
        <Form form={batchAssignForm} layout="vertical">
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800 font-bold mb-2">
              ⚠️ 即将为 {selectedIds.length} 个用户分配角色
            </p>
            <p className="text-sm text-orange-700">
              分配后，这些用户将获得所选角色的权限，权限变更即时生效。
            </p>
          </div>

          <Form.Item
            label="选择角色"
            name="role_ids"
            rules={[{ required: true, message: "请至少选择一个角色" }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择要分配的角色"
              options={roles.map((item: any) => ({
                label: item.name || item.role_name,
                value: item.id,
              }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">💡 提示：</p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4">
              <li>• 可以同时选择多个角色</li>
              <li>• 角色权限会立即生效，无需用户重新登录</li>
              <li>• 此操作会覆盖用户原有的角色分配</li>
              <li>• 建议通过系统消息通知用户权限变更</li>
            </ul>
          </div>
        </Form>
      </BaseModal>
    </Card>
  );
}
