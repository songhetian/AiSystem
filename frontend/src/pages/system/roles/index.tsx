import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Form, Input, Popconfirm, Select, Space, Tree } from 'antd';
import { systemApi } from '@/api/system';
import { BaseModal } from '@/components/common/BaseModal';
import { Permission } from '@/components/permission/Permission';
import { BaseTable } from '@/components/table/BaseTable';

interface RoleRecord {
  id: string;
  role_name: string;
  role_code: string;
  description?: string;
  status: number;
}

interface MenuTreeNode {
  id: string;
  menu_name: string;
  children?: MenuTreeNode[];
}

const baseColumns: ProColumns<RoleRecord>[] = [
  { title: '角色名称', dataIndex: 'role_name' },
  { title: '角色编码', dataIndex: 'role_code' },
  { title: '描述', dataIndex: 'description' },
  {
    title: '状态',
    dataIndex: 'status',
    render: (_, record) => (record.status === 1 ? '启用' : '禁用')
  }
];

export default function SystemRolesPage() {
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [currentRoleId, setCurrentRoleId] = useState<string>();
  const [editing, setEditing] = useState<RoleRecord | null>(null);
  const [treeData, setTreeData] = useState<MenuTreeNode[]>([]);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [copyForm] = Form.useForm();
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery<RoleRecord[]>({
    queryKey: ['system-roles'],
    queryFn: systemApi.listRoles
  });
  const { data: buttons = [] } = useQuery<Array<{ id: string; button_name: string }>>({
    queryKey: ['system-buttons-options'],
    queryFn: systemApi.listButtons
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['system-roles'] });

  const createMutation = useMutation({
    mutationFn: systemApi.createRole,
    onSuccess: async () => {
      setOpen(false);
      form.resetFields();
      await refresh();
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => systemApi.updateRole(id, payload),
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      form.resetFields();
      await refresh();
    }
  });
  const deleteMutation = useMutation({
    mutationFn: systemApi.deleteRole,
    onSuccess: refresh
  });
  const copyMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => systemApi.copyRole(id, payload),
    onSuccess: async () => {
      setCopyOpen(false);
      setCurrentRoleId(undefined);
      copyForm.resetFields();
      await refresh();
    }
  });
  const assignMutation = useMutation({
    mutationFn: systemApi.assignRoleResources,
    onSuccess: async () => {
      setAssignOpen(false);
      setCurrentRoleId(undefined);
      assignForm.resetFields();
      await refresh();
    }
  });

  const columns: ProColumns<RoleRecord>[] = [
    ...baseColumns,
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          <Permission code="system:role:assign-permission">
            <Button
              type="link"
              onClick={async () => {
                setCurrentRoleId(record.id);
                const [result, menuTree] = await Promise.all([systemApi.getRoleResources(record.id), systemApi.listMenuTree(record.id)]);
                assignForm.setFieldsValue({
                  menu_ids: result.menu_ids,
                  button_ids: result.button_ids
                });
                setTreeData(menuTree.items);
                setAssignOpen(true);
              }}
            >
              分配权限
            </Button>
          </Permission>
          <Permission code="system:role:copy">
            <Button
              type="link"
              onClick={() => {
                setCurrentRoleId(record.id);
                copyForm.setFieldsValue({ role_name: `${record.role_name}-复制` });
                setCopyOpen(true);
              }}
            >
              复制
            </Button>
          </Permission>
          <Permission code="system:role:update">
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
          <Permission code="system:role:delete">
            <Popconfirm title="确认删除该角色？" onConfirm={() => deleteMutation.mutate(record.id)}>
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
      title="角色管理"
      extra={
        <Permission code="system:role:create">
          <Button type="primary" onClick={() => setOpen(true)}>
            新增角色
          </Button>
        </Permission>
      }
    >
      <BaseTable<RoleRecord> rowKey="id" columns={columns} dataSource={data} loading={isLoading} />
      <BaseModal
        open={open}
        title={editing ? '编辑角色' : '新增角色'}
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
          <Form.Item label="角色名称" name="role_name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="角色编码" name="role_code" rules={[{ required: !editing }]}>
            <Input disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue={1}>
            <Select options={[{ label: '启用', value: 1 }, { label: '禁用', value: 0 }]} />
          </Form.Item>
        </Form>
      </BaseModal>
      <BaseModal open={copyOpen} title="复制角色" onCancel={() => setCopyOpen(false)} onOk={() => copyForm.submit()}>
        <Form
          form={copyForm}
          layout="vertical"
          onFinish={(values) =>
            copyMutation.mutate({
              id: currentRoleId!,
              payload: values
            })
          }
        >
          <Form.Item label="新角色名称" name="role_name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="新角色编码" name="role_code">
            <Input placeholder="不填则自动生成" />
          </Form.Item>
        </Form>
      </BaseModal>
      <BaseModal open={assignOpen} title="分配菜单/按钮权限" onCancel={() => setAssignOpen(false)} onOk={() => assignForm.submit()}>
        <Form
          form={assignForm}
          layout="vertical"
          onFinish={(values) =>
            assignMutation.mutate({
              role_id: currentRoleId!,
              menu_ids: values.menu_ids ?? [],
              button_ids: values.button_ids ?? []
            })
          }
        >
          <Form.Item label="菜单权限" name="menu_ids">
            <Tree
              checkable
              defaultExpandAll
              checkedKeys={assignForm.getFieldValue('menu_ids') ?? []}
              treeData={treeData.map(mapTreeNode)}
              onCheck={(checkedKeys) => assignForm.setFieldValue('menu_ids', checkedKeys)}
            />
          </Form.Item>
          <Form.Item label="按钮权限" name="button_ids">
            <Select mode="multiple" options={buttons.map((item) => ({ label: item.button_name, value: item.id }))} />
          </Form.Item>
        </Form>
      </BaseModal>
    </Card>
  );
}

function mapTreeNode(node: MenuTreeNode) {
  return {
    key: node.id,
    title: node.menu_name,
    children: node.children?.map(mapTreeNode) ?? []
  };
}
