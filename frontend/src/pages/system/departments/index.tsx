/**
 * 部门管理页面（优化版）
 * 使用新的组件库重构，提供更好的视觉效果和用户体验
 */

import React, { useState } from 'react';
import { message, Space, Form, Input, InputNumber, Select, Tabs, Tree, Popconfirm } from 'antd';
import {
  PlusOutlined,
  CheckCircleOutlined,
  StopOutlined,
  EditOutlined,
  DeleteOutlined,
  SortAscendingOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { PageContainer, SectionCard } from '@/components/layout';
import { ActionBar, StatusTag } from '@/components/business';
import { Button, Modal } from '@/components/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { systemApi, type CreateDepartmentPayload } from '@/api/system';
import { Permission } from '@/components/permission/Permission';
import { DepartmentTreeDraggable } from './components/DepartmentTreeDraggable';
import { formatDate } from '@/utils/format';

/**
 * 部门数据类型
 */
interface DepartmentNode {
  id: string;
  name: string;
  code: string;
  parent_id?: string | null;
  status: number;
  sort: number;
  platform_id?: string;
  children?: DepartmentNode[];
  create_time?: string;
  update_time?: string;
}

/**
 * 平台数据类型
 */
interface PlatformRecord {
  id: string;
  name: string;
}

const DepartmentManagementPage: React.FC = () => {
  // 状态管理
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<DepartmentNode | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('list');

  // 表单实例
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 查询部门树
  const { data: departments = [], isLoading } = useQuery<DepartmentNode[]>({
    queryKey: ['system-departments-tree'],
    queryFn: systemApi.listDepartmentTree,
  });

  // 查询平台列表
  const { data: platforms = [] } = useQuery<PlatformRecord[]>({
    queryKey: ['system-platform-options'],
    queryFn: systemApi.listPlatforms,
  });

  // 刷新数据
  const refresh = async () => {
    setCheckedKeys([]);
    await queryClient.invalidateQueries({
      queryKey: ['system-departments-tree'],
    });
  };

  // 创建部门
  const createMutation = useMutation({
    mutationFn: (payload: CreateDepartmentPayload) =>
      systemApi.createDepartment(payload),
    onSuccess: async () => {
      setModalVisible(false);
      form.resetFields();
      message.success('创建部门成功');
      await refresh();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '创建部门失败');
    },
  });

  // 更新部门
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, unknown>;
    }) => systemApi.updateDepartment(id, payload),
    onSuccess: async () => {
      setModalVisible(false);
      setEditing(null);
      form.resetFields();
      message.success('更新部门成功');
      await refresh();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '更新部门失败');
    },
  });

  // 删除部门
  const deleteMutation = useMutation({
    mutationFn: systemApi.deleteDepartment,
    onSuccess: () => {
      message.success('删除部门成功');
      refresh();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '删除部门失败');
    },
  });

  // 批量状态更新
  const batchStatusMutation = useMutation({
    mutationFn: systemApi.batchUpdateDepartmentStatus,
    onSuccess: () => {
      message.success('批量操作成功');
      setCheckedKeys([]);
      refresh();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '批量操作失败');
    },
  });

  // 新增部门
  const handleAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 1, sort: 0 });
    setModalVisible(true);
  };

  // 编辑部门
  const handleEdit = (item: DepartmentNode) => {
    setEditing(item);
    form.setFieldsValue(item);
    setModalVisible(true);
  };

  // 删除部门
  const handleDelete = (item: DepartmentNode) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除部门 "${item.name}" 吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => deleteMutation.mutate(item.id),
    });
  };

  // 批量启用
  const handleBatchEnable = () => {
    if (checkedKeys.length === 0) {
      message.warning('请先选择要启用的部门');
      return;
    }

    Modal.confirm({
      title: '确认批量启用',
      content: `确定要启用选中的 ${checkedKeys.length} 个部门吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => batchStatusMutation.mutate({ ids: checkedKeys, status: 1 }),
    });
  };

  // 批量禁用
  const handleBatchDisable = () => {
    if (checkedKeys.length === 0) {
      message.warning('请先选择要禁用的部门');
      return;
    }

    Modal.confirm({
      title: '确认批量禁用',
      content: `确定要禁用选中的 ${checkedKeys.length} 个部门吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => batchStatusMutation.mutate({ ids: checkedKeys, status: 0 }),
    });
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        updateMutation.mutate({ id: editing.id, payload: values });
      } else {
        createMutation.mutate(values);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  return (
    <PageContainer
      title="部门管理"
      subTitle="管理组织架构，支持树形展示和拖拽排序"
      breadcrumb={{
        items: [
          { title: '首页', path: '/' },
          { title: '系统管理' },
          { title: '部门管理' },
        ],
      }}
    >
      {/* 操作区域 */}
      <SectionCard>
        <ActionBar
          actions={[
            {
              key: 'add',
              label: '新增部门',
              icon: <PlusOutlined />,
              type: 'primary',
              onClick: handleAdd,
            },
            {
              key: 'batch-enable',
              label: `批量启用${checkedKeys.length > 0 ? ` (${checkedKeys.length})` : ''}`,
              icon: <CheckCircleOutlined />,
              disabled: checkedKeys.length === 0,
              onClick: handleBatchEnable,
            },
            {
              key: 'batch-disable',
              label: `批量禁用${checkedKeys.length > 0 ? ` (${checkedKeys.length})` : ''}`,
              icon: <StopOutlined />,
              disabled: checkedKeys.length === 0,
              onClick: handleBatchDisable,
            },
          ]}
          extra={
            <Space>
              <span style={{ color: '#999', fontSize: 14 }}>
                共 {flattenDepartments(departments).length} 个部门
                {checkedKeys.length > 0 && ` / 已选 ${checkedKeys.length} 个`}
              </span>
            </Space>
          }
          align="space-between"
          glass
        />
      </SectionCard>

      {/* 数据区域 */}
      <SectionCard>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'list',
              label: (
                <Space>
                  <span>部门列表</span>
                </Space>
              ),
              children: (
                <div style={{ minHeight: 400 }}>
                  <Tree
                    checkable
                    defaultExpandAll
                    loading={isLoading}
                    checkedKeys={checkedKeys}
                    onCheck={(keys) => setCheckedKeys(keys as string[])}
                    treeData={buildDepartmentTree(
                      departments,
                      handleEdit,
                      handleDelete,
                    )}
                    style={{
                      background: 'transparent',
                    }}
                  />
                </div>
              ),
            },
            {
              key: 'sort',
              label: (
                <Space>
                  <SortAscendingOutlined />
                  <span>部门排序</span>
                </Space>
              ),
              children: (
                <div style={{ minHeight: 400 }}>
                  <DepartmentTreeDraggable
                    departments={departments}
                    onUpdate={refresh}
                  />
                </div>
              ),
            },
          ]}
        />
      </SectionCard>

      {/* 部门表单弹窗 */}
      <Modal
        visible={modalVisible}
        title={editing ? '编辑部门' : '新增部门'}
        width={600}
        glass
        onCancel={() => {
          setModalVisible(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: 1, sort: 0 }}
        >
          <Form.Item
            label="部门名称"
            name="name"
            rules={[
              { required: true, message: '请输入部门名称' },
              { max: 50, message: '部门名称最多50个字符' },
            ]}
          >
            <Input placeholder="请输入部门名称" />
          </Form.Item>

          <Form.Item
            label="部门编码"
            name="code"
            rules={[
              { required: !editing, message: '请输入部门编码' },
              { max: 20, message: '部门编码最多20个字符' },
            ]}
          >
            <Input
              disabled={Boolean(editing)}
              placeholder={editing ? '一经创建不可修改' : '请输入部门编码'}
            />
          </Form.Item>

          <Form.Item label="上级部门" name="parent_id">
            <Select
              allowClear
              placeholder="选择上级部门（不选则为顶级部门）"
              options={flattenDepartmentOptions(departments, editing?.id)}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item label="所属平台" name="platform_id">
            <Select
              allowClear
              placeholder="选择所属平台（可选）"
              options={platforms.map((item) => ({
                label: item.name,
                value: item.id,
              }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item
            label="排序"
            name="sort"
            tooltip="数字越小排序越靠前"
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入排序号（默认为0）"
              min={0}
              max={9999}
            />
          </Form.Item>

          <Form.Item
            label="状态"
            name="status"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select>
              <Select.Option value={1}>启用</Select.Option>
              <Select.Option value={0}>禁用</Select.Option>
            </Select>
          </Form.Item>

          {editing && (
            <div style={{
              padding: 12,
              background: '#f0f9ff',
              borderRadius: 8,
              marginTop: 16,
            }}>
              <div style={{ fontSize: 12, color: '#0369a1' }}>💡 提示：</div>
              <ul style={{
                fontSize: 12,
                color: '#0369a1',
                marginTop: 8,
                paddingLeft: 20,
              }}>
                <li>部门编码一经创建不可修改</li>
                <li>修改上级部门时请注意层级关系</li>
                <li>禁用部门后，该部门下的用户将无法正常使用相关功能</li>
              </ul>
            </div>
          )}
        </Form>
      </Modal>
    </PageContainer>
  );
};

/**
 * 构建部门树形数据
 */
function buildDepartmentTree(
  items: DepartmentNode[],
  onEdit: (item: DepartmentNode) => void,
  onDelete: (item: DepartmentNode) => void,
): DataNode[] {
  return items.map((item) => ({
    key: item.id,
    title: (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 0',
      }}>
        <Space>
          <span style={{ fontWeight: 500 }}>
            {item.name}
          </span>
          <StatusTag
            status={item.status === 1 ? 'success' : 'error'}
            text={item.status === 1 ? '启用' : '禁用'}
            size="sm"
          />
          {item.code && (
            <span style={{
              fontSize: 12,
              color: '#999',
              background: '#f5f5f5',
              padding: '2px 6px',
              borderRadius: 4,
            }}>
              {item.code}
            </span>
          )}
        </Space>
        <Space size="small">
          <Permission code="system:department:update">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
            >
              编辑
            </Button>
          </Permission>
          <Permission code="system:department:delete">
            <Popconfirm
              title="确认删除"
              description={`确定要删除部门 "${item.name}" 吗？`}
              onConfirm={(e) => {
                e?.stopPropagation();
                onDelete(item);
              }}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
              >
                删除
              </Button>
            </Popconfirm>
          </Permission>
        </Space>
      </div>
    ),
    children: buildDepartmentTree(item.children ?? [], onEdit, onDelete),
  }));
}

