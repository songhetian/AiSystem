/**
 * 菜单管理页面（优化版）
 * 使用新的组件库重构，提供更好的视觉效果和用户体验
 */

import React, { useState, useMemo } from 'react';
import { message, Space, Form, Input, Select, InputNumber, Tag } from 'antd';
import {
  PlusOutlined,
  FolderOutlined,
  FileOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { PageContainer, SectionCard } from '@/components/layout';
import { ActionBar, StatusTag } from '@/components/business';
import { Table, Button, Modal } from '@/components/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemApi } from '@/api/system';
import { formatDate } from '@/utils/format';
import { Permission } from '@/components/permission/Permission';

/**
 * 菜单数据类型
 */
interface Menu {
  id: string;
  menu_name: string;
  menu_code: string;
  parent_id?: string | null;
  route?: string;
  type: number; // 1=菜单 2=目录
  sort: number;
  icon?: string;
  create_time?: string;
  children?: Menu[];
}

/**
 * 构建菜单树
 */
const buildMenuTree = (menus: Menu[], parentId: string | null = null): Menu[] => {
  return menus
    .filter((item) => item.parent_id === parentId)
    .sort((a, b) => a.sort - b.sort)
    .map((item) => ({
      ...item,
      key: item.id,
      children: buildMenuTree(menus, item.id),
    }));
};

const MenuManagementPage: React.FC = () => {
  // 状态管理
  const [filters, setFilters] = useState<any>({});

  // 弹窗状态
  const [menuModalVisible, setMenuModalVisible] = useState(false);

  // 当前操作的数据
  const [editing, setEditing] = useState<Menu | null>(null);

  // 表单实例
  const [menuForm] = Form.useForm();

  const queryClient = useQueryClient();

  // 查询菜单列表
  const { data: menus = [], isLoading } = useQuery({
    queryKey: ['system-menus'],
    queryFn: systemApi.listMenus,
  });

  // 创建菜单
  const createMutation = useMutation({
    mutationFn: systemApi.createMenu,
    onSuccess: () => {
      message.success('创建菜单成功');
      setMenuModalVisible(false);
      menuForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['system-menus'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || '创建菜单失败');
    },
  });

  // 更新菜单
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      systemApi.updateMenu(id, data),
    onSuccess: () => {
      message.success('更新菜单成功');
      setMenuModalVisible(false);
      menuForm.resetFields();
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['system-menus'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || '更新菜单失败');
    },
  });

  // 删除菜单
  const deleteMutation = useMutation({
    mutationFn: systemApi.deleteMenu,
    onSuccess: () => {
      message.success('删除菜单成功');
      queryClient.invalidateQueries({ queryKey: ['system-menus'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || '删除菜单失败');
    },
  });

  // 构建树形数据
  const treeData = useMemo(() => buildMenuTree(menus), [menus]);

  // 获取父级菜单选项（排除自己和子孙节点）
  const getParentMenuOptions = (currentId?: string) => {
    if (!currentId) return menus;

    // 获取所有子孙节点ID
    const getDescendantIds = (menuId: string): string[] => {
      const children = menus.filter((m) => m.parent_id === menuId);
      return [
        menuId,
        ...children.flatMap((child) => getDescendantIds(child.id)),
      ];
    };

    const excludeIds = getDescendantIds(currentId);
    return menus.filter((m) => !excludeIds.includes(m.id));
  };

  // 表格列配置
  const columns = [
    {
      title: '菜单名称',
      dataIndex: 'menu_name',
      key: 'menu_name',
      width: 250,
      render: (text: string, record: Menu) => (
        <Space>
          {record.type === 2 ? (
            <FolderOutlined style={{ color: '#faad14' }} />
          ) : (
            <FileOutlined style={{ color: '#1890ff' }} />
          )}
          <span style={{ fontWeight: 500 }}>{text}</span>
        </Space>
      ),
    },
    {
      title: '菜单编码',
      dataIndex: 'menu_code',
      key: 'menu_code',
      width: 200,
      render: (text: string) => (
        <Tag color="blue">{text}</Tag>
      ),
    },
    {
      title: '路由地址',
      dataIndex: 'route',
      key: 'route',
      width: 200,
      render: (text: string) => text || '-',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: number) => (
        <StatusTag
          status={type === 1 ? 'info' : 'warning'}
          text={type === 1 ? '菜单' : '目录'}
          showDot={false}
        />
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 100,
      render: (sort: number) => (
        <Tag color="default">{sort}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'create_time',
      key: 'create_time',
      width: 180,
      render: (date: string) => (date ? formatDate(date) : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: Menu) => (
        <Space size="small">
          <Permission code="system:menu:create">
            <Button
              type="link"
              size="small"
              onClick={() => handleAddChild(record)}
            >
              新增子菜单
            </Button>
          </Permission>
          <Permission code="system:menu:update">
            <Button
              type="link"
              size="small"
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          </Permission>
          <Permission code="system:menu:delete">
            <Button
              type="link"
              size="small"
              danger
              onClick={() => handleDelete(record)}
            >
              删除
            </Button>
          </Permission>
        </Space>
      ),
    },
  ];

  // 新增菜单
  const handleAdd = () => {
    setEditing(null);
    menuForm.resetFields();
    menuForm.setFieldsValue({ type: 1, sort: 0 });
    setMenuModalVisible(true);
  };

  // 新增子菜单
  const handleAddChild = (parent: Menu) => {
    setEditing(null);
    menuForm.resetFields();
    menuForm.setFieldsValue({
      parent_id: parent.id,
      type: 1,
      sort: 0,
    });
    setMenuModalVisible(true);
  };

  // 编辑菜单
  const handleEdit = (record: Menu) => {
    setEditing(record);
    menuForm.setFieldsValue(record);
    setMenuModalVisible(true);
  };

  // 删除菜单
  const handleDelete = (record: Menu) => {
    // 检查是否有子菜单
    const hasChildren = menus.some((m) => m.parent_id === record.id);
    if (hasChildren) {
      message.warning('该菜单下有子菜单，请先删除子菜单');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除菜单 "${record.menu_name}" 吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => deleteMutation.mutate(record.id),
    });
  };

  // 提交菜单表单
  const handleMenuSubmit = async () => {
    try {
      const values = await menuForm.validateFields();
      if (editing) {
        updateMutation.mutate({ id: editing.id, data: values });
      } else {
        createMutation.mutate(values);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  return (
    <PageContainer
      title="菜单管理"
      subTitle="管理系统菜单，配置菜单层级和路由"
      breadcrumb={{
        items: [
          { title: '首页', path: '/' },
          { title: '系统管理' },
          { title: '菜单管理' },
        ],
      }}
    >
      {/* 数据区域 */}
      <SectionCard>
        <ActionBar
          actions={[
            {
              key: 'add',
              label: '新增菜单',
              icon: <PlusOutlined />,
              type: 'primary',
              permission: 'system:menu:create',
              onClick: handleAdd,
            },
          ]}
          extra={
            <Space>
              <span style={{ color: '#999', fontSize: 14 }}>
                共 {menus.length} 条记录
              </span>
            </Space>
          }
          align="space-between"
          glass
        />

        <Table
          columns={columns}
          dataSource={treeData}
          loading={isLoading}
          glass
          density="compact"
          striped
          hoverable
          rowKey="id"
          pagination={false}
          expandable={{
            defaultExpandAllRows: true,
          }}
        />
      </SectionCard>

      {/* 提示信息 */}
      <SectionCard>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AppstoreOutlined style={{ color: '#1890ff' }} />
            <span style={{ fontWeight: 500, color: '#1890ff' }}>菜单说明</span>
          </div>
          <div style={{ fontSize: 12, color: '#666', paddingLeft: 24 }}>
            • <FolderOutlined style={{ color: '#faad14' }} /> 目录：用于组织菜单结构，不对应具体页面
            <br />
            • <FileOutlined style={{ color: '#1890ff' }} /> 菜单：对应具体的页面路由
            <br />
            • 菜单编码：用于权限控制，格式建议为 module:page（如：system:user）
            <br />
            • 路由地址：前端路由路径，菜单类型必填
            <br />
            • 排序：数字越小越靠前，同级菜单按此排序
          </div>
        </Space>
      </SectionCard>

      {/* 菜单表单弹窗 */}
      <Modal
        visible={menuModalVisible}
        title={editing ? '编辑菜单' : '新增菜单'}
        width={600}
        glass
        onCancel={() => {
          setMenuModalVisible(false);
          menuForm.resetFields();
          setEditing(null);
        }}
        onOk={handleMenuSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form
          form={menuForm}
          layout="vertical"
          initialValues={{ type: 1, sort: 0 }}
        >
          <Form.Item
            label="菜单名称"
            name="menu_name"
            rules={[{ required: true, message: '请输入菜单名称' }]}
          >
            <Input placeholder="如：用户管理" />
          </Form.Item>

          <Form.Item
            label="菜单编码"
            name="menu_code"
            rules={[{ required: true, message: '请输入菜单编码' }]}
          >
            <Input
              disabled={!!editing}
              placeholder="如：system:user"
              addonBefore="CODE"
            />
          </Form.Item>

          <Form.Item label="父级菜单" name="parent_id">
            <Select
              allowClear
              placeholder="选择父级菜单（不选则为顶级菜单）"
              options={getParentMenuOptions(editing?.id).map((m) => ({
                label: m.menu_name,
                value: m.id,
              }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item
            label="类型"
            name="type"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select>
              <Select.Option value={1}>
                <Space>
                  <FileOutlined style={{ color: '#1890ff' }} />
                  <span>菜单</span>
                </Space>
              </Select.Option>
              <Select.Option value={2}>
                <Space>
                  <FolderOutlined style={{ color: '#faad14' }} />
                  <span>目录</span>
                </Space>
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.type !== currentValues.type
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('type') === 1 ? (
                <Form.Item
                  label="路由地址"
                  name="route"
                  rules={[{ required: true, message: '请输入路由地址' }]}
                >
                  <Input placeholder="如：/system/users" addonBefore="/" />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item
            label="排序"
            name="sort"
            rules={[{ required: true, message: '请输入排序' }]}
            extra="数字越小越靠前"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              placeholder="请输入排序数字"
            />
          </Form.Item>

          <Form.Item label="图标" name="icon">
            <Input placeholder="图标名称（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default MenuManagementPage;
