import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Form, Input, Popconfirm, Select, Space } from 'antd';
import { systemApi } from '@/api/system';
import { BaseModal } from '@/components/common/BaseModal';
import { Permission } from '@/components/permission/Permission';
import { BaseTable } from '@/components/table/BaseTable';

interface ApiRecord {
  id: string;
  api_path: string;
  request_method: string;
  api_name: string;
  status: number;
}

const baseColumns: ProColumns<ApiRecord>[] = [
  { title: '接口路径', dataIndex: 'api_path' },
  { title: '请求方法', dataIndex: 'request_method' },
  { title: '接口名称', dataIndex: 'api_name' },
  { title: '状态', dataIndex: 'status', render: (_, record) => (record.status === 1 ? '启用' : '禁用') }
];

export default function SystemApisPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiRecord | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery<ApiRecord[]>({
    queryKey: ['system-apis'],
    queryFn: systemApi.listApis
  });

  const createMutation = useMutation({
    mutationFn: systemApi.createApi,
    onSuccess: async () => {
      setOpen(false);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['system-apis'] });
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => systemApi.updateApi(id, payload),
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['system-apis'] });
    }
  });
  const deleteMutation = useMutation({
    mutationFn: systemApi.deleteApi,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['system-apis'] });
    }
  });

  const columns: ProColumns<ApiRecord>[] = [
    ...baseColumns,
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          <Permission code="system:api:update">
            <Button
              type="link"
              onClick={() => {
                setEditing(record);
                form.setFieldsValue({
                  api_path: record.api_path,
                  request_method: record.request_method,
                  api_name: record.api_name,
                  status: record.status,
                  role_ids: ''
                });
                setOpen(true);
              }}
            >
              编辑
            </Button>
          </Permission>
          <Permission code="system:api:delete">
            <Popconfirm title="确认删除该接口？" onConfirm={() => deleteMutation.mutate(record.id)}>
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
      title="接口管理"
      extra={
        <Permission code="system:api:create">
          <Button type="primary" onClick={() => setOpen(true)}>
            新增接口
          </Button>
        </Permission>
      }
    >
      <BaseTable<ApiRecord> rowKey="id" columns={columns} dataSource={data} loading={isLoading} />
      <BaseModal
        open={open}
        title={editing ? '编辑接口' : '新增接口'}
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
            const payload = {
              ...values,
              role_ids: values.role_ids ? values.role_ids.split(',').map((item: string) => item.trim()) : []
            };
            if (editing) {
              updateMutation.mutate({ id: editing.id, payload });
            } else {
              createMutation.mutate(payload);
            }
          }}
        >
          <Form.Item label="接口路径" name="api_path" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="请求方式" name="request_method" initialValue="GET" rules={[{ required: true }]}>
            <Select options={['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((value) => ({ label: value, value }))} />
          </Form.Item>
          <Form.Item label="接口名称" name="api_name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="角色ID列表" name="role_ids">
            <Input placeholder="多个角色 ID 用逗号分隔" />
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue={1}>
            <Select options={[{ label: '启用', value: 1 }, { label: '禁用', value: 0 }]} />
          </Form.Item>
        </Form>
      </BaseModal>
    </Card>
  );
}
