import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Form, Input, Select, Space, Tree, Typography, Tag, Tooltip } from 'antd';
import { 
  SearchOutlined, 
  ReloadOutlined, 
  PlusOutlined, 
  HolderOutlined,
  FolderOpenOutlined,
  FileOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import type { DataNode, TreeProps } from 'antd/es/tree';
import { systemApi } from '@/api/system';
import { BaseModal } from '@/components/common/BaseModal';
import { ActionGroup } from '@/components/common/ActionGroup';
import { Permission } from '@/components/permission/Permission';

const { Text } = Typography;

interface MenuNode {
  id: string;
  menu_name: string;
  menu_code: string;
  route?: string;
  sort: number;
  type: number; // 0: 目录, 1: 菜单, 2: 按钮
  status: number;
  parent_id?: string | null;
  children?: MenuNode[];
}

export default function SystemMenusPage() {
  const [filterForm] = Form.useForm();
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MenuNode | null>(null);
  const [treeState, setTreeState] = useState<MenuNode[]>([]);
  
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<{ items: MenuNode[] }>({
    queryKey: ['system-menus-tree-page'],
    queryFn: () => systemApi.listMenuTree()
  });

  const treeData = useMemo(() => (treeState.length > 0 ? treeState : data?.items ?? []), [data?.items, treeState]);

  const refresh = async () => {
    setTreeState([]);
    await queryClient.invalidateQueries({ queryKey: ['system-menus-tree-page'] });
    await queryClient.invalidateQueries({ queryKey: ['system-menus'] });
  };

  const createMutation = useMutation({
    mutationFn: systemApi.createMenu,
    onSuccess: () => { setOpen(false); form.resetFields(); refresh(); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => systemApi.updateMenu(id, payload),
    onSuccess: () => { setOpen(false); setEditing(null); form.resetFields(); refresh(); }
  });

  const deleteMutation = useMutation({
    mutationFn: systemApi.deleteMenu,
    onSuccess: refresh
  });

  const sortMutation = useMutation({
    mutationFn: systemApi.sortMenus,
    onSuccess: refresh
  });

  // 拖拽逻辑保持 AntD Tree 但视觉风格对齐 BaseDrag
  const onDrop: TreeProps['onDrop'] = (info) => {
    const dragKey = String(info.dragNode.key);
    const dropKey = String(info.node.key);
    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);
    const source = cloneTree(treeData);
    const dragObj = removeNode(source, dragKey);
    if (!dragObj) return;

    if (!info.dropToGap) {
      insertIntoNode(source, dropKey, dragObj);
    } else {
      insertAdjacent(source, dropKey, dragObj, dropPosition);
    }

    setTreeState(recomputeSort(source, null));
  };

  const renderTitle = (item: MenuNode) => (
    <div className="flex items-center justify-between group py-1" style={{ width: 'calc(100% - 24px)' }}>
      <Space size={12}>
        <span className="text-slate-400 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
          <HolderOutlined />
        </span>
        {item.type === 0 ? <FolderOpenOutlined className="text-amber-500" /> : 
         item.type === 1 ? <FileOutlined className="text-blue-500" /> : 
         <ThunderboltOutlined className="text-purple-500" />}
        <Text className="font-black text-slate-900">{item.menu_name}</Text>
        <Text className="text-slate-400 text-xs font-mono">{item.menu_code}</Text>
        {item.route && <Tag className="bg-slate-50 border-slate-200 text-slate-500 text-[10px]">{item.route}</Tag>}
        {item.status === 0 && <Tag color="error" size="small">已禁用</Tag>}
      </Space>
      
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <ActionGroup
          onEdit={() => { setEditing(item); setOpen(true); form.setFieldsValue(item); }}
          onDelete={() => deleteMutation.mutate(item.id)}
          editPermission="system:menu:update"
          deletePermission="system:menu:delete"
        />
      </div>
    </div>
  );

  const buildTreeNodes = (items: MenuNode[]): DataNode[] => {
    return items.map((item) => ({
      key: item.id,
      title: renderTitle(item),
      children: buildTreeNodes(item.children ?? [])
    }));
  };

  return (
    <div className="p-4 space-y-4 bg-slate-50 min-h-screen">
      <Card bordered={false} className="shadow-sm">
        <Form form={filterForm} layout="inline" className="flex flex-wrap items-center gap-4">
          <Form.Item name="name" className="flex-grow min-w-[300px] mb-0">
            <Input prefix={<SearchOutlined />} placeholder="搜索菜单名称/编码" className="h-[44px] font-bold border-slate-300" />
          </Form.Item>
          <Form.Item className="mb-0 ml-auto">
            <Space size={8}>
              <Button icon={<ReloadOutlined />} onClick={() => filterForm.resetFields()} className="h-[44px] border-slate-500 font-bold text-slate-500">重置</Button>
              <Permission code="system:menu:sort">
                <Button 
                  onClick={() => sortMutation.mutate({ items: flattenSort(treeData) })}
                  className="h-[44px] border-slate-900 text-slate-900 font-black px-6"
                  disabled={treeState.length === 0}
                >
                  保存拖拽排序
                </Button>
              </Permission>
              <Permission code="system:menu:create">
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => { setEditing(null); setOpen(true); form.resetFields(); }}
                  className="h-[44px] font-black px-8 bg-slate-900 border-none hover:!bg-slate-800"
                >
                  新增菜单
                </Button>
              </Permission>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card bordered={false} className="shadow-sm rounded-xl overflow-hidden min-h-[600px]">
        {isLoading ? (
          <div className="p-20 text-center text-slate-400">正在加载菜单架构...</div>
        ) : (
          <div className="p-4">
            <Tree 
              draggable 
              blockNode 
              defaultExpandAll 
              onDrop={onDrop} 
              treeData={buildTreeNodes(treeData)}
              className="雷犀-tree-standard"
              motion={null}
            />
          </div>
        )}
      </Card>

      <BaseModal
        open={open}
        title={<Text className="font-black text-lg">{editing ? '编辑菜单详情' : '创建新菜单项'}</Text>}
        onCancel={() => { setOpen(false); setEditing(null); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={(v) => editing ? updateMutation.mutate({ id: editing.id, payload: v }) : createMutation.mutate(v)}>
          <Form.Item label={<Text className="font-bold">菜单名称</Text>} name="menu_name" rules={[{ required: true }]}><Input className="h-[40px] font-bold" /></Form.Item>
          <Form.Item label={<Text className="font-bold">菜单编码 (唯一标识)</Text>} name="menu_code" rules={[{ required: true }]}><Input className="h-[40px] font-mono" disabled={!!editing} /></Form.Item>
          <Form.Item label={<Text className="font-bold">路由地址</Text>} name="route"><Input className="h-[40px] font-mono" placeholder="/system/dashboard" /></Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label={<Text className="font-bold">菜单类型</Text>} name="type" initialValue={1}>
              <Select className="h-[40px]" options={[{ label: '目录 (Folder)', value: 0 }, { label: '菜单 (Page)', value: 1 }, { label: '按钮 (Action)', value: 2 }]} />
            </Form.Item>
            <Form.Item label={<Text className="font-bold">状态</Text>} name="status" initialValue={1}>
              <Select className="h-[40px]" options={[{ label: '启用', value: 1 }, { label: '禁用', value: 0 }]} />
            </Form.Item>
          </div>
        </Form>
      </BaseModal>

      <style dangerouslySetInnerHTML={{ __html: `
        .雷犀-tree-standard .ant-tree-node-content-wrapper {
          border-radius: 8px !important;
          transition: all 0.2s;
          padding: 4px 8px !important;
        }
        .雷犀-tree-standard .ant-tree-node-content-wrapper:hover {
          background-color: #f1f5f9 !important;
        }
        .雷犀-tree-standard .ant-tree-treenode-draggable .ant-tree-draggable-icon {
          display: none;
        }
        .雷犀-tree-standard .ant-tree-drop-indicator {
          background-color: #0f172a !important;
        }
      `}} />
    </div>
  );
}

// Tree Utility Functions (Unchanged logic, just keeping them clean)
function cloneTree(items: MenuNode[]): MenuNode[] {
  return items.map((item) => ({ ...item, children: cloneTree(item.children ?? []) }));
}

function removeNode(items: MenuNode[], key: string): MenuNode | null {
  for (let i = 0; i < items.length; i += 1) {
    if (items[i].id === key) return items.splice(i, 1)[0];
    const child = removeNode(items[i].children ?? [], key);
    if (child) return child;
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
    if (insertIntoNode(item.children ?? [], targetKey, node)) return true;
  }
  return false;
}

function insertAdjacent(items: MenuNode[], targetKey: string, node: MenuNode, position: number): boolean {
  for (let i = 0; i < items.length; i += 1) {
    if (items[i].id === targetKey) {
      items.splice(position === -1 ? i : i + 1, 0, node);
      return true;
    }
    if (insertAdjacent(items[i].children ?? [], targetKey, node, position)) return true;
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
