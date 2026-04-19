import { useMemo, useState } from 'react';
import type { ProColumns } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tag,
  message,
  Modal,
} from 'antd';
import { ExclamationCircleOutlined, HistoryOutlined } from '@ant-design/icons';
import { useGlobalPrompts } from '@/hooks/useGlobalPrompts';
import { BaseModal } from '@/components/common/BaseModal';
import { Permission } from '@/components/permission/Permission';
import { BaseTable } from '@/components/table/BaseTable';
import { useFormDraft } from '@/hooks/useFormDraft';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useDebounce } from '@/hooks/useDebounce';
import { GlobalLoading } from '@/components/common/GlobalLoading';
import type { GlobalPrompt, SaveGlobalPromptDto } from '@/api/quality-prompt';
import { VersionHistory } from '../components/VersionHistory';

/**
 * 全局Prompt管理页面
 * 仅Super Admin可访问
 * 功能: 列表展示、搜索、排序、新建、编辑、删除、启用/禁用
 */
export default function GlobalPromptManagementPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GlobalPrompt | null>(null);
  const [form] = Form.useForm();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<number | undefined>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [selectedPromptForVersion, setSelectedPromptForVersion] = useState<GlobalPrompt | null>(null);

  // 防抖搜索
  const debouncedKeyword = useDebounce(searchKeyword, 500);

  // 表单草稿保存
  const { clearDraft } = useFormDraft(form, 'global-prompt-form', 30000);

  // 使用自定义Hook管理全局Prompt数据
  const {
    data,
    total,
    isLoading,
    create,
    update,
    remove,
    enable,
    disable,
    batchEnable,
    batchDisable,
    isCreating,
    isUpdating,
    isDeleting,
    refetch,
  } = useGlobalPrompts({
    keyword: debouncedKeyword,
    enabled: enabledFilter,
    page: 1,
    pageSize: 20,
  });

  // 快捷键支持
  useKeyboardShortcuts({
    'Ctrl+n': () => {
      setEditing(null);
      setOpen(true);
      form.resetFields();
    },
    'Ctrl+r': () => {
      refetch();
      message.success('已刷新');
    },
    Escape: () => {
      setOpen(false);
      setEditing(null);
    },
  });

  // 打开新建对话框
  const handleCreate = () => {
    setEditing(null);
    setOpen(true);
    form.resetFields();
  };

  // 打开编辑对话框
  const handleEdit = (record: GlobalPrompt) => {
    setEditing(record);
    setOpen(true);
    form.setFieldsValue({
      name: record.name,
      content: record.content,
      applicable_scenarios: record.applicable_scenarios,
      enabled: record.enabled,
      platform_id: record.platform_id,
      sort: record.sort,
    });
  };

  // 保存表单
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const dto: SaveGlobalPromptDto = {
        name: values.name,
        content: values.content,
        applicable_scenarios: values.applicable_scenarios,
        enabled: values.enabled,
        platform_id: values.platform_id || '1', // 默认平台ID
        sort: values.sort || 0,
      };

      if (editing) {
        update({ id: editing.id, data: dto });
      } else {
        create(dto);
      }

      setOpen(false);
      setEditing(null);
      form.resetFields();
      clearDraft();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 删除Prompt
  const handleDelete = (record: GlobalPrompt) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除全局Prompt "${record.name}" 吗？此操作不可恢复。`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        remove(record.id);
      },
    });
  };

  // 切换启用/禁用状态
  const handleToggleEnabled = (record: GlobalPrompt, checked: boolean) => {
    if (checked) {
      enable(record.id);
    } else {
      disable(record.id);
    }
  };

  // 批量启用
  const handleBatchEnable = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要启用的Prompt');
      return;
    }
    Modal.confirm({
      title: '批量启用',
      icon: <ExclamationCircleOutlined />,
      content: `确定要启用选中的 ${selectedRowKeys.length} 条Prompt吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        batchEnable(selectedRowKeys);
        setSelectedRowKeys([]);
      },
    });
  };

  // 批量禁用
  const handleBatchDisable = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要禁用的Prompt');
      return;
    }
    Modal.confirm({
      title: '批量禁用',
      icon: <ExclamationCircleOutlined />,
      content: `确定要禁用选中的 ${selectedRowKeys.length} 条Prompt吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        batchDisable(selectedRowKeys);
        setSelectedRowKeys([]);
      },
    });
  };

  // 打开版本历史
  const handleViewVersionHistory = (record: GlobalPrompt) => {
    setSelectedPromptForVersion(record);
    setVersionHistoryOpen(true);
  };

  // 版本回滚成功后刷新列表
  const handleVersionRollbackSuccess = () => {
    refetch();
  };

  // 表格列定义
  const columns: ProColumns<GlobalPrompt>[] = useMemo(
    () => [
      {
        title: 'Prompt名称',
        dataIndex: 'name',
        width: 200,
        ellipsis: true,
      },
      {
        title: 'Prompt内容',
        dataIndex: 'content',
        ellipsis: true,
        width: 300,
      },
      {
        title: '适用场景',
        dataIndex: 'applicable_scenarios',
        width: 200,
        ellipsis: true,
      },
      {
        title: '状态',
        dataIndex: 'enabled',
        width: 100,
        render: (_, record) => (
          <Tag color={record.enabled ? 'success' : 'default'}>
            {record.enabled ? '启用' : '禁用'}
          </Tag>
        ),
      },
      {
        title: '版本',
        dataIndex: 'version',
        width: 80,
      },
      {
        title: '排序',
        dataIndex: 'sort',
        width: 80,
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        width: 180,
        valueType: 'dateTime',
      },
      {
        title: '操作',
        width: 240,
        fixed: 'right',
        render: (_, record) => (
          <Space>
            <Permission code="service:quality-prompt:global:update">
              <Button type="link" onClick={() => handleEdit(record)}>
                编辑
              </Button>
            </Permission>
            <Permission code="service:quality-prompt:global:view">
              <Button
                type="link"
                icon={<HistoryOutlined />}
                onClick={() => handleViewVersionHistory(record)}
              >
                版本
              </Button>
            </Permission>
            <Permission code="service:quality-prompt:global:update">
              <Switch
                checked={record.enabled === 1}
                checkedChildren="启用"
                unCheckedChildren="禁用"
                onChange={(checked) => handleToggleEnabled(record, checked)}
              />
            </Permission>
            <Permission code="service:quality-prompt:global:delete">
              <Button type="link" danger onClick={() => handleDelete(record)}>
                删除
              </Button>
            </Permission>
          </Space>
        ),
      },
    ],
    [],
  );

  return (
    <Card
      title="全局Prompt管理"
      extra={
        <Space>
          <Input.Search
            placeholder="搜索Prompt名称或内容"
            allowClear
            style={{ width: 250 }}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            title="快捷键: Ctrl+F"
          />
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 120 }}
            value={enabledFilter}
            onChange={setEnabledFilter}
            options={[
              { label: '全部', value: undefined },
              { label: '启用', value: 1 },
              { label: '禁用', value: 0 },
            ]}
          />
          <Permission code="service:quality-prompt:global:create">
            <Button type="primary" onClick={handleCreate} title="快捷键: Ctrl+N">
              新建Prompt
            </Button>
          </Permission>
        </Space>
      }
    >
      {/* 批量操作工具栏 */}
      {selectedRowKeys.length > 0 && (
        <div style={{ marginBottom: 16, padding: '8px 16px', background: '#e6f7ff', borderRadius: 4 }}>
          <Space>
            <span>已选择 {selectedRowKeys.length} 项</span>
            <Permission code="service:quality-prompt:global:update">
              <Button size="small" onClick={handleBatchEnable}>
                批量启用
              </Button>
            </Permission>
            <Permission code="service:quality-prompt:global:update">
              <Button size="small" onClick={handleBatchDisable}>
                批量禁用
              </Button>
            </Permission>
            <Button size="small" onClick={() => setSelectedRowKeys([])}>
              取消选择
            </Button>
          </Space>
        </div>
      )}

      <GlobalLoading loading={isLoading}>
        <BaseTable<GlobalPrompt>
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={isLoading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as string[]),
          }}
          pagination={{
            total,
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1400 }}
        />
      </GlobalLoading>

      {/* 新建/编辑对话框 */}
      <BaseModal
        open={open}
        title={editing ? '编辑全局Prompt' : '新建全局Prompt'}
        confirmLoading={isCreating || isUpdating}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={handleSave}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            enabled: 1,
            sort: 0,
            platform_id: '1',
          }}
        >
          <Form.Item
            label="Prompt名称"
            name="name"
            rules={[
              { required: true, message: '请输入Prompt名称' },
              { max: 100, message: 'Prompt名称不能超过100个字符' },
            ]}
          >
            <Input placeholder="请输入Prompt名称" />
          </Form.Item>

          <Form.Item
            label="Prompt内容"
            name="content"
            rules={[
              { required: true, message: '请输入Prompt内容' },
              { max: 5000, message: 'Prompt内容不能超过5000个字符' },
            ]}
          >
            <Input.TextArea
              rows={8}
              placeholder="请输入Prompt内容，支持换行和列表格式"
              showCount
              maxLength={5000}
            />
          </Form.Item>

          <Form.Item
            label="适用场景"
            name="applicable_scenarios"
            rules={[
              { required: true, message: '请输入适用场景' },
              { max: 500, message: '适用场景不能超过500个字符' },
            ]}
          >
            <Input.TextArea
              rows={3}
              placeholder="请描述该Prompt的适用场景，例如：售前咨询、售后服务、投诉处理等"
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Space style={{ display: 'flex' }} size={12}>
            <Form.Item label="状态" name="enabled" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>

            <Form.Item
              label="排序"
              name="sort"
              tooltip="数值越小越靠前"
              rules={[{ type: 'number', min: 0, message: '排序值不能小于0' }]}
            >
              <InputNumber min={0} style={{ width: 120 }} />
            </Form.Item>

            <Form.Item label="平台ID" name="platform_id" hidden>
              <Input />
            </Form.Item>
          </Space>
        </Form>

        {/* 自动保存提示 */}
        <div style={{ marginTop: 16, color: '#999', fontSize: 12 }}>
          提示: 表单内容每30秒自动保存草稿,避免数据丢失
        </div>
      </BaseModal>

      {/* 版本历史对话框 */}
      {selectedPromptForVersion && (
        <VersionHistory
          promptId={selectedPromptForVersion.id}
          promptType="global"
          currentVersion={selectedPromptForVersion.version}
          open={versionHistoryOpen}
          onClose={() => {
            setVersionHistoryOpen(false);
            setSelectedPromptForVersion(null);
          }}
          onRollbackSuccess={handleVersionRollbackSuccess}
        />
      )}
    </Card>
  );
}
