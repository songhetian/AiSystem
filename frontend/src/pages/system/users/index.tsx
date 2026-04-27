/**
 * 用户管理页面（优化版）
 * 使用新的组件库重构，提供更好的视觉效果和用户体验
 */

import React, { useState } from 'react';
import { message, Space, Form, Input, Select } from 'antd';
import {
  PlusOutlined,
  KeyOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { PageContainer, SectionCard } from '@/components/layout';
import { FilterBar, ActionBar, StatusTag } from '@/components/business';
import { Table, Button, Modal } from '@/components/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemApi } from '@/api/system';
import { formatDate } from '@/utils/format';
import { Permission } from '@/components/permission/Permission';

/**
 * 用户数据类型
 */
interface User {
  id: string;
  username: string;
  name: string;
  phone?: string;
  email?: string;
  status: number;
  last_login_time?: string;
  create_time: string;
  roles?: any[];
}

const UserManagementPage: React.FC = () => {
  // 状态管理
  const [filters, setFilters] = useState<any>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 弹窗状态
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [assignRoleVisible, setAssignRoleVisible] = useState(false);
  const [batchAssignVisible, setBatchAssignVisible] = useState(false);
  const [resetPasswordVisible, setResetPasswordVisible] = useState(false);

  // 当前操作的数据
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [editing, setEditing] = useState<User | null>(null);

  // 表单实例
  const [userForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [batchAssignForm] = Form.useForm();
  const [resetPasswordForm] = Form.useForm();

  const queryClient = useQueryClient();

  // 查询用户列表
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['system-users'],
    queryFn: systemApi.listUsers,
  });

  // 查询角色列表
  const { data: roles = [] } = useQuery({
    queryKey: ['system-roles-options'],
    queryFn: systemApi.listRoles,
  });

  // 创建用户
  const createMutation = useMutation({
    mutationFn: systemApi.createUser,
    onSuccess: () => {
      message.success('创建用户成功');
      setUserModalVisible(false);
      userForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || '创建用户失败');
    },
  });

  // 更新用户
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      systemApi.updateUser(id, data),
    onSuccess: () => {
      message.success('更新用户成功');
      setUserModalVisible(false);
      userForm.resetFields();
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || '更新用户失败');
    },
  });

  // 删除用户
  const deleteMutation = useMutation({
    mutationFn: systemApi.deleteUser,
    onSuccess: () => {
      message.success('删除用户成功');
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || '删除用户失败');
    },
  });

  // 批量重置密码
  const batchResetPasswordMutation = useMutation({
    mutationFn: (password: string) =>
      systemApi.batchResetPassword({ ids: selectedIds, password }),
    onSuccess: () => {
      message.success(`已成功重置 ${selectedIds.length} 个用户的密码`);
      setResetPasswordVisible(false);
      resetPasswordForm.resetFields();
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
    },
    onError: (e: any) =>
      message.error(e?.response?.data?.message || '批量重置密码失败'),
  });

  // 批量分配角色
  const batchAssignRolesMutation = useMutation({
    mutationFn: (role_ids: string[]) =>
      systemApi.batchAssignRoles({ ids: selectedIds, role_ids }),
    onSuccess: () => {
      message.success(`已成功为 ${selectedIds.length} 个用户分配角色`);
      setBatchAssignVisible(false);
      batchAssignForm.resetFields();
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
    },
    onError: (e: any) =>
      message.error(e?.response?.data?.message || '批量分配角色失败'),
  });

  // 表格列配置
  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 150,
      fixed: 'left' as const,
      render: (text: string) => (
        <div style={{ fontWeight: 500 }}>{text}</div>
      ),
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
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
      title: '最后登录',
      dataIndex: 'last_login_time',
      key: 'last_login_time',
      width: 180,
      render: (date: string) => (date ? formatDate(date) : '-'),
    },
    {
      title: '创建时间',
      dataIndex: 'create_time',
      key: 'create_time',
      width: 180,
      render: (date: string) => formatDate(date),
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right' as const,
      render: (_: any, record: User) => (
        <Space size="small">
          <Permission code="system:user:update">
            <Button
              type="link"
              size="small"
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          </Permission>
          <Permission code="system:user:assign-roles">
            <Button
              type="link"
              size="small"
              onClick={() => handleAssignRole(record)}
            >
              分配角色
            </Button>
          </Permission>
          <Permission code="system:user:reset-password">
            <Button
              type="link"
              size="small"
              onClick={() => handleResetPassword(record)}
            >
              重置密码
            </Button>
          </Permission>
          <Permission code="system:user:delete">
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

  // 筛选处理
  const handleSearch = (values: any) => {
    setFilters(values);
  };

  // 重置筛选
  const handleReset = () => {
    setFilters({});
  };

  // 新增用户
  const handleAdd = () => {
    setEditing(null);
    userForm.resetFields();
    setUserModalVisible(true);
  };

  // 编辑用户
  const handleEdit = (record: User) => {
    setEditing(record);
    userForm.setFieldsValue(record);
    setUserModalVisible(true);
  };

  // 删除用户
  const handleDelete = (record: User) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除用户 "${record.name}" 吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => deleteMutation.mutate(record.id),
    });
  };

  // 分配角色
  const handleAssignRole = async (record: User) => {
    setCurrentUser(record);
    try {
      const r = await systemApi.getUserRoles(record.id);
      assignForm.setFieldsValue({ role_ids: r.role_ids });
      setAssignRoleVisible(true);
    } catch (error: any) {
      message.error(error?.response?.data?.message || '获取用户角色失败');
    }
  };

  // 重置密码
  const handleResetPassword = (record: User) => {
    Modal.confirm({
      title: '确认重置密码',
      content: `确定要重置用户 "${record.name}" 的密码为 123456 吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await systemApi.resetUserPassword(record.id, { password: '123456' });
          message.success('重置密码成功');
          queryClient.invalidateQueries({ queryKey: ['system-users'] });
        } catch (error: any) {
          message.error(error?.response?.data?.message || '重置密码失败');
        }
      },
    });
  };

  // 批量启用
  const handleBatchEnable = async () => {
    if (selectedIds.length === 0) {
      message.warning('请先选择要启用的用户');
      return;
    }

    Modal.confirm({
      title: '确认批量启用',
      content: `确定要启用选中的 ${selectedIds.length} 个用户吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await systemApi.batchUpdateUserStatus({ ids: selectedIds, status: 1 });
          message.success('批量启用成功');
          setSelectedIds([]);
          queryClient.invalidateQueries({ queryKey: ['system-users'] });
        } catch (error: any) {
          message.error(error?.response?.data?.message || '批量启用失败');
        }
      },
    });
  };

  // 批量禁用
  const handleBatchDisable = async () => {
    if (selectedIds.length === 0) {
      message.warning('请先选择要禁用的用户');
      return;
    }

    Modal.confirm({
      title: '确认批量禁用',
      content: `确定要禁用选中的 ${selectedIds.length} 个用户吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await systemApi.batchUpdateUserStatus({ ids: selectedIds, status: 0 });
          message.success('批量禁用成功');
          setSelectedIds([]);
          queryClient.invalidateQueries({ queryKey: ['system-users'] });
        } catch (error: any) {
          message.error(error?.response?.data?.message || '批量禁用失败');
        }
      },
    });
  };

  // 批量重置密码
  const handleBatchResetPassword = () => {
    if (selectedIds.length === 0) {
      message.warning('请先选择要重置密码的用户');
      return;
    }
    resetPasswordForm.setFieldsValue({ password: '123456' });
    setResetPasswordVisible(true);
  };

  // 批量分配角色
  const handleBatchAssignRole = () => {
    if (selectedIds.length === 0) {
      message.warning('请先选择要分配角色的用户');
      return;
    }
    batchAssignForm.resetFields();
    setBatchAssignVisible(true);
  };

  // 提交用户表单
  const handleUserSubmit = async () => {
    try {
      const values = await userForm.validateFields();
      if (editing) {
        updateMutation.mutate({ id: editing.id, data: values });
      } else {
        createMutation.mutate(values);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 提交分配角色表单
  const handleAssignRoleSubmit = async () => {
    try {
      const values = await assignForm.validateFields();
      if (currentUser) {
        await systemApi.assignUserRoles(currentUser.id, values);
        message.success('分配角色成功');
        setAssignRoleVisible(false);
        assignForm.resetFields();
        setCurrentUser(null);
        queryClient.invalidateQueries({ queryKey: ['system-users'] });
      }
    } catch (error: any) {
      if (error?.response) {
        message.error(error?.response?.data?.message || '分配角色失败');
      }
    }
  };

  // 提交批量重置密码表单
  const handleResetPasswordSubmit = async () => {
    try {
      const values = await resetPasswordForm.validateFields();
      batchResetPasswordMutation.mutate(values.password);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 提交批量分配角色表单
  const handleBatchAssignSubmit = async () => {
    try {
      const values = await batchAssignForm.validateFields();
      batchAssignRolesMutation.mutate(values.role_ids);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 过滤数据
  const filteredData = users.filter((user: User) => {
    if (filters.username && !user.username.includes(filters.username)) {
      return false;
    }
    if (filters.name && !user.name.includes(filters.name)) {
      return false;
    }
    if (filters.phone && !user.phone?.includes(filters.phone)) {
      return false;
    }
    if (filters.status !== undefined && user.status !== filters.status) {
      return false;
    }
    return true;
  });

  return (
    <PageContainer
      title="用户管理"
      subTitle="管理系统用户，支持批量操作和角色分配"
      breadcrumb={{
        items: [
          { title: '首页', path: '/' },
          { title: '系统管理' },
          { title: '用户管理' },
        ],
      }}
    >
      {/* 筛选区域 */}
      <SectionCard title="筛选条件" collapsible defaultCollapsed={false}>
        <FilterBar
          items={[
            {
              name: 'username',
              label: '用户名',
              type: 'input',
              placeholder: '请输入用户名',
            },
            {
              name: 'name',
              label: '姓名',
              type: 'input',
              placeholder: '请输入姓名',
            },
            {
              name: 'phone',
              label: '手机号',
              type: 'input',
              placeholder: '请输入手机号',
            },
            {
              name: 'status',
              label: '状态',
              type: 'select',
              options: [
                { label: '全部', value: undefined },
                { label: '启用', value: 1 },
                { label: '禁用', value: 0 },
              ],
            },
          ]}
          glass
          onSearch={handleSearch}
          onReset={handleReset}
        />
      </SectionCard>

      {/* 数据区域 */}
      <SectionCard>
        <ActionBar
          actions={[
            {
              key: 'add',
              label: '新增用户',
              icon: <PlusOutlined />,
              type: 'primary',
              permission: 'system:user:create',
              onClick: handleAdd,
            },
            {
              key: 'batch-enable',
              label: '批量启用',
              icon: <CheckCircleOutlined />,
              disabled: selectedIds.length === 0,
              permission: 'system:user:batch-status',
              onClick: handleBatchEnable,
            },
            {
              key: 'batch-disable',
              label: '批量禁用',
              icon: <StopOutlined />,
              disabled: selectedIds.length === 0,
              permission: 'system:user:batch-status',
              onClick: handleBatchDisable,
            },
            {
              key: 'batch-reset-password',
              label: `批量重置密码${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`,
              icon: <KeyOutlined />,
              disabled: selectedIds.length === 0,
              permission: 'system:user:batch-reset-password',
              onClick: handleBatchResetPassword,
            },
            {
              key: 'batch-assign-role',
              label: `批量分配角色${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`,
              icon: <TeamOutlined />,
              disabled: selectedIds.length === 0,
              permission: 'system:user:batch-assign-roles',
              onClick: handleBatchAssignRole,
            },
          ]}
          extra={
            <Space>
              <span style={{ color: '#999', fontSize: 14 }}>
                共 {filteredData.length} 条记录
                {selectedIds.length > 0 && ` / 已选 ${selectedIds.length} 条`}
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
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: (keys: React.Key[]) => setSelectedIds(keys as string[]),
          }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </SectionCard>

      {/* 用户表单弹窗 */}
      <Modal
        visible={userModalVisible}
        title={editing ? '编辑用户' : '新增用户'}
        width={600}
        glass
        onCancel={() => {
          setUserModalVisible(false);
          userForm.resetFields();
          setEditing(null);
        }}
        onOk={handleUserSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form
          form={userForm}
          layout="vertical"
          initialValues={{ status: 1 }}
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
              { max: 20, message: '用户名最多20个字符' },
            ]}
          >
            <Input placeholder="请输入用户名" disabled={!!editing} />
          </Form.Item>

          <Form.Item
            label="姓名"
            name="name"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          {!editing && (
            <Form.Item
              label="密码"
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}

          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
            ]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>

          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { type: 'email', message: '请输入正确的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
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

      {/* 分配角色弹窗 */}
      <Modal
        visible={assignRoleVisible}
        title="分配角色"
        width={500}
        glass
        onCancel={() => {
          setAssignRoleVisible(false);
          assignForm.resetFields();
          setCurrentUser(null);
        }}
        onOk={handleAssignRoleSubmit}
      >
        <Form form={assignForm} layout="vertical">
          <div style={{
            marginBottom: 16,
            padding: 12,
            background: '#f0f9ff',
            borderRadius: 8,
          }}>
            <div style={{ fontSize: 14, color: '#0369a1' }}>
              为用户 <strong>{currentUser?.name}</strong> 分配角色
            </div>
          </div>

          <Form.Item
            label="选择角色"
            name="role_ids"
            rules={[{ required: true, message: '请至少选择一个角色' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择角色"
              options={roles.map((item: any) => ({
                label: item.name || item.role_name,
                value: item.id,
              }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <div style={{
            padding: 12,
            background: '#f0f9ff',
            borderRadius: 8,
          }}>
            <div style={{ fontSize: 12, color: '#0369a1' }}>💡 提示：</div>
            <ul style={{
              fontSize: 12,
              color: '#0369a1',
              marginTop: 8,
              paddingLeft: 20,
            }}>
              <li>可以同时选择多个角色</li>
              <li>角色权限会立即生效</li>
            </ul>
          </div>
        </Form>
      </Modal>

      {/* 批量重置密码弹窗 */}
      <Modal
        visible={resetPasswordVisible}
        title={`批量重置密码 (${selectedIds.length}个用户)`}
        width={500}
        glass
        onCancel={() => {
          setResetPasswordVisible(false);
          resetPasswordForm.resetFields();
        }}
        onOk={handleResetPasswordSubmit}
        confirmLoading={batchResetPasswordMutation.isPending}
      >
        <Form form={resetPasswordForm} layout="vertical">
          <div style={{
            marginBottom: 16,
            padding: 12,
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: 8,
          }}>
            <div style={{ fontSize: 14, color: '#c2410c', fontWeight: 500, marginBottom: 8 }}>
              ⚠️ 即将重置 {selectedIds.length} 个用户的密码
            </div>
            <div style={{ fontSize: 12, color: '#c2410c' }}>
              重置后，这些用户需要使用新密码登录。建议通过系统消息或其他方式通知用户。
            </div>
          </div>

          <Form.Item
            label="新密码"
            name="password"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度至少6位' },
            ]}
          >
            <Input.Password
              placeholder="输入新密码（默认：123456）"
              autoComplete="new-password"
            />
          </Form.Item>

          <div style={{
            padding: 12,
            background: '#f0f9ff',
            borderRadius: 8,
          }}>
            <div style={{ fontSize: 12, color: '#0369a1' }}>💡 提示：</div>
            <ul style={{
              fontSize: 12,
              color: '#0369a1',
              marginTop: 8,
              paddingLeft: 20,
            }}>
              <li>默认密码为 123456</li>
              <li>建议用户首次登录后修改密码</li>
              <li>密码长度至少6位</li>
            </ul>
          </div>
        </Form>
      </Modal>

      {/* 批量分配角色弹窗 */}
      <Modal
        visible={batchAssignVisible}
        title={`批量分配角色 (${selectedIds.length}个用户)`}
        width={500}
        glass
        onCancel={() => {
          setBatchAssignVisible(false);
          batchAssignForm.resetFields();
        }}
        onOk={handleBatchAssignSubmit}
        confirmLoading={batchAssignRolesMutation.isPending}
      >
        <Form form={batchAssignForm} layout="vertical">
          <div style={{
            marginBottom: 16,
            padding: 12,
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: 8,
          }}>
            <div style={{ fontSize: 14, color: '#c2410c', fontWeight: 500, marginBottom: 8 }}>
              ⚠️ 即将为 {selectedIds.length} 个用户分配角色
            </div>
            <div style={{ fontSize: 12, color: '#c2410c' }}>
              分配后，这些用户将获得所选角色的权限，权限变更即时生效。
            </div>
          </div>

          <Form.Item
            label="选择角色"
            name="role_ids"
            rules={[{ required: true, message: '请至少选择一个角色' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择要分配的角色"
              options={roles.map((item: any) => ({
                label: item.name || item.role_name,
                value: item.id,
              }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <div style={{
            padding: 12,
            background: '#f0f9ff',
            borderRadius: 8,
          }}>
            <div style={{ fontSize: 12, color: '#0369a1' }}>💡 提示：</div>
            <ul style={{
              fontSize: 12,
              color: '#0369a1',
              marginTop: 8,
              paddingLeft: 20,
            }}>
              <li>可以同时选择多个角色</li>
              <li>角色权限会立即生效，无需用户重新登录</li>
              <li>此操作会覆盖用户原有的角色分配</li>
              <li>建议通过系统消息通知用户权限变更</li>
            </ul>
          </div>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default UserManagementPage;
