import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Form, Input, Select, Space, Tag, message } from 'antd';
import { Link, useNavigate } from 'umi';
import { knowledgeApi, type KnowledgeArticle, type KnowledgeCategory } from '@/api/knowledge';
import { BaseModal } from '@/components/common/BaseModal';
import { Permission } from '@/components/permission/Permission';
import { BaseTable } from '@/components/table/BaseTable';

const flattenCategories = (categories: KnowledgeCategory[]): Array<{ label: string; value: string }> => {
  const result: Array<{ label: string; value: string }> = [];

  const walk = (nodes: KnowledgeCategory[], prefix = '') => {
    for (const node of nodes) {
      result.push({
        label: `${prefix}${node.category_name}`,
        value: node.id
      });

      if (node.children?.length) {
        walk(node.children, `${prefix}${node.category_name} / `);
      }
    }
  };

  walk(categories);
  return result;
};

export default function KnowledgeArticlesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState<string>();
  const [sourceType, setSourceType] = useState<string>();
  const [editing, setEditing] = useState<KnowledgeArticle | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: categories = [] } = useQuery<KnowledgeCategory[]>({
    queryKey: ['knowledge-categories'],
    queryFn: () => knowledgeApi.listCategories()
  });

  const categoryOptions = useMemo(() => flattenCategories(categories), [categories]);

  const { data = [], isLoading } = useQuery<KnowledgeArticle[]>({
    queryKey: ['knowledge-articles', keyword, categoryId, sourceType],
    queryFn: () =>
      knowledgeApi.listArticles({
        keyword: keyword || undefined,
        category_id: categoryId || undefined,
        source_type: sourceType || undefined
      })
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
    await queryClient.invalidateQueries({ queryKey: ['knowledge-faq-candidates'] });
    await queryClient.invalidateQueries({ queryKey: ['knowledge-categories'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      if (editing) {
        return knowledgeApi.updateArticle(editing.id, values);
      }

      return knowledgeApi.createArticle(values);
    },
    onSuccess: async () => {
      message.success(editing ? 'Knowledge article updated' : 'Knowledge article created');
      setOpen(false);
      setEditing(null);
      form.resetFields();
      await refresh();
    }
  });

  const columns: ProColumns<KnowledgeArticle>[] = useMemo(
    () => [
      {
        title: 'Title',
        dataIndex: 'title',
        render: (_, record) => <Link to={`/knowledge/articles/${record.id}`}>{record.title}</Link>
      },
      { title: 'Category', dataIndex: 'category_name', width: 160, render: (_, record) => record.category_name || '-' },
      { title: 'Keyword', dataIndex: 'keyword', width: 220, render: (_, record) => record.keyword || '-' },
      {
        title: 'Source',
        width: 140,
        render: (_, record) => {
          const label =
            record.source_type === 'service_case'
              ? 'Case'
              : record.source_type === 'service_faq'
                ? 'FAQ'
                : record.source_type || 'Manual';
          return <Tag color={record.source_type === 'service_case' ? 'purple' : 'blue'}>{label}</Tag>;
        }
      },
      {
        title: 'Source Ref',
        width: 180,
        render: (_, record) => {
          if (!record.source_ref) {
            return '-';
          }

          if (record.source_type === 'service_case') {
            return (
              <Button type="link" onClick={() => navigate(`/service/sessions/${record.source_ref}`)}>
                View Session
              </Button>
            );
          }

          return record.source_ref;
        }
      },
      { title: 'Author', dataIndex: 'author_name', width: 140, render: (_, record) => record.author_name || '-' },
      {
        title: 'Status',
        dataIndex: 'status',
        width: 120,
        render: (_, record) => <Tag color={record.status === 'published' ? 'success' : 'default'}>{record.status}</Tag>
      },
      { title: 'Updated At', dataIndex: 'update_time', width: 180 },
      {
        title: 'Actions',
        width: 120,
        render: (_, record) => (
          <Permission code="knowledge:article:update">
            <Button
              type="link"
              onClick={() => {
                setEditing(record);
                setOpen(true);
                form.setFieldsValue(record);
              }}
            >
              Edit
            </Button>
          </Permission>
        )
      }
    ],
    [form, navigate]
  );

  return (
    <>
      <Card
        title="Knowledge Articles"
        extra={
          <Space wrap>
            <Input.Search allowClear placeholder="Search title or keyword" style={{ width: 260 }} onChange={(e) => setKeyword(e.target.value)} />
            <Select
              allowClear
              placeholder="Filter by category"
              style={{ width: 220 }}
              options={categoryOptions}
              value={categoryId}
              onChange={(value) => setCategoryId(value)}
            />
            <Select
              allowClear
              placeholder="Filter by source"
              style={{ width: 180 }}
              value={sourceType}
              onChange={(value) => setSourceType(value)}
              options={[
                { label: 'FAQ', value: 'service_faq' },
                { label: 'Case', value: 'service_case' }
              ]}
            />
            <Permission code="knowledge:article:create">
              <Button
                type="primary"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                  form.resetFields();
                }}
              >
                New Article
              </Button>
            </Permission>
          </Space>
        }
      >
        <BaseTable<KnowledgeArticle> rowKey="id" columns={columns} dataSource={data} loading={isLoading} />
      </Card>

      <BaseModal
        open={open}
        title={editing ? 'Edit Knowledge Article' : 'New Knowledge Article'}
        confirmLoading={saveMutation.isPending}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => {
          form.validateFields().then((values) => saveMutation.mutate(values));
        }}
      >
        <Form form={form} layout="vertical" initialValues={{ status: 'published' }}>
          <Form.Item label="Title" name="title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Category" name="category_id">
            <Select allowClear options={categoryOptions} />
          </Form.Item>
          <Form.Item label="Keyword" name="keyword">
            <Input />
          </Form.Item>
          <Form.Item label="Status" name="status">
            <Select options={[{ label: 'Published', value: 'published' }, { label: 'Draft', value: 'draft' }]} />
          </Form.Item>
          <Form.Item label="Content" name="content" rules={[{ required: true }]}>
            <Input.TextArea rows={8} />
          </Form.Item>
        </Form>
      </BaseModal>
    </>
  );
}
