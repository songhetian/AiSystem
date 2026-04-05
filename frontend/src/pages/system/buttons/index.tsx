import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Form, Input, Popconfirm, Select, Space } from 'antd';
import { systemApi } from '@/api/system';
import { BaseModal } from '@/components/common/BaseModal';
import { Permission } from '@/components/permission/Permission';
import { BaseTable } from '@/components/table/BaseTable';

interface MenuRecord {
  id: string;
  menu_name: string;
}

interface ButtonRecord {
  id: string;
  button_name: string;
  button_code: string;
  status: number;
  menu?: MenuRecord;
}

export default function SystemButtonsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ButtonRecord | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { data: buttons = [], isLoading } = useQuery<ButtonRecord[]>({
    queryKey: ['system-buttons'],
    queryFn: systemApi.listButtons
  });
  const { data: menus = [] } = useQuery<MenuRecord[]>({
    queryKey: ['system-menus-all'],
    queryFn: systemApi.listMenus
  });

  const createMutation = useMutation({
    mutationFn: systemApi.createButton,
    onSuccess: async () => {
      setOpen(false);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['system-buttons'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => systemApi.updateButton(id, payload),
    onSuccess: async () => {
      setEditing(null);
      setOpen(false);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['system-buttons'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: systemApi.deleteButton,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['system-buttons'] });
    }
  });

  const columns: ProColumns<ButtonRecord>[] = [
    { title: '按钮名称', dataIndex: 'button_name' },
    { title: '按钮编码', dataIndex: 'button_code' },
    { title: '所属菜单', render: (_, record) => record.menu?.menu_name ?? '-' },
    { title: '状态', dataIndex: 'status', render: (_, record) => (record.status === 1 ? '启用' : '禁用') },
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          <Permission code="system:button:update">
            <Button
              type="link"
              onClick={() => {
                setEditing(record);
                form.setFieldsValue({
                  button_name: record.button_name,
                  menu_id: record.menu?.id,
                  status: record.status
                });
                setOpen(true);
              }}
            >
              编辑
            </Button>
          </Permission>
          <Permission code="system:button:delete">
            <Popconfirm title="确认删除该按钮？" onConfirm={() => deleteMutation.mutate(record.id)}>
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
      title="按钮管理"
      extra={
        <Permission code="system:button:create">
          <Button type="primary" onClick={() => setOpen(true)}>
            新增按钮
          </Button>
        </Permission>
      }
    >
      <BaseTable<ButtonRecord> rowKey="id" columns={columns} dataSource={buttons} loading={isLoading} />
      <BaseModal
        open={open}
        title={editing ? '编辑按钮' : '新增按钮'}
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
          <Form.Item label="按钮名称" name="button_name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="按钮编码" name="button_code" rules={[{ required: !editing }]}>
            <Input disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item label="所属菜单" name="menu_id" rules={[{ required: true }]}>
            <Select options={menus.map((item) => ({ label: item.menu_name, value: item.id }))} />
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue={1} rules={[{ required: true }]}>
            <Select options={[{ label: '启用', value: 1 }, { label: '禁用', value: 0 }]} />
          </Form.Item>
        </Form>
      </BaseModal>
    </Card>
  );
}
