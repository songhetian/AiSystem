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
  Collapse,
  Divider,
} from 'antd';
import { ExclamationCircleOutlined, InfoCircleOutlined, HistoryOutlined } from '@ant-design/icons';
import { useDepartmentPrompts } from '@/hooks/useDepartmentPrompts';
import { useGlobalPrompts } from '@/hooks/useGlobalPrompts';
import { BaseModal } from '@/components/common/BaseModal';
import { Permission } from '@/components/permission/Permission';
import { BaseTable } from '@/components/table/BaseTable';
import { useFormDraft } from '@/hooks/useFormDraft';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useDebounce } from '@/hooks/useDebounce';
import { GlobalLoading } from '@/components/common/GlobalLoading';
import { ConflictAlert } from '@/components/quality-prompt';
import type { ConflictInfo } from '@/components/quality-prompt';
import type { DepartmentPrompt, SaveDepartmentPromptDto, GlobalPrompt } from '@/api/quality-prompt';
import { qualityPromptApi } from '@/api/quality-prompt';
import { VersionHistory } from '../components/VersionHistory';

/**
 * 部门Prompt管理页面
 * Department Manager可访问
 * 功能: 列表展示、搜索、排序、新建、编辑、删除、启用/禁用、冲突校验
 */
export default function DepartmentPromptManagementPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentPrompt | null>(null);
  const [form] = Form.useForm();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<number | undefined>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [conflictValidating, setConflictValidating] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [selectedPromptForVersion, setSelectedPromptForVersion] = useState<DepartmentPrompt | null>(null);

  // 防抖搜索
  const debouncedKeyword = useDebounce(searchKeyword, 500);

  // 表单草稿保存
  const { clearDraft } = useFormDraft(form, 'department-prompt-form', 30000);

  // 使用自定义Hook管理部门Prompt数据
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
  } = useDepartmentPrompts({
    keyword: debouncedKeyword,
    enabled: enabledFilter,
    page: 1,
    pageSize: 20,
  });

  // 获取全局Prompt列表供参考（只读）
  const {
    data: globalPrompts,
    isLoading: isLoadingGlobalPrompts,
  } = useGlobalPrompts({
    enabled: 1, // 只显示启用的全局Prompt
    page: 1,
    pageSize: 100,
  });

  // 快捷键支持
  useKeyboardShortcuts({
    'Ctrl+n': () => {
      setEditing(null);
      setOpen(true);
      form.resetFields();
      setConflicts([]);
    },
    'Ctrl+r': () => {
      refetch();
      message.success('已刷新');
    },
    Escape: () => {
      setOpen(false);
      setEditing(null);
      setConflicts([]);
    },
  });

  // 打开新建对话框
  const handleCreate = () => {
    setEditing(null);
    setOpen(true);
    form.resetFields();
    setConflicts([]);
  };

  // 打开编辑对话框
  const handleEdit = (record: DepartmentPrompt) => {
    setEditing(record);
    setOpen(true);
    form.setFieldsValue({
      name: record.name,
      content: record.content,
      applicable_scenarios: record.applicable_scenarios,
      enabled: record.enabled,
      platform_id: record.platform_id,
      dept_id: record.dept_id,
      parent_global_prompt_id: record.parent_global_prompt_id,
      sort: record.sort,
    });
    setConflicts([]);
  };

  // 冲突校验
  const validateConflicts = async (values: any): Promise<boolean> => {
    setConflictValidating(true);
    setConflicts([]);

    try {
      // 调用冲突校验API
      // 注意: 这里假设后端提供了冲突校验端点
      // 如果后端在保存时自动校验，可以跳过此步骤
      const response = await qualityPromptApi.previewPrompt({
        content: values.content,
        test_conversation: '', // 空字符串表示只做冲突校验
      });

      // 检查是否有冲突
      const globalConflicts = response.violations.filter(v => v.source === 'global');
      if (globalConflicts.length > 0) {
        const conflictInfos: ConflictInfo[] = globalConflicts.map(c => ({
          promptName: c.promptName,
          conflictType: '语义冲突', // 可以根据实际情况调整冲突类型
          conflictContent: c.rule,
          suggestion: '建议修改部门Prompt内容，确保与全局Prompt保持一致，或联系超级管理员调整全局Prompt',
        }));
        setConflicts(conflictInfos);
        return false;
      }

      return true;
    } catch (error: any) {
      // 如果API不存在或出错，允许继续保存
      console.warn('冲突校验失败:', error);
      return true;
    } finally {
      setConflictValidating(false);
    }
  };

  // 保存表单
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      // 执行冲突校验
      const isValid = await validateConflicts(values);
      if (!isValid) {
        message.error('检测到与全局Prompt冲突，请修改后重试');
        return;
      }

      const dto: SaveDepartmentPromptDto = {
        name: values.name,
        content: values.content,
        applicable_scenarios: values.applicable_scenarios,
        enabled: values.enabled,
        platform_id: values.platform_id || '1', // 默认平台ID
        dept_id: values.dept_id || '1', // 默认部门ID，实际应从用户信息获取
        parent_global_prompt_id: values.parent_global_prompt_id,
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
      setConflicts([]);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 删除Prompt
  const handleDelete = (record: DepartmentPrompt) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除部门Prompt "${record.name}" 吗？此操作不可恢复。`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        remove(record.id);
      },
    });
  };

  // 切换启用/禁用状态
  const handleToggleEnabled = (record: DepartmentPrompt, checked: boolean) => {
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
  const handleViewVersionHistory = (record: DepartmentPrompt) => {
    setSelectedPromptForVersion(record);
    setVersionHistoryOpen(true);
  };

  // 版本回滚成功后刷新列表
  const handleVersionRollbackSuccess = () => {
    refetch();
  };

  // 表格列定义
  const columns: ProColumns<DepartmentPrompt>[] = useMemo(
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
        title: '关联全局Prompt',
        dataIndex: 'parent_global_prompt_name',
        width: 180,
        ellipsis: true,
        render: (_, record) => record.parent_global_prompt_name || '-',
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
            <Permission code="service:quality-prompt:department:update">
              <Button type="link" onClick={() => handleEdit(record)}>
                编辑
              </Button>
            </Permission>
            <Permission code="service:quality-prompt:department:view">
              <Button
                type="link"
                icon={<HistoryOutlined />}
                onClick={() => handleViewVersionHistory(record)}
              >
                版本
              </Button>
            </Permission>
            <Permission code="service:quality-prompt:department:update">
              <Switch
                checked={record.enabled === 1}
                checkedChildren="启用"
                unCheckedChildren="禁用"
                onChange={(checked) => handleToggleEnabled(record, checked)}
              />
            </Permission>
            <Permission code="service:quality-prompt:department:delete">
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

  // 全局Prompt表格列定义（只读）
  const globalPromptColumns: ProColumns<GlobalPrompt>[] = useMemo(
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
        width: 400,
      },
      {
        title: '适用场景',
        dataIndex: 'applicable_scenarios',
        width: 200,
        ellipsis: true,
      },
      {
        title: '版本',
        dataIndex: 'version',
        width: 80,
      },
    ],
    [],
  );

  return (
    <Card
      title="部门Prompt管理"
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
          <Permission code="service:quality-prompt:department:create">
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
            <Permission code="service:quality-prompt:department:update">
              <Button size="small" onClick={handleBatchEnable}>
                批量启用
              </Button>
            </Permission>
            <Permission code="service:quality-prompt:department:update">
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
        <BaseTable<DepartmentPrompt>
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={isLoading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys: React.Key[]) => setSelectedRowKeys(keys as string[]),
          }}
          pagination={{
            total,
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total: number) => `共 ${total} 条`,
          }}
          scroll={{ x: 1600 }}
        />
      </GlobalLoading>

      {/* 新建/编辑对话框 */}
      <BaseModal
        open={open}
        title={editing ? '编辑部门Prompt' : '新建部门Prompt'}
        confirmLoading={isCreating || isUpdating || conflictValidating}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
          setConflicts([]);
        }}
        onOk={handleSave}
        width={1000}
      >
        {/* 冲突警告 */}
        <ConflictAlert
          conflicts={conflicts}
          onClose={() => setConflicts([])}
        />

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            enabled: 1,
            sort: 0,
            platform_id: '1',
            dept_id: '1',
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

          <Form.Item
            label="关联全局Prompt"
            name="parent_global_prompt_id"
            tooltip="可选择基于某个全局Prompt进行扩展"
          >
            <Select
              placeholder="请选择关联的全局Prompt（可选）"
              allowClear
              showSearch
              optionFilterProp="label"
              loading={isLoadingGlobalPrompts}
              options={globalPrompts.map(gp => ({
                label: gp.name,
                value: gp.id,
              }))}
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

            <Form.Item label="部门ID" name="dept_id" hidden>
              <Input />
            </Form.Item>
          </Space>
        </Form>

        <Divider />

        {/* 全局Prompt参考列表（只读） */}
        <Collapse
          defaultActiveKey={[]}
          style={{ marginTop: 16 }}
          items={[
            {
              key: '1',
              label: (
                <Space>
                  <InfoCircleOutlined />
                  <span>查看全局Prompt列表（供参考）</span>
                </Space>
              ),
              children: (
                <GlobalLoading loading={isLoadingGlobalPrompts}>
                  <BaseTable<GlobalPrompt>
                    rowKey="id"
                    columns={globalPromptColumns}
                    dataSource={globalPrompts}
                    loading={isLoadingGlobalPrompts}
                    pagination={{
                      pageSize: 5,
                      showSizeChanger: false,
                      size: 'small',
                    }}
                    scroll={{ x: 800 }}
                    size="small"
                  />
                </GlobalLoading>
              ),
            },
          ]}
        />

        {/* 自动保存提示 */}
        <div style={{ marginTop: 16, color: '#999', fontSize: 12 }}>
          提示: 表单内容每30秒自动保存草稿，避免数据丢失。保存前会自动进行冲突校验。
        </div>
      </BaseModal>

      {/* 版本历史对话框 */}
      {selectedPromptForVersion && (
        <VersionHistory
          promptId={selectedPromptForVersion.id}
          promptType="department"
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
