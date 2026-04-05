import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Form, Input, InputNumber, Select, Space, Tree } from 'antd';
import type { DataNode, TreeProps } from 'antd/es/tree';
import { systemApi } from '@/api/system';
import { BaseModal } from '@/components/common/BaseModal';
import { Permission } from '@/components/permission/Permission';

interface MenuNode {
  id: string;
  menu_name: string;
  menu_code: string;
  route?: string;
  sort: number;
  type: number;
  status: number;
  parent_id?: string | null;
  children?: MenuNode[];
}

export default function SystemMenusPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MenuNode | null>(null);
  const [treeState, setTreeState] = useState<MenuNode[]>([]);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<{ items: MenuNode[] }>({
    queryKey: ['system-menus-tree-page'],
    queryFn: () => systemApi.listMenuTree()
  });

  const treeData = useMemo(() => (treeState.length > 0 ? treeState : data?.items ?? []), [data?.items, treeState]);

  const createMutation = useMutation({
    mutationFn: systemApi.createMenu,
    onSuccess: async () => {
      setOpen(false);
      form.resetFields();
      setTreeState([]);
      await queryClient.invalidateQueries({ queryKey: ['system-menus-tree-page'] });
      await queryClient.invalidateQueries({ queryKey: ['system-menus'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => systemApi.updateMenu(id, payload),
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['system-menus-tree-page'] });
      await queryClient.invalidateQueries({ queryKey: ['system-menus'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: systemApi.deleteMenu,
    onSuccess: async () => {
      setTreeState([]);
      await queryClient.invalidateQueries({ queryKey: ['system-menus-tree-page'] });
      await queryClient.invalidateQueries({ queryKey: ['system-menus'] });
    }
  });

  const sortMutation = useMutation({
    mutationFn: systemApi.sortMenus,
    onSuccess: async () => {
      setTreeState([]);
      await queryClient.invalidateQueries({ queryKey: ['system-menus-tree-page'] });
      await queryClient.invalidateQueries({ queryKey: ['system-menus'] });
    }
  });

  const onDrop: TreeProps['onDrop'] = (info) => {
    const dragKey = String(info.dragNode.key);
    const dropKey = String(info.node.key);
    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);
    const source = cloneTree(treeData);
    const dragObj = removeNode(source, dragKey);
    if (!dragObj) {
      return;
    }

    if (!info.dropToGap) {
      insertIntoNode(source, dropKey, dragObj);
    } else {
      insertAdjacent(source, dropKey, dragObj, dropPosition);
    }

    setTreeState(recomputeSort(source, null));
  };

  return (
    <Card
      title="菜单管理"
      loading={isLoading}
      extra={
        <Space>
          <Permission code="system:menu:sort">
            <Button onClick={() => sortMutation.mutate({ items: flattenSort(treeData) })}>保存排序</Button>
          </Permission>
          <Permission code="system:menu:create">
            <Button type="primary" onClick={() => setOpen(true)}>
              新增菜单
            </Button>
          </Permission>
        </Space>
      }
    >
      <Tree draggable blockNode defaultExpandAll onDrop={onDrop} treeData={buildTreeNodes(treeData, setEditing, deleteMutation.mutate)} />
      <BaseModal
        open={open || Boolean(editing)}
        title={editing ? '编辑菜单' : '新增菜单'}
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
          initialValues={editing ?? { type: 1, sort: 0, status: 1 }}
          onFinish={(values) => {
            if (editing) {
              updateMutation.mutate({ id: editing.id, payload: values });
            } else {
              createMutation.mutate(values);
            }
          }}
        >
          <Form.Item label="菜单名称" name="menu_name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="菜单编码" name="menu_code" rules={[{ required: !editing }]}>
            <Input disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item label="路由" name="route">
            <Input />
          </Form.Item>
          <Form.Item label="排序" name="sort">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="类型" name="type">
            <Select options={[{ label: '目录', value: 0 }, { label: '菜单', value: 1 }, { label: '按钮', value: 2 }]} />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select options={[{ label: '启用', value: 1 }, { label: '禁用', value: 0 }]} />
          </Form.Item>
        </Form>
      </BaseModal>
    </Card>
  );
}

function buildTreeNodes(
  items: MenuNode[],
  setEditing: (node: MenuNode) => void,
  onDelete: (id: string) => void
): DataNode[] {
  return items.map((item) => ({
    key: item.id,
    title: (
      <Space>
        <span>{item.menu_name}</span>
        <Button size="small" type="link" onClick={() => setEditing(item)}>
          编辑
        </Button>
        <Button size="small" type="link" danger onClick={() => onDelete(item.id)}>
          删除
        </Button>
      </Space>
    ),
    children: buildTreeNodes(item.children ?? [], setEditing, onDelete)
  }));
}

function cloneTree(items: MenuNode[]): MenuNode[] {
  return items.map((item) => ({ ...item, children: cloneTree(item.children ?? []) }));
}

function removeNode(items: MenuNode[], key: string): MenuNode | null {
  for (let i = 0; i < items.length; i += 1) {
    if (items[i].id === key) {
      return items.splice(i, 1)[0];
    }
    const child = removeNode(items[i].children ?? [], key);
    if (child) {
      return child;
    }
  }
  return null;
}

function insertIntoNode(items: MenuNode[], targetKey: string, node: MenuNode): boolean {
  for (const item of items) {
    if (item.id === targetKey) {
      item.children = item.children ?? [];
      item.children.push(node);
      return true;
    }
    if (insertIntoNode(item.children ?? [], targetKey, node)) {
      return true;
    }
  }
  return false;
}

function insertAdjacent(items: MenuNode[], targetKey: string, node: MenuNode, position: number): boolean {
  for (let i = 0; i < items.length; i += 1) {
    if (items[i].id === targetKey) {
      const index = position === -1 ? i : i + 1;
      items.splice(index, 0, node);
      return true;
    }
    if (insertAdjacent(items[i].children ?? [], targetKey, node, position)) {
      return true;
    }
  }
  return false;
}

function recomputeSort(items: MenuNode[], parentId: string | null): MenuNode[] {
  return items.map((item, index) => ({
    ...item,
    parent_id: parentId,
    sort: index + 1,
    children: recomputeSort(item.children ?? [], item.id)
  }));
}

function flattenSort(items: MenuNode[]): Array<{ id: string; parent_id?: string | null; sort: number }> {
  return items.flatMap((item) => [
    { id: item.id, parent_id: item.parent_id ?? null, sort: item.sort },
    ...flattenSort(item.children ?? [])
  ]);
}
