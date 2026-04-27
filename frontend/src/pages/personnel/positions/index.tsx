/**
 * 岗位管理页面（优化版）
 * 使用新的组件库重构，提供更好的视觉效果和用户体验
 */

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Tabs,
  message,
} from 'antd';
import {
  PlusOutlined,
  CheckCircleOutlined,
  StopOutlined,
  EditOutlined,
  DeleteOutlined,
  SortAscendingOutlined,
} from '@ant-design/icons';
import { PageContainer, SectionCard } from '@/components/layout';
import { FilterBar, ActionBar, StatusTag } from '@/components/business';
import { Table, Modal } from '@/components/ui';
import { personnelApi } from '@/api/personnel';
import { systemApi } from '@/api/system';
import { PositionDraggableList } from './components/PositionDraggableList';
import { useFormDraft } from '@/hooks/useFormDraft';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatDate } from '@/utils/format';

/**
 * 岗位数据类型
 */
interface PositionRecord {
  id: string;
  name: string;
  code: string;
  description?: string;
  department_id: string;
  department_name?: string;
  level?: number;
  sequence?: string;
  platform_id?: string;
  status: number;
  sort: number;
  create_time?: string;
  update_time?: string;
}

/**
 * 部门数据类型
 */
interface DepartmentRecord {
  id: string;
  name: string;
}

