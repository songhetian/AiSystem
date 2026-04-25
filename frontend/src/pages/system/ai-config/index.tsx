import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  message,
  Popconfirm,
  Empty,
  Tooltip,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  RobotOutlined,
  EyeOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import { GlobalLoading } from '@/components/common/GlobalLoading';
import { SmartSearch } from '@/components/common/SmartSearch';
import { useDebounce } from '@/hooks/useDebounce';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useFormDraft } from '@/hooks/useFormDraft';
import type { ColumnsType } from 'antd/es/table';

const { TextArea } = Input;
const { Option } = Select;

// 类型定义
interface AIConfig {
  id: string;
  scopeType: string;
  scopeId?: string;
  provider: string;
  apiBaseUrl?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  priority: number;
  status: number;
  remark?: string;
  hasApiKey: boolean;
  createdBy?: string;
  createTime: string;
  updateTime: string;
}

interface AIConfigDetail extends AIConfig {
  apiKey: string;
  extraConfig?: any;
}

// API服务
const aiConfigService = {
  list: (params: any) =>
    request.get('/api/system/ai-config/list', { params }),

  detail: (id: string) =>
    request.get(`/api/system/ai-config/detail/${id}`),

  current: (params: any) =>
    request.get('/api/system/ai-config/current', { params }),

  upsert: (data: any) =>
    request.post('/api/system/ai-config/upsert', data),

  updateStatus: (data: any) =>
    request.put('/api/system/ai-config/status', data),

  delete: (id: string) =>
    request.delete(`/api/system/ai-config/${id}`),
};