/**
 * 扁平化部门选项（用于上级部门选择）
 */
function flattenDepartmentOptions(
  items: DepartmentNode[],
  excludeId?: string,
  prefix = '',
): Array<{ label: string; value: string }> {
  return items.flatMap((item) => {
    // 排除自己和子孙节点
    if (excludeId && (item.id === excludeId || isDescendant(item, excludeId))) {
      return [];
    }

    return [
      {
        label: `${prefix}${item.name}${item.status === 0 ? ' (禁用)' : ''}`,
        value: item.id
      },
      ...flattenDepartmentOptions(
        item.children ?? [],
        excludeId,
        `${prefix}${item.name} / `,
      ),
    ];
  });
}

/**
 * 检查是否为子孙节点
 */
function isDescendant(parent: DepartmentNode, targetId: string): boolean {
  if (!parent.children) return false;

  for (const child of parent.children) {
    if (child.id === targetId || isDescendant(child, targetId)) {
      return true;
    }
  }

  return false;
}

/**
 * 扁平化部门数据（用于统计）
 */
function flattenDepartments(items: DepartmentNode[]): DepartmentNode[] {
  return items.flatMap((item) => [
    item,
    ...flattenDepartments(item.children ?? []),
  ]);
}

export default DepartmentManagementPage;
