/**
 * 审批流程页面（优化版）
 * 使用新的组件库重构，提供更好的视觉效果和用户体验
 */

import React, { useMemo, useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftOutlined,
  CopyOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Form,
  Input,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import { PageContainer, SectionCard } from '@/components/layout';
import { FilterBar, ActionBar, StatusTag } from '@/components/business';
import { Table, Button, Modal } from '@/components/ui';
import {
  approvalApi,
  type ApprovalNode,
  type ApprovalPerson,
  type ApprovalTemplate,
} from '@/api/approval';
import { Permission } from '@/components/permission/Permission';
import { WorkflowEditor } from './components/WorkflowEditor';
import { useDebounce, useFormDraft, useKeyboardShortcuts } from '@/hooks';
import { formatDate } from '@/utils/format';

const { Text } = Typography;

/**
 * 创建默认审批节点
 */
function createDefaultNodes(): ApprovalNode[] {
  return [
    {
      id: 'start',
      name: '开始',
      type: 'start',
      timeoutHours: 0,
      approvers: [],
      copies: [],
    },
    {
      id: `approval-${Date.now()}`,
      name: '一级审批',
      type: 'approval',
      timeoutHours: 24,
      approvers: [],
      copies: [],
    },
    {
      id: 'end',
      name: '结束',
      type: 'end',
      timeoutHours: 0,
      approvers: [],
      copies: [],
    },
  ];
}

const ApprovalProcessPage: React.FC = () => {
  // 状态管理
  const [filters, setFilters] = useState<any>({});
  const [editingTemplate, setEditingTemplate] = useState<ApprovalTemplate | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 表单实例
  const [createForm] = Form.useForm();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<any>(null);

  // 使用表单草稿自动保存
  const { clearDraft } = useFormDraft(
    createForm,
    'approval-template-form',
    30000,
  );

  // 快捷键支持
  useKeyboardShortcuts({
    'Ctrl+n': () => {
      setCreateModalVisible(true);
      createForm.resetFields();
    },
    'Ctrl+f': () => searchInputRef.current?.focus(),
    'Ctrl+r': () => refetch(),
    Escape: () => {
      if (createModalVisible) setCreateModalVisible(false);
    },
  });

  // 防抖搜索
  const debouncedFilters = useDebounce(filters, 500);

  // 查询审批模板列表
  const { data: templates = [], isLoading, refetch } = useQuery({
    queryKey: ['approval-templates', debouncedFilters],
    queryFn: () => approvalApi.listTemplates(debouncedFilters),
    staleTime: 2 * 60 * 1000,
  });

  // 查询审批人员列表
  const { data: people = [] } = useQuery<ApprovalPerson[]>({
    queryKey: ['approval-people'],
    queryFn: approvalApi.listPeople,
    staleTime: 5 * 60 * 1000,
  });

  // 创建模板
  const createMutation = useMutation({
    mutationFn: approvalApi.createTemplate,
    onSuccess: async (template: ApprovalTemplate) => {
      message.success('模板已创建');
      setCreateModalVisible(false);
      createForm.resetFields();
      clearDraft();
      setEditingTemplate(template);
      refetch();
    },
    onError: () => {
      message.error('创建失败，请重试');
    },
  });

  // 保存模板
  const saveMutation = useMutation({
    mutationFn: (payload: { id: string; data: ApprovalTemplate }) =>
      approvalApi.saveTemplate(payload.id, payload.data),
    onSuccess: async () => {
      message.success('流程已保存');
      setEditingTemplate(null);
      refetch();
    },
    onError: () => {
      message.error('保存失败，请重试');
    },
  });

  // 删除模板
  const deleteMutation = useMutation({
    mutationFn: approvalApi.deleteTemplate,
    onSuccess: async () => {
      message.success('模板已删除');
      refetch();
    },
    onError: () => {
      message.error('删除失败，请重试');
    },
  });

  // 复制模板
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => approvalApi.duplicateTemplate(id),
    onSuccess: async () => {
      message.success('模板已复制');
      refetch();
    },
    onError: () => {
      message.error('复制失败，请重试');
    },
  });

  // 表格列配置
  const columns = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      fixed: 'left' as const,
      render: (text: string, record: ApprovalTemplate) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {record.description || '-'}
          </div>
        </div>
      ),
    },
    {
      title: '审批类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <StatusTag status="default" text={type} />
      ),
    },
    {
      title: '适用范围',
      key: 'scope',
      width: 200,
      render: (_: any, record: ApprovalTemplate) => (
        <div>
          <div style={{ fontSize: 12, color: '#666' }}>{record.platformName}</div>
          <div style={{ fontWeight: 500 }}>{record.departmentName}</div>
        </div>
      ),
    },
    {
      title: '流程节点',
      dataIndex: 'nodes',
      key: 'nodes',
      width: 300,
      render: (nodes: ApprovalNode[]) => (
        <Space size={4} wrap>
          {(nodes || []).map((node, idx) => (
            <span key={node.id} style={{ display: 'flex', alignItems: 'center' }}>
              <Badge
                count={idx + 1}
                size="small"
                style={{ backgroundColor: '#64748b', transform: 'scale(0.8)' }}
              />
              <Text style={{ marginLeft: 4, fontSize: 12, fontWeight: 500, color: '#666' }}>
                {node.name}
              </Text>
              {idx < nodes.length - 1 ? (
                <span style={{ margin: '0 4px', color: '#ccc' }}>→</span>
              ) : null}
            </span>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <StatusTag
          status={status === 'enabled' ? 'success' : 'default'}
          text={status === 'enabled' ? '启用中' : '已禁用'}
        />
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
      render: (date: string) => formatDate(date),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right' as const,
      render: (_: any, record: ApprovalTemplate) => (
        <Space size="small">
          <Permission code="approval:process:update">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => setEditingTemplate(record)}
            >
              配置流程
            </Button>
          </Permission>
          <Permission code="approval:process:update">
            <Button
              type="link"
              size="small"
              icon={<CopyOutlined />}
              loading={
                duplicateMutation.isPending &&
                duplicateMutation.variables === record.id
              }
              onClick={() => duplicateMutation.mutate(record.id)}
            >
              复制
            </Button>
          </Permission>
          <Permission code="approval:process:delete">
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

  // 刷新数据
  const handleRefresh = () => {
    refetch();
    message.success('数据已刷新');
  };

  // 新增模板
  const handleAdd = () => {
    setCreateModalVisible(true);
    createForm.resetFields();
  };

  // 删除模板
  const handleDelete = (record: ApprovalTemplate) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除审批模板 "${record.name}" 吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => deleteMutation.mutate(record.id),
    });
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedIds.length === 0) {
      message.warning('请先选择要删除的模板');
      return;
    }

    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedIds.length} 个审批模板吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await Promise.all(selectedIds.map(id => approvalApi.deleteTemplate(id)));
          message.success('批量删除成功');
          setSelectedIds([]);
          refetch();
        } catch (error: any) {
          message.error(error?.response?.data?.message || '批量删除失败');
        }
      },
    });
  };

  // 提交创建表单
  const handleCreateSubmit = async () => {
    try {
      const values = await createForm.validateFields();
      createMutation.mutate({
        id: `tpl-${Date.now()}`,
        name: values.name,
        type: values.type,
        platformName: values.platformName,
        departmentName: values.departmentName,
        status: values.status,
        description: values.description || '',
        updatedAt: new Date().toISOString(),
        nodes: createDefaultNodes(),
      });
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 如果正在编辑模板，显示工作流编辑器
  if (editingTemplate) {
    return (
      <PageContainer
        title="配置审批流程"
        breadcrumb={{
          items: [
            { title: '首页', path: '/' },
            { title: '审批管理' },
            { title: '审批流程', path: '/approval/process' },
            { title: '配置流程' },
          ],
        }}
        extra={
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => setEditingTemplate(null)}
          >
            返回模板列表
          </Button>
        }
      >
        <SectionCard>
          <WorkflowEditor
            template={editingTemplate}
            people={people}
            onSave={(nodes, formFields) =>
              saveMutation.mutate({
                id: editingTemplate.id,
                data: {
                  ...editingTemplate,
                  nodes,
                  formFields,
                  updatedAt: new Date().toISOString(),
                },
              })
            }
            loading={saveMutation.isPending}
          />
        </SectionCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="审批流程"
      subTitle="管理审批模板和流程配置，支持可视化流程设计"
      breadcrumb={{
        items: [
          { title: '首页', path: '/' },
          { title: '审批管理' },
          { title: '审批流程' },
        ],
      }}
    >
      {/* 筛选区域 */}
      <SectionCard title="筛选条件" collapsible defaultCollapsed={false}>
        <FilterBar
          items={[
            {
              name: 'name',
              label: '模板名称',
              type: 'input',
              placeholder: '请输入模板名称',
            },
            {
              name: 'type',
              label: '审批类型',
              type: 'select',
              options: [
                { label: '全部类型', value: undefined },
                { label: '请假', value: '请假' },
                { label: '加班', value: '加班' },
                { label: '报销', value: '报销' },
              ],
            },
            {
              name: 'status',
              label: '状态',
              type: 'select',
              options: [
                { label: '全部状态', value: undefined },
                { label: '启用', value: 'enabled' },
                { label: '禁用', value: 'disabled' },
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
              label: '创建模板',
              icon: <PlusOutlined />,
              type: 'primary',
              permission: 'approval:process:create',
              onClick: handleAdd,
            },
            {
              key: 'refresh',
              label: '刷新数据',
              icon: <ReloadOutlined />,
              onClick: handleRefresh,
            },
            {
              key: 'batch-delete',
              label: `批量删除${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`,
              icon: <SettingOutlined />,
              disabled: selectedIds.length === 0,
              permission: 'approval:process:delete',
              onClick: handleBatchDelete,
            },
          ]}
          extra={
            <Space>
              <span style={{ color: '#999', fontSize: 14 }}>
                共 {templates.length} 条记录
                {selectedIds.length > 0 && ` / 已选 ${selectedIds.length} 条`}
              </span>
            </Space>
          }
          align="space-between"
          glass
        />

        <Table
          columns={columns}
          dataSource={templates}
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
          scroll={{ x: 1200 }}
        />
      </SectionCard>

      {/* 创建模板弹窗 */}
      <Modal
        visible={createModalVisible}
        title="创建审批模板"
        width={600}
        glass
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        onOk={handleCreateSubmit}
        confirmLoading={createMutation.isPending}
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{ status: 'enabled', type: '请假' }}
        >
          <Form.Item
            label="模板名称"
            name="name"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="请输入模板名称" />
          </Form.Item>

          <Form.Item
            label="审批类型"
            name="type"
            rules={[{ required: true, message: '请选择审批类型' }]}
          >
            <Select
              placeholder="请选择审批类型"
              options={[
                { label: '请假', value: '请假' },
                { label: '加班', value: '加班' },
                { label: '报销', value: '报销' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="平台名称"
            name="platformName"
            rules={[{ required: true, message: '请输入平台名称' }]}
          >
            <Input placeholder="请输入平台名称" />
          </Form.Item>

          <Form.Item
            label="部门名称"
            name="departmentName"
            rules={[{ required: true, message: '请输入部门名称' }]}
          >
            <Input placeholder="请输入部门名称" />
          </Form.Item>

          <Form.Item
            label="状态"
            name="status"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select
              placeholder="请选择状态"
              options={[
                { label: '启用', value: 'enabled' },
                { label: '禁用', value: 'disabled' },
              ]}
            />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea
              rows={3}
              placeholder="请输入模板描述"
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default ApprovalProcessPage;
