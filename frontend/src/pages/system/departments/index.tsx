import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Form, Input, InputNumber, Popconfirm, Select, Space, Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { systemApi } from '@/api/system';
import { BaseModal } from '@/components/common/BaseModal';

interface DepartmentNode {
  id: string;
  name: string;
  code: string;
  parent_id?: string | null;
  status: number;
  sort: number;
  platform_id?: string;
  children?: DepartmentNode[];
}

interface PlatformRecord {
  id: string;
  name: string;
}

export default function SystemDepartmentsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentNode | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { data: departments = [], isLoading } = useQuery<DepartmentNode[]>({
    queryKey: ['system-departments-tree'],
    queryFn: systemApi.listDepartmentTree
  });
  const { data: platforms = [] } = useQuery<PlatformRecord[]>({
    queryKey: ['system-platform-options'],
    queryFn: systemApi.listPlatforms
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['system-departments-tree'] });
  const createMutation = useMutation({
    mutationFn: systemApi.createDepartment,
    onSuccess: async () => {
      setOpen(false);
      form.resetFields();
      await refresh();
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => systemApi.updateDepartment(id, payload),
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      form.resetFields();
      await refresh();
    }
  });
  const deleteMutation = useMutation({ mutationFn: systemApi.deleteDepartment, onSuccess: refresh });

  return (
    <Card
      title="部门管理"
      loading={isLoading}
      extra={
        <Button type="primary" onClick={() => setOpen(true)}>
          新增部门
        </Button>
      }
    >
      <Tree defaultExpandAll treeData={buildDepartmentTree(departments, setEditing, deleteMutation.mutate)} />
      <BaseModal
        open={open}
        title={editing ? '编辑部门' : '新增部门'}
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
          <Form.Item label="部门名称" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="部门编码" name="code" rules={[{ required: !editing }]}>
            <Input disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item label="上级部门" name="parent_id">
            <Select allowClear options={flattenDepartmentOptions(departments)} />
          </Form.Item>
          <Form.Item label="所属平台" name="platform_id">
            <Select allowClear options={platforms.map((item) => ({ label: item.name, value: item.id }))} />
          </Form.Item>
          <Form.Item label="排序" name="sort" initialValue={0}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue={1}>
            <Select options={[{ label: '启用', value: 1 }, { label: '禁用', value: 0 }]} />
          </Form.Item>
        </Form>
      </BaseModal>
    </Card>
  );
}

function buildDepartmentTree(items: DepartmentNode[], setEditing: (item: DepartmentNode) => void, onDelete: (id: string) => void): DataNode[] {
  return items.map((item) => ({
    key: item.id,
    title: (
      <Space>
        <span>{item.name}</span>
        <Button type="link" size="small" onClick={() => setEditing(item)}>
          编辑
        </Button>
        <Popconfirm title="确认删除该部门？" onConfirm={() => onDelete(item.id)}>
          <Button type="link" size="small" danger>
            删除
          </Button>
        </Popconfirm>
      </Space>
    ),
    children: buildDepartmentTree(item.children ?? [], setEditing, onDelete)
  }));
}

function flattenDepartmentOptions(items: DepartmentNode[], prefix = ''): Array<{ label: string; value: string }> {
  return items.flatMap((item) => [
    { label: `${prefix}${item.name}`, value: item.id },
    ...flattenDepartmentOptions(item.children ?? [], `${prefix}${item.name} / `)
  ]);
}
