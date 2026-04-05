import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Form, Input, Popconfirm, Select, Space } from 'antd';
import { systemApi } from '@/api/system';
import { BaseModal } from '@/components/common/BaseModal';
import { Permission } from '@/components/permission/Permission';
import { BaseTable } from '@/components/table/BaseTable';

interface UserRecord {
  id: string;
  username: string;
  name: string;
  phone?: string;
  email?: string;
  status: number;
}

const baseColumns: ProColumns<UserRecord>[] = [
  { title: '用户名', dataIndex: 'username' },
  { title: '姓名', dataIndex: 'name' },
  { title: '手机号', dataIndex: 'phone' },
  { title: '邮箱', dataIndex: 'email' },
  {
    title: '状态',
    dataIndex: 'status',
    render: (_, record) => (record.status === 1 ? '启用' : '禁用')
  }
];

export default function SystemUsersPage() {
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>();
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery<UserRecord[]>({
    queryKey: ['system-users'],
    queryFn: systemApi.listUsers
  });
  const { data: roles = [] } = useQuery<Array<{ id: string; role_name: string }>>({
    queryKey: ['system-roles-options'],
    queryFn: systemApi.listRoles
  });

  const refresh = async () => {
    setSelectedIds([]);
    await queryClient.invalidateQueries({ queryKey: ['system-users'] });
  };

  const createMutation = useMutation({
    mutationFn: systemApi.createUser,
    onSuccess: async () => {
      setOpen(false);
      form.resetFields();
      await refresh();
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => systemApi.updateUser(id, payload),
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      form.resetFields();
      await refresh();
    }
  });
  const deleteMutation = useMutation({
    mutationFn: systemApi.deleteUser,
    onSuccess: refresh
  });
  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => systemApi.resetUserPassword(id),
    onSuccess: refresh
  });
  const batchStatusMutation = useMutation({
    mutationFn: systemApi.batchUpdateUserStatus,
    onSuccess: refresh
  });
  const assignMutation = useMutation({
    mutationFn: systemApi.assignUserRoles,
    onSuccess: async () => {
      setAssignOpen(false);
      setCurrentUserId(undefined);
      assignForm.resetFields();
      await refresh();
    }
  });

  const columns: ProColumns<UserRecord>[] = [
    ...baseColumns,
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          <Permission code="system:user:assign-role">
            <Button
              type="link"
              onClick={async () => {
                setCurrentUserId(record.id);
                const result = await systemApi.getUserRoles(record.id);
                assignForm.setFieldsValue({ role_ids: result.role_ids });
                setAssignOpen(true);
              }}
            >
              分配角色
            </Button>
          </Permission>
          <Permission code="system:user:update">
            <Button
              type="link"
              onClick={() => {
                setEditing(record);
                form.setFieldsValue(record);
                setOpen(true);
              }}
            >
              编辑
            </Button>
          </Permission>
          <Permission code="system:user:reset-password">
            <Popconfirm title="确认将该用户密码重置为默认密码？" onConfirm={() => resetPasswordMutation.mutate(record.id)}>
              <Button type="link">重置密码</Button>
            </Popconfirm>
          </Permission>
          <Permission code="system:user:delete">
            <Popconfirm title="确认删除该用户？" onConfirm={() => deleteMutation.mutate(record.id)}>
              <Button type="link" danger>
                删除
              </Button>
            </Popconfirm>
          </Permission>
        </Space>
      )
    }
  ];

  return (
    <Card
      title="用户管理"
      extra={
        <Space>
          <Permission code="system:user:batch-status">
            <Button disabled={selectedIds.length === 0} onClick={() => batchStatusMutation.mutate({ ids: selectedIds, status: 1 })}>
              批量启用
            </Button>
            <Button disabled={selectedIds.length === 0} onClick={() => batchStatusMutation.mutate({ ids: selectedIds, status: 0 })}>
              批量禁用
            </Button>
          </Permission>
          <Permission code="system:user:create">
            <Button type="primary" onClick={() => setOpen(true)}>
              新增用户
            </Button>
          </Permission>
        </Space>
      }
    >
      <BaseTable<UserRecord>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={isLoading}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => setSelectedIds(keys as string[])
        }}
      />
      <BaseModal
        open={open}
        title={editing ? '编辑用户' : '新增用户'}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            if (editing) {
              updateMutation.mutate({ id: editing.id, payload: values });
            } else {
              createMutation.mutate(values);
            }
          }}
        >
          <Form.Item label="用户名" name="username" rules={[{ required: !editing }]}>
            <Input disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item label="姓名" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="手机号" name="phone">
            <Input />
          </Form.Item>
          <Form.Item label="邮箱" name="email">
            <Input />
          </Form.Item>
          {!editing ? (
            <Form.Item label="密码" name="password" rules={[{ required: true, min: 6 }]}>
              <Input.Password />
            </Form.Item>
          ) : null}
          <Form.Item label="状态" name="status" initialValue={1}>
            <Select options={[{ label: '启用', value: 1 }, { label: '禁用', value: 0 }]} />
          </Form.Item>
        </Form>
      </BaseModal>
      <BaseModal open={assignOpen} title="分配角色" onCancel={() => setAssignOpen(false)} onOk={() => assignForm.submit()}>
        <Form
          form={assignForm}
          layout="vertical"
          onFinish={(values) =>
            assignMutation.mutate({
              user_id: currentUserId!,
              role_ids: values.role_ids ?? []
            })
          }
        >
          <Form.Item label="角色" name="role_ids">
            <Select mode="multiple" options={roles.map((item) => ({ label: item.role_name, value: item.id }))} />
          </Form.Item>
        </Form>
      </BaseModal>
    </Card>
  );
}
