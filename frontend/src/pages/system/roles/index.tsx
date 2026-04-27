/**
 * 角色管理页面（优化版）
 * 使用新的组件库重构，提供更好的视觉效果和用户体验
 */

import React, { useState, useEffect, useMemo } from 'react';
import { message, Space, Form, Input, Select, Tree, Tag, Card as AntCard } from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { PageContainer, SectionCard } from '@/components/layout';
import { ActionBar, StatusTag } from '@/components/business';
import { Table, Button, Modal } from '@/components/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemApi } from '@/api/system';
import { formatDate } from '@/utils/format';
import { Permission } from '@/components/permission/Permission';

const { Search } = Input;

/**
 * 角色数据类型
 */
interface Role {
  id: string;
  role_name: string;
  role_code: string;
  description?: string;
  status: number;
  create_time?: string;
}

/**
 * 菜单分组配置
 */
const MENU_GROUPS: Record<string, { label: string; color: string }> = {
  system: { label: '系统管理', color: 'blue' },
  personnel: { label: '人事管理', color: 'green' },
  attendance: { label: '考勤管理', color: 'orange' },
  approval: { label: '审批管理', color: 'purple' },
  service: { label: '客服质检', color: 'cyan' },
  knowledge: { label: '知识库', color: 'geekblue' },
  shop: { label: '商品管理', color: 'magenta' },
  finance: { label: '财务管理', color: 'red' },
};

