import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Form, Input, Popconfirm, Select, Space } from 'antd';
import { systemApi } from '@/api/system';
import { BaseModal } from '@/components/common/BaseModal';
import { BaseTable } from '@/components/table/BaseTable';

interface ShopRecord {
  id: string;
  name: string;
  code: string;
  type: number;
  address?: string;
  phone?: string;
  platform_id: string;
  department_id: string;
  status: number;
}

interface PlatformRecord {
  id: string;
  name: string;
}

interface DepartmentRecord {
  id: string;
  name: string;
}

const columns: ProColumns<ShopRecord>[] = [
  { title: '店铺名称', dataIndex: 'name' },
  { title: '店铺编码', dataIndex: 'code' },
  { title: '类型', dataIndex: 'type', render: (_, record) => (record.type === 1 ? '线上' : '线下') },
  { title: '地址', dataIndex: 'address' },
  { title: '电话', dataIndex: 'phone' },
  { title: '状态', dataIndex: 'status', render: (_, record) => (record.status === 1 ? '启用' : '禁用') }
];

export default function SystemShopsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ShopRecord | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { data: shops = [], isLoading } = useQuery<ShopRecord[]>({
    queryKey: ['system-shops'],
    queryFn: systemApi.listShops
  });
  const { data: platforms = [] } = useQuery<PlatformRecord[]>({
    queryKey: ['system-platform-options'],
    queryFn: systemApi.listPlatforms
  });
  const { data: departments = [] } = useQuery<DepartmentRecord[]>({
    queryKey: ['system-department-options'],
    queryFn: systemApi.listDepartments
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['system-shops'] });
  const createMutation = useMutation({
    mutationFn: systemApi.createShop,
    onSuccess: async () => {
      setOpen(false);
      form.resetFields();
      await refresh();
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => systemApi.updateShop(id, payload),
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      form.resetFields();
      await refresh();
    }
  });
  const deleteMutation = useMutation({ mutationFn: systemApi.deleteShop, onSuccess: refresh });

  return (
    <Card
      title="店铺管理"
      extra={
        <Button type="primary" onClick={() => setOpen(true)}>
          新增店铺
        </Button>
      }
    >
      <BaseTable<ShopRecord>
        rowKey="id"
        columns={[
          ...columns,
          {
            title: '操作',
            render: (_, record) => (
              <Space>
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
                <Popconfirm title="确认删除该店铺？" onConfirm={() => deleteMutation.mutate(record.id)}>
                  <Button type="link" danger>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            )
          }
        ]}
        dataSource={shops}
        loading={isLoading}
      />
      <BaseModal
        open={open}
        title={editing ? '编辑店铺' : '新增店铺'}
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
          onFinish={(values) => (editing ? updateMutation.mutate({ id: editing.id, payload: values }) : createMutation.mutate(values))}
        >
          <Form.Item label="店铺名称" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="店铺编码" name="code" rules={[{ required: !editing }]}>
            <Input disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item label="店铺类型" name="type" initialValue={1}>
            <Select options={[{ label: '线上', value: 1 }, { label: '线下', value: 2 }]} />
          </Form.Item>
          <Form.Item label="所属平台" name="platform_id" rules={[{ required: true }]}>
            <Select options={platforms.map((item) => ({ label: item.name, value: item.id }))} />
          </Form.Item>
          <Form.Item label="所属部门" name="department_id" rules={[{ required: true }]}>
            <Select options={departments.map((item) => ({ label: item.name, value: item.id }))} />
          </Form.Item>
          <Form.Item label="地址" name="address">
            <Input />
          </Form.Item>
          <Form.Item label="电话" name="phone">
            <Input />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue={1}>
            <Select options={[{ label: '启用', value: 1 }, { label: '禁用', value: 0 }]} />
          </Form.Item>
        </Form>
      </BaseModal>
    </Card>
  );
}
