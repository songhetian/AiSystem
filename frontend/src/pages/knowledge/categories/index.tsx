import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Form, Input, InputNumber, Select, Space, Switch, Tag, message } from 'antd';
import { knowledgeApi, type KnowledgeCategory } from '@/api/knowledge';
import { BaseModal } from '@/components/common/BaseModal';
import { Permission } from '@/components/permission/Permission';
import { BaseTable } from '@/components/table/BaseTable';

type KnowledgeCategoryRow = KnowledgeCategory & { path_name: string };

const flattenCategories = (categories: KnowledgeCategory[], prefix = ''): KnowledgeCategoryRow[] => {
  const rows: KnowledgeCategoryRow[] = [];

  for (const category of categories) {
    const pathName = prefix ? `${prefix} / ${category.category_name}` : category.category_name;
    rows.push({ ...category, path_name: pathName });

    if (category.children?.length) {
      rows.push(...flattenCategories(category.children, pathName));
    }
  }

  return rows;
};

export default function KnowledgeCategoriesPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<KnowledgeCategory | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: categories = [], isLoading } = useQuery<KnowledgeCategory[]>({
    queryKey: ['knowledge-categories', keyword],
    queryFn: () => knowledgeApi.listCategories({ keyword: keyword || undefined })
  });

  const rows = useMemo(() => flattenCategories(categories), [categories]);
  const parentOptions = useMemo(
    () =>
      rows.map((item) => ({
        label: item.path_name,
        value: item.id
      })),
    [rows]
  );

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['knowledge-categories'] });
    await queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      if (editing) {
        return knowledgeApi.updateCategory(editing.id, values);
      }

      return knowledgeApi.createCategory(values);
    },
    onSuccess: async () => {
      message.success(editing ? 'Knowledge category updated' : 'Knowledge category created');
      setOpen(false);
      setEditing(null);
      form.resetFields();
      await refresh();
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      if (enabled) {
        return knowledgeApi.enableCategory(id);
      }

      return knowledgeApi.disableCategory(id);
    },
    onSuccess: async () => {
      message.success('Knowledge category status updated');
      await refresh();
    }
  });

  const columns: ProColumns<KnowledgeCategoryRow>[] = useMemo(
    () => [
      { title: 'Category Name', dataIndex: 'path_name' },
      { title: 'Category Code', dataIndex: 'category_code', width: 180 },
      { title: 'Level', dataIndex: 'level', width: 80 },
      { title: 'Sort', dataIndex: 'sort', width: 80 },
      {
        title: 'Status',
        width: 120,
        render: (_, record) => <Tag color={record.enabled ? 'success' : 'default'}>{record.enabled ? 'enabled' : 'disabled'}</Tag>
      },
      { title: 'Description', dataIndex: 'description', render: (_, record) => record.description || '-' },
      {
        title: 'Actions',
        width: 180,
        render: (_, record) => (
          <Space size="small">
            <Permission code="knowledge:category:update">
              <Button
                type="link"
                onClick={() => {
                  setEditing(record);
                  setOpen(true);
                  form.setFieldsValue({
                    ...record,
                    enabled: Boolean(record.enabled)
                  });
                }}
              >
                Edit
              </Button>
            </Permission>
            <Permission code="knowledge:category:update">
              <Switch
                size="small"
                checked={Boolean(record.enabled)}
                loading={toggleMutation.isPending}
                onChange={(checked) => toggleMutation.mutate({ id: record.id, enabled: checked })}
              />
            </Permission>
          </Space>
        )
      }
    ],
    [form, toggleMutation]
  );

  return (
    <>
      <Card
        title="Knowledge Categories"
        extra={
          <Space wrap>
            <Input.Search allowClear placeholder="Search category name or code" style={{ width: 280 }} onChange={(e) => setKeyword(e.target.value)} />
            <Permission code="knowledge:category:create">
              <Button
                type="primary"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                  form.resetFields();
                  form.setFieldsValue({ enabled: true, sort: 0 });
                }}
              >
                New Category
              </Button>
            </Permission>
          </Space>
        }
      >
        <BaseTable<KnowledgeCategoryRow> rowKey="id" columns={columns} dataSource={rows} loading={isLoading} />
      </Card>

      <BaseModal
        open={open}
        title={editing ? 'Edit Knowledge Category' : 'New Knowledge Category'}
        confirmLoading={saveMutation.isPending}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => {
          form.validateFields().then((values) =>
            saveMutation.mutate({
              ...values,
              enabled: values.enabled ? 1 : 0
            })
          );
        }}
      >
        <Form form={form} layout="vertical" initialValues={{ enabled: true, sort: 0 }}>
          <Form.Item label="Category Name" name="category_name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Category Code" name="category_code" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Parent Category" name="parent_id">
            <Select
              allowClear
              options={parentOptions.filter((item) => item.value !== editing?.id)}
              placeholder="Select parent category"
            />
          </Form.Item>
          <Form.Item label="Sort" name="sort">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Enabled" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </BaseModal>
    </>
  );
}