const PositionManagementPage: React.FC = () => {
  // 状态管理
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<PositionRecord | null>(null);
  const [activeTab, setActiveTab] = useState('list');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<any>({});

  // 表单实例
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 表单草稿保存
  const { clearDraft } = useFormDraft(form, 'position-form', 30000);

  // 查询岗位列表
  const { data = [], isLoading } = useQuery<PositionRecord[]>({
    queryKey: ['personnel-positions'],
    queryFn: personnelApi.listPositions,
  });

  // 查询部门列表
  const { data: departments = [] } = useQuery<DepartmentRecord[]>({
    queryKey: ['system-department-options'],
    queryFn: systemApi.listDepartments,
  });

  // 快捷键支持
  useKeyboardShortcuts({
    'Ctrl+n': () => handleAdd(),
    'Ctrl+r': () => {
      refresh();
      message.success('已刷新');
    },
    Escape: () => {
      setModalVisible(false);
      setEditing(null);
    },
  });

  // 刷新数据
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['personnel-positions'] });
  // 创建岗位
  const createMutation = useMutation({
    mutationFn: personnelApi.createPosition,
    onSuccess: async () => {
      setModalVisible(false);
      form.resetFields();
      clearDraft();
      message.success('创建岗位成功');
      await refresh();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '创建岗位失败');
    },
  });

  // 更新岗位
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, unknown>;
    }) => personnelApi.updatePosition(id, payload),
    onSuccess: async () => {
      setModalVisible(false);
      setEditing(null);
      form.resetFields();
      clearDraft();
      message.success('更新岗位成功');
      await refresh();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '更新岗位失败');
    },
  });

  // 删除岗位
  const deleteMutation = useMutation({
    mutationFn: personnelApi.deletePosition,
    onSuccess: () => {
      message.success('删除岗位成功');
      refresh();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '删除岗位失败');
    },
  });

  // 批量状态更新
  const batchStatusMutation = useMutation({
    mutationFn: (params: { ids: string[]; status: number }) =>
      personnelApi.batchUpdatePositionStatus(params),
    onSuccess: () => {
      message.success('批量操作成功');
      setSelectedIds([]);
      refresh();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '批量操作失败');
    },
  });

  // 新增岗位
  const handleAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 1, sort: 0 });
    setModalVisible(true);
  };

  // 编辑岗位
  const handleEdit = (record: PositionRecord) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  // 删除岗位
  const handleDelete = (record: PositionRecord) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除岗位 "${record.name}" 吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => deleteMutation.mutate(record.id),
    });
  };

  // 批量启用
  const handleBatchEnable = () => {
    if (selectedIds.length === 0) {
      message.warning('请先选择要启用的岗位');
      return;
    }

    Modal.confirm({
      title: '确认批量启用',
      content: `确定要启用选中的 ${selectedIds.length} 个岗位吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => batchStatusMutation.mutate({ ids: selectedIds, status: 1 }),
    });
  };

  // 批量禁用
  const handleBatchDisable = () => {
    if (selectedIds.length === 0) {
      message.warning('请先选择要禁用的岗位');
      return;
    }

    Modal.confirm({
      title: '确认批量禁用',
      content: `确定要禁用选中的 ${selectedIds.length} 个岗位吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => batchStatusMutation.mutate({ ids: selectedIds, status: 0 }),
    });
  };

  // 筛选处理
  const handleSearch = (values: any) => {
    setFilters(values);
  };

  // 重置筛选
  const handleReset = () => {
    setFilters({});
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

  // 过滤数据
  const filteredData = data.filter((item) => {
    if (filters.searchText) {
      const searchMatch =
        item.name?.includes(filters.searchText) ||
        item.code?.includes(filters.searchText) ||
        item.description?.includes(filters.searchText);
      if (!searchMatch) return false;
    }

    if (filters.status !== undefined && item.status !== filters.status) {
      return false;
    }

    if (filters.department_id && item.department_id !== filters.department_id) {
      return false;
    }

    if (filters.level !== undefined && item.level !== filters.level) {
      return false;
    }

    return true;
  });

  // 表格列配置
  const columns = [
    {
      title: '岗位名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text: string) => (
        <div style={{ fontWeight: 500 }}>{text}</div>
      ),
    },
    {
      title: '岗位编码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '所属部门',
      dataIndex: 'department_name',
      key: 'department_name',
      width: 150,
    },
    {
      title: '岗位等级',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: number) => level ? `L${level}` : '-',
    },
    {
      title: '岗位序列',
      dataIndex: 'sequence',
      key: 'sequence',
      width: 120,
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
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: PositionRecord) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除岗位 "${record.name}" 吗？`}
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="岗位管理"
      subTitle="管理企业岗位信息，支持批量操作和拖拽排序"
      breadcrumb={{
        items: [
          { title: '首页', path: '/' },
          { title: '人事管理' },
          { title: '岗位管理' },
        ],
      }}
    >
      {/* 筛选区域 */}
      <SectionCard title="筛选条件" collapsible defaultCollapsed={false}>
        <FilterBar
          items={[
            {
              name: 'searchText',
              label: '搜索',
              type: 'input',
              placeholder: '搜索岗位名称、编码、描述',
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
            {
              name: 'department_id',
              label: '所属部门',
              type: 'select',
              options: [
                { label: '全部', value: undefined },
                ...departments.map((item: any) => ({
                  label: item.name,
                  value: item.id,
                })),
              ],
            },
            {
              name: 'level',
              label: '岗位等级',
              type: 'select',
              options: [
                { label: '全部', value: undefined },
                { label: 'L1', value: 1 },
                { label: 'L2', value: 2 },
                { label: 'L3', value: 3 },
                { label: 'L4', value: 4 },
                { label: 'L5', value: 5 },
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
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'list',
              label: (
                <Space>
                  <span>岗位列表</span>
                </Space>
              ),
              children: (
                <>
                  <ActionBar
                    actions={[
                      {
                        key: 'add',
                        label: '新增岗位',
                        icon: <PlusOutlined />,
                        type: 'primary',
                        onClick: handleAdd,
                      },
                      {
                        key: 'batch-enable',
                        label: `批量启用${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`,
                        icon: <CheckCircleOutlined />,
                        disabled: selectedIds.length === 0,
                        onClick: handleBatchEnable,
                      },
                      {
                        key: 'batch-disable',
                        label: `批量禁用${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`,
                        icon: <StopOutlined />,
                        disabled: selectedIds.length === 0,
                        onClick: handleBatchDisable,
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
                </>
              ),
            },
            {
              key: 'sort',
              label: (
                <Space>
                  <SortAscendingOutlined />
                  <span>岗位排序</span>
                </Space>
              ),
              children: (
                <div style={{ minHeight: 400 }}>
                  <PositionDraggableList positions={data} onUpdate={refresh} />
                </div>
              ),
            },
          ]}
        />
      </SectionCard>

      {/* 岗位表单弹窗 */}
      <Modal
        visible={modalVisible}
        title={editing ? '编辑岗位' : '新增岗位'}
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
            label="岗位名称"
            name="name"
            rules={[
              { required: true, message: '请输入岗位名称' },
              { max: 50, message: '岗位名称最多50个字符' },
            ]}
          >
            <Input placeholder="请输入岗位名称" />
          </Form.Item>

          <Form.Item
            label="岗位编码"
            name="code"
            rules={[
              { required: !editing, message: '请输入岗位编码' },
              { max: 20, message: '岗位编码最多20个字符' },
            ]}
          >
            <Input
              disabled={Boolean(editing)}
              placeholder={editing ? '一经创建不可修改' : '请输入岗位编码'}
            />
          </Form.Item>

          <Form.Item
            label="所属部门"
            name="department_id"
            rules={[{ required: true, message: '请选择所属部门' }]}
          >
            <Select
              placeholder="请选择所属部门"
              options={departments.map((item) => ({
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
            label="岗位等级"
            name="level"
            tooltip="岗位等级用于区分岗位层次，数字越大等级越高"
          >
            <Select
              placeholder="请选择岗位等级（可选）"
              allowClear
              options={[
                { label: 'L1 - 初级', value: 1 },
                { label: 'L2 - 中级', value: 2 },
                { label: 'L3 - 高级', value: 3 },
                { label: 'L4 - 专家', value: 4 },
                { label: 'L5 - 资深专家', value: 5 },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="岗位序列"
            name="sequence"
            tooltip="岗位序列用于分类管理，如技术序列、管理序列等"
          >
            <Select
              placeholder="请选择岗位序列（可选）"
              allowClear
              options={[
                { label: '技术序列', value: '技术序列' },
                { label: '管理序列', value: '管理序列' },
                { label: '产品序列', value: '产品序列' },
                { label: '运营序列', value: '运营序列' },
                { label: '市场序列', value: '市场序列' },
                { label: '销售序列', value: '销售序列' },
                { label: '职能序列', value: '职能序列' },
              ]}
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

          <Form.Item label="描述" name="description">
            <Input.TextArea
              rows={3}
              placeholder="请输入岗位描述（可选）"
              maxLength={200}
              showCount
            />
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
                <li>岗位编码一经创建不可修改</li>
                <li>修改岗位信息后会立即生效</li>
                <li>禁用岗位后，相关员工的岗位信息会受到影响</li>
              </ul>
            </div>
          )}
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default PositionManagementPage;