const AIConfigManagement: React.FC = () => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<any>(null);

  // 状态管理
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [currentConfigVisible, setCurrentConfigVisible] = useState(false);

  // 搜索防抖
  const debouncedSearchText = useDebounce(searchText, 500);

  // 表单草稿保存
  const { clearDraft } = useFormDraft(form, 'ai-config-form', 30000);

  // 快捷键支持
  useKeyboardShortcuts({
    'Ctrl+n': () => handleCreate(),
    'Ctrl+f': () => searchInputRef.current?.focus(),
    'Ctrl+r': () => queryClient.invalidateQueries({ queryKey: ['ai-configs'] }),
    'Escape': () => setModalVisible(false),
  });

  // 查询AI配置列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ai-configs', page, pageSize, debouncedSearchText],
    queryFn: () =>
      aiConfigService.list({
        page,
        pageSize,
        searchText: debouncedSearchText,
      }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 创建/更新配置
  const upsertMutation = useMutation({
    mutationFn: aiConfigService.upsert,
    onSuccess: () => {
      message.success(editingId ? '更新成功' : '创建成功');
      setModalVisible(false);
      clearDraft();
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] });
    },
    onError: (error: any) => {
      message.error(error.message || '操作失败');
    },
  });

  // 更新状态
  const updateStatusMutation = useMutation({
    mutationFn: aiConfigService.updateStatus,
    onSuccess: () => {
      message.success('状态更新成功');
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] });
    },
    onError: (error: any) => {
      message.error(error.message || '状态更新失败');
    },
  });

  // 删除配置
  const deleteMutation = useMutation({
    mutationFn: aiConfigService.delete,
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] });
    },
    onError: (error: any) => {
      message.error(error.message || '删除失败');
    },
  });

  // 处理创建
  const handleCreate = () => {
    setEditingId(null);
    form.resetFields();
    setModalVisible(true);
  };

  // 处理编辑
  const handleEdit = async (record: AIConfig) => {
    const hide = message.loading('加载配置详情...', 0);
    try {
      const detail = await aiConfigService.detail(record.id);
      setEditingId(record.id);
      form.setFieldsValue({
        scopeType: detail.scopeType,
        scopeId: detail.scopeId,
        provider: detail.provider,
        apiKey: detail.apiKey,
        apiBaseUrl: detail.apiBaseUrl,
        model: detail.model,
        maxTokens: detail.maxTokens,
        temperature: detail.temperature,
        remark: detail.remark,
      });
      setModalVisible(true);
      hide();
    } catch (error: any) {
      hide();
      message.error(error.message || '加载失败');
    }
  };

  // 处理提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await upsertMutation.mutateAsync(values);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 处理删除
  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个AI配置吗？此操作不可恢复。',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => deleteMutation.mutateAsync(id),
    });
  };

  // 处理状态切换
  const handleStatusToggle = (record: AIConfig) => {
    updateStatusMutation.mutate({
      id: record.id,
      status: record.status === 1 ? 0 : 1,
    });
  };

  // 查看当前生效配置
  const handleViewCurrent = async () => {
    const hide = message.loading('加载当前配置...', 0);
    try {
      const config = await aiConfigService.current({});
      hide();
      Modal.info({
        title: '当前生效的AI配置',
        width: 600,
        content: (
          <div style={{ marginTop: 16 }}>
            <p><strong>服务商:</strong> {config.provider}</p>
            <p><strong>模型:</strong> {config.model}</p>
            <p><strong>API地址:</strong> {config.apiBaseUrl}</p>
            <p><strong>最大Token:</strong> {config.maxTokens}</p>
            <p><strong>温度参数:</strong> {config.temperature}</p>
          </div>
        ),
      });
    } catch (error: any) {
      hide();
      message.error(error.message || '加载失败');
    }
  };

  // 表格列定义
  const columns: ColumnsType<AIConfig> = [
    {
      title: '配置范围',
      dataIndex: 'scopeType',
      key: 'scopeType',
      width: 150,
      render: (scopeType, record) => {
        const scopeMap: Record<string, { text: string; color: string }> = {
          global: { text: '全局', color: 'blue' },
          platform: { text: '平台', color: 'green' },
          department: { text: '部门', color: 'orange' },
          shop: { text: '店铺', color: 'purple' },
        };
        const scope = scopeMap[scopeType] || { text: scopeType, color: 'default' };
        return (
          <Space>
            <Tag color={scope.color}>{scope.text}</Tag>
            {record.scopeId && <span style={{ fontSize: 12, color: '#999' }}>{record.scopeId}</span>}
          </Space>
        );
      },
    },
    {
      title: 'AI服务商',
      dataIndex: 'provider',
      key: 'provider',
      width: 120,
      render: (provider) => {
        const providerMap: Record<string, { text: string; color: string }> = {
          openai: { text: 'OpenAI', color: 'green' },
          azure: { text: 'Azure', color: 'blue' },
          baidu: { text: '文心一言', color: 'red' },
          aliyun: { text: '通义千问', color: 'orange' },
        };
        const p = providerMap[provider] || { text: provider, color: 'default' };
        return <Tag color={p.color}>{p.text}</Tag>;
      },
    },
    {
      title: '模型',
      dataIndex: 'model',
      key: 'model',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'API地址',
      dataIndex: 'apiBaseUrl',
      key: 'apiBaseUrl',
      width: 200,
      ellipsis: true,
      render: (url) => (
        <Tooltip title={url}>
          <span>{url || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: 'API Key',
      key: 'hasApiKey',
      width: 100,
      render: (_, record) => (
        record.hasApiKey ? (
          <Tag color="success">已配置</Tag>
        ) : (
          <Tag color="error">未配置</Tag>
        )
      ),
    },
    {
      title: '参数',
      key: 'params',
      width: 150,
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div>Token: {record.maxTokens}</div>
          <div>温度: {record.temperature}</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status, record) => (
        <Switch
          checked={status === 1}
          onChange={() => handleStatusToggle(record)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 200,
      ellipsis: true,
      render: (remark) => (
        <Tooltip title={remark}>
          <span>{remark || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
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
            title="确定要删除吗？"
            onConfirm={() => handleDelete(record.id)}
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
    <Card
      title={
        <Space>
          <RobotOutlined />
          <span>AI配置管理</span>
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="Ctrl+N">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              新增配置
            </Button>
          </Tooltip>
          <Button
            icon={<EyeOutlined />}
            onClick={handleViewCurrent}
          >
            查看当前配置
          </Button>
          <Tooltip title="Ctrl+R">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
            >
              刷新
            </Button>
          </Tooltip>
        </Space>
      }
    >
      <Alert
        message="配置优先级说明"
        description="店铺配置 > 部门配置 > 平台配置 > 全局配置 > 环境变量。系统会自动选择优先级最高的配置。"
        type="info"
        showIcon
        closable
        style={{ marginBottom: 16 }}
      />

      <div style={{ marginBottom: 16 }}>
        <SmartSearch
          onSearch={setSearchText}
          storageKey="ai-config-search-history"
          ref={searchInputRef}
        />
      </div>

      <GlobalLoading loading={isLoading}>
        {data?.list?.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无AI配置"
            style={{ marginTop: 100 }}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              创建第一个配置
            </Button>
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={data?.list || []}
            rowKey="id"
            scroll={{ x: 1400 }}
            pagination={{
              current: page,
              pageSize,
              total: data?.total || 0,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (newPage, newPageSize) => {
                setPage(newPage);
                setPageSize(newPageSize);
              },
            }}
          />
        )}
      </GlobalLoading>

      {/* 创建/编辑弹窗 */}
      <Modal
        title={editingId ? '编辑AI配置' : '新增AI配置'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={700}
        confirmLoading={upsertMutation.isPending}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            provider: 'openai',
            maxTokens: 2000,
            temperature: 0.7,
            scopeType: 'global',
          }}
        >
          <Form.Item
            name="scopeType"
            label="配置范围"
            rules={[{ required: true, message: '请选择配置范围' }]}
          >
            <Select placeholder="请选择配置范围">
              <Option value="global">全局配置</Option>
              <Option value="platform">平台配置</Option>
              <Option value="department">部门配置</Option>
              <Option value="shop">店铺配置</Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.scopeType !== currentValues.scopeType
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('scopeType') !== 'global' ? (
                <Form.Item
                  name="scopeId"
                  label="范围ID"
                  rules={[{ required: true, message: '请输入范围ID' }]}
                >
                  <Input placeholder="请输入平台ID/部门ID/店铺ID" />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item
            name="provider"
            label="AI服务商"
            rules={[{ required: true, message: '请选择AI服务商' }]}
          >
            <Select placeholder="请选择AI服务商">
              <Option value="openai">OpenAI</Option>
              <Option value="azure">Azure OpenAI</Option>
              <Option value="baidu">百度文心一言</Option>
              <Option value="aliyun">阿里通义千问</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="apiKey"
            label="API Key"
            rules={[{ required: true, message: '请输入API Key' }]}
          >
            <Input.Password placeholder="请输入API Key" />
          </Form.Item>

          <Form.Item
            name="apiBaseUrl"
            label="API地址"
            tooltip="留空则使用默认地址"
          >
            <Input placeholder="https://api.openai.com/v1" />
          </Form.Item>

          <Form.Item
            name="model"
            label="模型名称"
            rules={[{ required: true, message: '请输入模型名称' }]}
          >
            <Input placeholder="gpt-3.5-turbo" />
          </Form.Item>

          <Form.Item
            name="maxTokens"
            label="最大Token数"
            rules={[
              { required: true, message: '请输入最大Token数' },
              { type: 'number', min: 100, max: 100000, message: '范围: 100-100000' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="2000"
              min={100}
              max={100000}
            />
          </Form.Item>

          <Form.Item
            name="temperature"
            label="温度参数"
            tooltip="控制输出的随机性，0-2之间"
            rules={[
              { required: true, message: '请输入温度参数' },
              { type: 'number', min: 0, max: 2, message: '范围: 0-2' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="0.7"
              min={0}
              max={2}
              step={0.1}
            />
          </Form.Item>

          <Form.Item name="remark" label="备注">
            <TextArea
              rows={3}
              placeholder="请输入备注信息"
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AIConfigManagement;
