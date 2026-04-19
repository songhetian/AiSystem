import { useState, useMemo } from 'react';
import {
  Card,
  Button,
  Space,
  Input,
  Select,
  Tag,
  Modal,
  Form,
  message,
  Tabs,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { usePromptTemplates } from '@/hooks/usePromptTemplates';
import { BaseModal } from '@/components/common/BaseModal';
import { BaseTable } from '@/components/table/BaseTable';
import { Permission } from '@/components/permission/Permission';
import { GlobalLoading } from '@/components/common/GlobalLoading';
import { useDebounce } from '@/hooks/useDebounce';
import type { PromptTemplate, SavePromptTemplateDto } from '@/api/quality-prompt';
import { TemplateSelector } from './components/TemplateSelector';
import { TemplatePreview } from './components/TemplatePreview';

/**
 * Prompt模板库页面
 * 功能: 模板列表、分类筛选、搜索、新建自定义模板、编辑、删除、预览、应用
 * 需求: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */
export default function PromptTemplatesPage() {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [industryFilter, setIndustryFilter] = useState<string | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PromptTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<PromptTemplate | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [form] = Form.useForm();

  // 防抖搜索
  const debouncedKeyword = useDebounce(searchKeyword, 500);

  // 使用自定义Hook管理模板数据
  const {
    data: templates = [],
    categories = [],
    industries = [],
    isLoading,
    create,
    update,
    remove,
    isCreating,
    isUpdating,
    refetch,
  } = usePromptTemplates({
    keyword: debouncedKeyword,
    category: categoryFilter,
    industry: industryFilter,
  });

  // 打开新建对话框
  const handleCreate = () => {
    setEditing(null);
    setFormOpen(true);
    form.resetFields();
  };

  // 打开编辑对话框
  const handleEdit = (record: PromptTemplate) => {
    // 只能编辑自定义模板
    if (record.is_builtin) {
      message.warning('内置模板不可编辑');
      return;
    }
    setEditing(record);
    setFormOpen(true);
    form.setFieldsValue({
      name: record.name,
      content: record.content,
      category: record.category,
      industry: record.industry,
      description: record.description,
    });
  };

  // 保存表单
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const dto: SavePromptTemplateDto = {
        name: values.name,
        content: values.content,
        category: values.category,
        industry: values.industry,
        description: values.description,
      };

      if (editing) {
        update({ id: editing.id, data: dto });
      } else {
        create(dto);
      }

      setFormOpen(false);
      setEditing(null);
      form.resetFields();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 删除模板
  const handleDelete = (record: PromptTemplate) => {
    // 只能删除自定义模板
    if (record.is_builtin) {
      message.warning('内置模板不可删除');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除模板 "${record.name}" 吗？此操作不可恢复。`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        remove(record.id);
      },
    });
  };

  // 预览模板
  const handlePreview = (record: PromptTemplate) => {
    setPreviewTemplate(record);
    setPreviewOpen(true);
  };

  // 应用模板（打开选择器）
  const handleApplyTemplate = () => {
    setSelectorOpen(true);
  };

  // 表格列定义
  const columns: ProColumns<PromptTemplate>[] = useMemo(
    () => [
      {
        title: '模板名称',
        dataIndex: 'name',
        width: 200,
        ellipsis: true,
      },
      {
        title: '分类',
        dataIndex: 'category',
        width: 120,
        render: (category: string) => <Tag color="blue">{category}</Tag>,
      },
      {
        title: '行业',
        dataIndex: 'industry',
        width: 120,
        render: (industry: string) => <Tag color="green">{industry}</Tag>,
      },
      {
        title: '描述',
        dataIndex: 'description',
        ellipsis: true,
        width: 300,
      },
      {
        title: '类型',
        dataIndex: 'is_builtin',
        width: 100,
        render: (isBuiltin: number) => (
          <Tag color={isBuiltin ? 'gold' : 'default'}>
            {isBuiltin ? '内置' : '自定义'}
          </Tag>
        ),
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        width: 180,
        valueType: 'dateTime',
      },
      {
        title: '操作',
        width: 200,
        fixed: 'right',
        render: (_, record) => (
          <Space>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(record)}
            >
              预览
            </Button>
            {!record.is_builtin && (
              <>
                <Permission code="service:quality-prompt:template:update">
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(record)}
                  >
                    编辑
                  </Button>
                </Permission>
                <Permission code="service:quality-prompt:template:delete">
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(record)}
                  >
                    删除
                  </Button>
                </Permission>
              </>
            )}
          </Space>
        ),
      },
    ],
    [],
  );

  // 网格视图渲染
  const renderGridView = () => {
    if (templates.length === 0) {
      return (
        <Empty
          description="暂无模板"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {templates.map((template) => (
          <Card
            key={template.id}
            hoverable
            size="small"
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold' }}>{template.name}</span>
                <Tag color={template.is_builtin ? 'gold' : 'default'}>
                  {template.is_builtin ? '内置' : '自定义'}
                </Tag>
              </div>
            }
            extra={
              <Space>
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => handlePreview(template)}
                />
                {!template.is_builtin && (
                  <>
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(template)}
                    />
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(template)}
                    />
                  </>
                )}
              </Space>
            }
          >
            <div style={{ marginBottom: 8 }}>
              <Space>
                <Tag color="blue">{template.category}</Tag>
                <Tag color="green">{template.industry}</Tag>
              </Space>
            </div>
            <div style={{ color: '#666', fontSize: 12, marginBottom: 8, minHeight: 40 }}>
              {template.description || '无描述'}
            </div>
            <div style={{ color: '#999', fontSize: 12 }}>
              创建时间: {new Date(template.created_at).toLocaleDateString()}
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Card
      title="Prompt模板库"
      extra={
        <Space>
          <Input.Search
            placeholder="搜索模板名称或内容"
            allowClear
            style={{ width: 250 }}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          <Select
            placeholder="分类筛选"
            allowClear
            style={{ width: 150 }}
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { label: '全部分类', value: undefined },
              ...categories.map((cat) => ({ label: cat, value: cat })),
            ]}
          />
          <Select
            placeholder="行业筛选"
            allowClear
            style={{ width: 150 }}
            value={industryFilter}
            onChange={setIndustryFilter}
            options={[
              { label: '全部行业', value: undefined },
              ...industries.map((ind) => ({ label: ind, value: ind })),
            ]}
          />
          <Button.Group>
            <Button
              type={viewMode === 'list' ? 'primary' : 'default'}
              icon={<UnorderedListOutlined />}
              onClick={() => setViewMode('list')}
            >
              列表
            </Button>
            <Button
              type={viewMode === 'grid' ? 'primary' : 'default'}
              icon={<AppstoreOutlined />}
              onClick={() => setViewMode('grid')}
            >
              网格
            </Button>
          </Button.Group>
          <Permission code="service:quality-prompt:template:apply">
            <Button type="primary" onClick={handleApplyTemplate}>
              应用模板
            </Button>
          </Permission>
          <Permission code="service:quality-prompt:template:create">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新建模板
            </Button>
          </Permission>
        </Space>
      }
    >
      <GlobalLoading loading={isLoading}>
        {viewMode === 'list' ? (
          <BaseTable<PromptTemplate>
            rowKey="id"
            columns={columns}
            dataSource={templates}
            loading={isLoading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            scroll={{ x: 1200 }}
          />
        ) : (
          renderGridView()
        )}
      </GlobalLoading>

      {/* 新建/编辑对话框 */}
      <BaseModal
        open={formOpen}
        title={editing ? '编辑自定义模板' : '新建自定义模板'}
        confirmLoading={isCreating || isUpdating}
        onCancel={() => {
          setFormOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={handleSave}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="模板名称"
            name="name"
            rules={[
              { required: true, message: '请输入模板名称' },
              { max: 100, message: '模板名称不能超过100个字符' },
            ]}
          >
            <Input placeholder="请输入模板名称" />
          </Form.Item>

          <Form.Item
            label="模板内容"
            name="content"
            rules={[
              { required: true, message: '请输入模板内容' },
              { max: 5000, message: '模板内容不能超过5000个字符' },
            ]}
          >
            <Input.TextArea
              rows={10}
              placeholder="请输入模板内容"
              showCount
              maxLength={5000}
            />
          </Form.Item>

          <Space style={{ width: '100%' }} size={16}>
            <Form.Item
              label="分类"
              name="category"
              rules={[{ required: true, message: '请选择分类' }]}
              style={{ flex: 1 }}
            >
              <Select
                placeholder="请选择分类"
                options={categories.map((cat) => ({ label: cat, value: cat }))}
              />
            </Form.Item>

            <Form.Item
              label="行业"
              name="industry"
              rules={[{ required: true, message: '请选择行业' }]}
              style={{ flex: 1 }}
            >
              <Select
                placeholder="请选择行业"
                options={industries.map((ind) => ({ label: ind, value: ind }))}
              />
            </Form.Item>
          </Space>

          <Form.Item label="描述" name="description">
            <Input.TextArea
              rows={3}
              placeholder="请输入模板描述（可选）"
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Form>
      </BaseModal>

      {/* 模板预览对话框 */}
      {previewTemplate && (
        <TemplatePreview
          open={previewOpen}
          template={previewTemplate}
          onClose={() => {
            setPreviewOpen(false);
            setPreviewTemplate(null);
          }}
        />
      )}

      {/* 模板选择器对话框 */}
      <TemplateSelector
        open={selectorOpen}
        templates={templates}
        onClose={() => setSelectorOpen(false)}
        onSelect={(template) => {
          message.success(`已选择模板: ${template.name}`);
          setSelectorOpen(false);
        }}
      />
    </Card>
  );
}
