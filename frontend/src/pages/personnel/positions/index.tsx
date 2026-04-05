import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Form, Input, InputNumber, Popconfirm, Select, Space } from 'antd';
import { personnelApi } from '@/api/personnel';
import { systemApi } from '@/api/system';
import { BaseModal } from '@/components/common/BaseModal';
import { BaseTable } from '@/components/table/BaseTable';

interface PositionRecord {
  id: string;
  name: string;
  code: string;
  description?: string;
  department_id: string;
  level?: number;
  sequence?: string;
  platform_id?: string;
}

interface DepartmentRecord {
  id: string;
  name: string;
}

const columns: ProColumns<PositionRecord>[] = [
  { title: '岗位名称', dataIndex: 'name' },
  { title: '岗位编码', dataIndex: 'code' },
  { title: '描述', dataIndex: 'description' },
  { title: '岗位等级', dataIndex: 'level' },
  { title: '岗位序列', dataIndex: 'sequence' }
];

export default function PositionsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PositionRecord | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery<PositionRecord[]>({
    queryKey: ['personnel-positions'],
    queryFn: personnelApi.listPositions
  });
  const { data: departments = [] } = useQuery<DepartmentRecord[]>({
    queryKey: ['system-department-options'],
    queryFn: systemApi.listDepartments
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['personnel-positions'] });
  const createMutation = useMutation({
    mutationFn: personnelApi.createPosition,
    onSuccess: async () => {
      setOpen(false);
      form.resetFields();
      await refresh();
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => personnelApi.updatePosition(id, payload),
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      form.resetFields();
      await refresh();
    }
  });
  const deleteMutation = useMutation({ mutationFn: personnelApi.deletePosition, onSuccess: refresh });

  return (
    <Card
      title="岗位管理"
      extra={
        <Button type="primary" onClick={() => setOpen(true)}>
          新增岗位
        </Button>
      }
    >
      <BaseTable<PositionRecord>
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
                <Popconfirm title="确认删除该岗位？" onConfirm={() => deleteMutation.mutate(record.id)}>
                  <Button type="link" danger>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            )
          }
        ]}
        dataSource={data}
        loading={isLoading}
      />
      <BaseModal
        open={open}
        title={editing ? '编辑岗位' : '新增岗位'}
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
          <Form.Item label="岗位名称" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="岗位编码" name="code" rules={[{ required: !editing }]}>
            <Input disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item label="所属部门" name="department_id" rules={[{ required: true }]}>
            <Select options={departments.map((item) => ({ label: item.name, value: item.id }))} />
          </Form.Item>
          <Form.Item label="岗位等级" name="level">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="岗位序列" name="sequence">
            <Input />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </BaseModal>
    </Card>
  );
}