const RoleManagementPage: React.FC = () => {
  // 状态管理
  const [filters, setFilters] = useState<any>({});

  // 弹窗状态
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);

  // 当前操作的数据
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [editing, setEditing] = useState<Role | null>(null);

  // 权限相关状态
  const [activeTab, setActiveTab] = useState<'menus' | 'buttons'>('menus');
  const [checkedMenuKeys, setCheckedMenuKeys] = useState<string[]>([]);
  const [checkedButtonKeys, setCheckedButtonKeys] = useState<string[]>([]);
  const [expandedMenuKeys, setExpandedMenuKeys] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState('');

  // 表单实例
  const [roleForm] = Form.useForm();

  const queryClient = useQueryClient();

  // 查询角色列表
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['system-roles'],
    queryFn: systemApi.listRoles,
  });

  // 查询菜单列表
  const { data: menus = [] } = useQuery({
    queryKey: ['system-menus'],
    queryFn: systemApi.listMenus,
    enabled: permissionModalVisible,
  });

  // 查询按钮列表
  const { data: buttons = [] } = useQuery({
    queryKey: ['system-buttons'],
    queryFn: systemApi.listButtons,
    enabled: permissionModalVisible,
  });

  // 查询角色权限
  const { data: rolePermissions } = useQuery({
    queryKey: ['role-permissions', currentRole?.id],
    queryFn: () => systemApi.getRolePermissions(currentRole!.id),
    enabled: permissionModalVisible && !!currentRole?.id,
  });

  // 创建角色
  const createMutation = useMutation({
    mutationFn: systemApi.createRole,
    onSuccess: () => {
      message.success('创建角色成功');
      setRoleModalVisible(false);
      roleForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['system-roles'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || '创建角色失败');
    },
  });

  // 更新角色
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      systemApi.updateRole(id, data),
    onSuccess: () => {
      message.success('更新角色成功');
      setRoleModalVisible(false);
      roleForm.resetFields();
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['system-roles'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || '更新角色失败');
    },
  });

  // 删除角色
  const deleteMutation = useMutation({
    mutationFn: systemApi.deleteRole,
    onSuccess: () => {
      message.success('删除角色成功');
      queryClient.invalidateQueries({ queryKey: ['system-roles'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || '删除角色失败');
    },
  });

  // 分配权限
  const assignPermissionMutation = useMutation({
    mutationFn: (data: any) => systemApi.assignRolePermissions(data),
    onSuccess: () => {
      message.success('分配权限成功');
      setPermissionModalVisible(false);
      setCurrentRole(null);
      setCheckedMenuKeys([]);
      setCheckedButtonKeys([]);
      queryClient.invalidateQueries({ queryKey: ['system-roles'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || '分配权限失败');
    },
  });

  // 监听角色权限数据变化
  useEffect(() => {
    if (rolePermissions) {
      setCheckedMenuKeys(rolePermissions.menuIds || []);
      setCheckedButtonKeys(rolePermissions.buttonIds || []);
    } else {
      setCheckedMenuKeys([]);
      setCheckedButtonKeys([]);
    }
  }, [rolePermissions]);

  // 构建菜单树
  const buildMenuTree = (menus: any[]): DataNode[] => {
    const menuMap = new Map<string, any>();
    menus.forEach((menu) => {
      const module = menu.menu_code?.split(':')[0] || 'other';
      const moduleConfig = MENU_GROUPS[module] || {
        label: '其他',
        color: 'default',
      };

      menuMap.set(menu.id, {
        key: menu.id,
        title: (
          <Space>
            <span>{menu.menu_name}</span>
            <Tag color={moduleConfig.color}>{menu.menu_code}</Tag>
          </Space>
        ),
        children: [],
        ...menu,
      });
    });

    const tree: DataNode[] = [];
    menus.forEach((menu) => {
      const node = menuMap.get(menu.id);
      if (menu.parent_id && menuMap.has(menu.parent_id)) {
        const parent = menuMap.get(menu.parent_id);
        parent.children.push(node);
      } else {
        tree.push(node);
      }
    });

    return tree;
  };

  // 按菜单分组按钮
  const groupButtonsByMenu = (buttons: any[]) => {
    const grouped: Record<string, any[]> = {};
    buttons.forEach((button) => {
      if (!grouped[button.menu_id]) grouped[button.menu_id] = [];
      grouped[button.menu_id].push(button);
    });
    return grouped;
  };

  const menuTreeData = useMemo(() => buildMenuTree(menus), [menus]);
  const groupedButtons = groupButtonsByMenu(buttons);

  // 构建按钮树
  const buildButtonTree = (): DataNode[] => {
    return menus
      .filter((m: any) => groupedButtons[m.id]?.length > 0)
      .map((menu: any) => ({
        key: menu.id,
        title: (
          <Space>
            <span>{menu.menu_name}</span>
            <Tag>
              {
                groupedButtons[menu.id].filter((b: any) =>
                  checkedButtonKeys.includes(b.id),
                ).length
              }
              /{groupedButtons[menu.id].length}
            </Tag>
          </Space>
        ),
        selectable: false,
        children: groupedButtons[menu.id].map((button: any) => ({
          key: button.id,
          title: (
            <Space>
              <span>{button.button_name}</span>
              <Tag color="default">{button.button_code}</Tag>
            </Space>
          ),
        })),
      }));
  };

  const buttonTreeData = useMemo(
    () => buildButtonTree(),
    [menus, buttons, checkedButtonKeys],
  );

  // 获取所有菜单ID
  const getAllMenuKeys = (treeData: DataNode[]): string[] => {
    const keys: string[] = [];
    const traverse = (nodes: DataNode[]) => {
      nodes.forEach((node) => {
        keys.push(node.key as string);
        if (node.children) traverse(node.children);
      });
    };
    traverse(treeData);
    return keys;
  };

  // 表格列配置
  const columns = [
    {
      title: '角色名称',
      dataIndex: 'role_name',
      key: 'role_name',
      width: 200,
      render: (text: string) => (
        <div style={{ fontWeight: 500 }}>{text}</div>
      ),
    },
    {
      title: '角色编码',
      dataIndex: 'role_code',
      key: 'role_code',
      width: 200,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number) => (
        <StatusTag
          status={status === 1 ? 'success' : 'error'}
          text={status === 1 ? '启用' : '禁用'}
        />
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
      width: 240,
      fixed: 'right' as const,
      render: (_: any, record: Role) => (
        <Space size="small">
          <Permission code="system:role:update">
            <Button
              type="link"
              size="small"
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          </Permission>
          <Permission code="system:role:assign-permissions">
            <Button
              type="link"
              size="small"
              onClick={() => handleAssignPermission(record)}
            >
              分配权限
            </Button>
          </Permission>
          <Permission code="system:role:delete">
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

  // 新增角色
  const handleAdd = () => {
    setEditing(null);
    roleForm.resetFields();
    setRoleModalVisible(true);
  };

  // 编辑角色
  const handleEdit = (record: Role) => {
    setEditing(record);
    roleForm.setFieldsValue(record);
    setRoleModalVisible(true);
  };

  // 删除角色
  const handleDelete = (record: Role) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除角色 "${record.role_name}" 吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => deleteMutation.mutate(record.id),
    });
  };

  // 分配权限
  const handleAssignPermission = (record: Role) => {
    setCurrentRole(record);
    setActiveTab('menus');
    setSearchValue('');
    setPermissionModalVisible(true);
  };

  // 提交角色表单
  const handleRoleSubmit = async () => {
    try {
      const values = await roleForm.validateFields();
      if (editing) {
        updateMutation.mutate({ id: editing.id, data: values });
      } else {
        createMutation.mutate(values);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 提交权限分配
  const handlePermissionSubmit = () => {
    if (!currentRole) return;

    assignPermissionMutation.mutate({
      roleId: currentRole.id,
      menuIds: checkedMenuKeys,
      buttonIds: checkedButtonKeys,
    });
  };

  // 全选
  const handleSelectAll = () => {
    const allMenuKeys = getAllMenuKeys(menuTreeData);
    setCheckedMenuKeys(allMenuKeys);
    setCheckedButtonKeys(buttons.map((b: any) => b.id));
  };

  // 清空
  const handleClearAll = () => {
    setCheckedMenuKeys([]);
    setCheckedButtonKeys([]);
  };

  // 菜单勾选变化
  const handleMenuCheck = (
    checked: { checked: string[]; halfChecked: string[] } | string[],
  ) => {
    const checkedKeys = Array.isArray(checked) ? checked : checked.checked;
    setCheckedMenuKeys(checkedKeys);

    // 自动勾选对应的按钮
    const relatedButtonIds = buttons
      .filter((b: any) => checkedKeys.includes(b.menu_id))
      .map((b: any) => b.id);
    setCheckedButtonKeys(relatedButtonIds);
  };

  // 过滤数据
  const filteredData = roles.filter((role: Role) => {
    if (filters.role_name && !role.role_name.includes(filters.role_name)) {
      return false;
    }
    if (filters.role_code && !role.role_code.includes(filters.role_code)) {
      return false;
    }
    if (filters.status !== undefined && role.status !== filters.status) {
      return false;
    }
    return true;
  });

  return (
    <PageContainer
      title="角色管理"
      subTitle="管理系统角色，配置角色权限"
      breadcrumb={{
        items: [
          { title: '首页', path: '/' },
          { title: '系统管理' },
          { title: '角色管理' },
        ],
      }}
    >
      {/* 数据区域 */}
      <SectionCard>
        <ActionBar
          actions={[
            {
              key: 'add',
              label: '新增角色',
              icon: <PlusOutlined />,
              type: 'primary',
              permission: 'system:role:create',
              onClick: handleAdd,
            },
          ]}
          extra={
            <Space>
              <span style={{ color: '#999', fontSize: 14 }}>
                共 {filteredData.length} 条记录
              </span>
            </Space>
          }
          align="space-between"
          glass
        />

        <Table
          columns={columns}
          dataSource={filteredData}
          loading={isLoading}
          glass
          density="compact"
          striped
          hoverable
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </SectionCard>

      {/* 角色表单弹窗 */}
      <Modal
        visible={roleModalVisible}
        title={editing ? '编辑角色' : '新增角色'}
        width={600}
        glass
        onCancel={() => {
          setRoleModalVisible(false);
          roleForm.resetFields();
          setEditing(null);
        }}
        onOk={handleRoleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form
          form={roleForm}
          layout="vertical"
          initialValues={{ status: 1 }}
        >
          <Form.Item
            label="角色名称"
            name="role_name"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="如：部门主管" />
          </Form.Item>

          <Form.Item
            label="角色编码"
            name="role_code"
            rules={[{ required: true, message: '请输入角色编码' }]}
          >
            <Input disabled={!!editing} placeholder="如：dept_manager" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea
              rows={3}
              placeholder="描述该角色的职责和权限范围"
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
        </Form>
      </Modal>

      {/* 权限分配弹窗 */}
      <Modal
        visible={permissionModalVisible}
        title={`分配权限 - ${currentRole?.role_name}`}
        width={900}
        glass
        onCancel={() => {
          setPermissionModalVisible(false);
          setCurrentRole(null);
          setCheckedMenuKeys([]);
          setCheckedButtonKeys([]);
          setSearchValue('');
        }}
        onOk={handlePermissionSubmit}
        confirmLoading={assignPermissionMutation.isPending}
      >
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button
              size="small"
              type={activeTab === 'menus' ? 'primary' : 'default'}
              onClick={() => setActiveTab('menus')}
            >
              菜单权限{' '}
              <Tag color="blue">
                {checkedMenuKeys.length}/{getAllMenuKeys(menuTreeData).length}
              </Tag>
            </Button>
            <Button
              size="small"
              type={activeTab === 'buttons' ? 'primary' : 'default'}
              onClick={() => setActiveTab('buttons')}
            >
              按钮权限{' '}
              <Tag color="green">
                {checkedButtonKeys.length}/{buttons.length}
              </Tag>
            </Button>
          </Space>
        </div>

        {activeTab === 'menus' && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <AntCard size="small">
              <Space wrap>
                <Button
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={handleSelectAll}
                >
                  全选
                </Button>
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={handleClearAll}
                >
                  清空
                </Button>
                <Search
                  placeholder="搜索菜单名称或编码"
                  allowClear
                  style={{ width: 250 }}
                  prefix={<SearchOutlined />}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
              </Space>
            </AntCard>

            <AntCard
              size="small"
              style={{ maxHeight: 450, overflow: 'auto' }}
              bodyStyle={{ padding: 12 }}
            >
              <Tree
                checkable
                selectable={false}
                checkedKeys={checkedMenuKeys}
                expandedKeys={expandedMenuKeys}
                onExpand={(keys) => setExpandedMenuKeys(keys as string[])}
                onCheck={handleMenuCheck}
                treeData={menuTreeData}
                height={400}
                virtual
              />
            </AntCard>

            <AntCard size="small" type="inner">
              <Space direction="vertical" size="small">
                <Tag color="blue">提示</Tag>
                <div style={{ fontSize: 12, color: '#666' }}>
                  • 勾选菜单后，该菜单下的所有按钮权限将自动勾选
                  <br />
                  • 支持父子节点联动，勾选父节点将自动勾选所有子节点
                  <br />• 使用搜索功能可快速定位需要的菜单
                </div>
              </Space>
            </AntCard>
          </Space>
        )}

        {activeTab === 'buttons' && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <AntCard size="small">
              <Space wrap>
                <Button
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={handleSelectAll}
                >
                  全选
                </Button>
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={handleClearAll}
                >
                  清空
                </Button>
              </Space>
            </AntCard>

            <AntCard
              size="small"
              style={{ maxHeight: 450, overflow: 'auto' }}
              bodyStyle={{ padding: 12 }}
            >
              <Tree
                checkable
                selectable={false}
                checkedKeys={checkedButtonKeys}
                onCheck={(checked) => {
                  const checkedKeys = Array.isArray(checked)
                    ? checked
                    : checked.checked;
                  setCheckedButtonKeys(checkedKeys);
                }}
                treeData={buttonTreeData}
                height={400}
                virtual
                defaultExpandAll
              />
            </AntCard>

            <AntCard size="small" type="inner">
              <Space direction="vertical" size="small">
                <Tag color="green">提示</Tag>
                <div style={{ fontSize: 12, color: '#666' }}>
                  • 按钮权限按菜单分组展示
                  <br />
                  • 勾选菜单权限时，对应的按钮权限会自动勾选
                  <br />• 您也可以单独调整某个菜单下的按钮权限
                </div>
              </Space>
            </AntCard>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
};

export default RoleManagementPage;
