import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Descriptions, Divider, Empty, Form, Input, List, Select, Space, Tag, Typography, message } from 'antd';
import { useNavigate, useParams } from 'umi';
import { BaseModal } from '@/components/common/BaseModal';
import { knowledgeApi, type KnowledgeArticle, type KnowledgeCategory } from '@/api/knowledge';

function parseStructuredContent(content?: string) {
  const raw = content ?? '';
  const lines = raw.split(/\r?\n/);
  const sections = new Map<string, string[]>();
  let current = '正文';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (['案例概览', '对话纪要', '复盘建议'].includes(trimmed)) {
      current = trimmed;
      if (!sections.has(current)) {
        sections.set(current, []);
      }
      continue;
    }

    if (!sections.has(current)) {
      sections.set(current, []);
    }
    sections.get(current)?.push(trimmed);
  }

  return {
    overview: sections.get('案例概览') ?? [],
    transcript: sections.get('对话纪要') ?? [],
    review: sections.get('复盘建议') ?? [],
    fallback: sections.get('正文') ?? []
  };
}

function parseTranscriptLine(line: string) {
  const matched = line.match(/^\d+\.\s*\[([^\]]+)\]\s*([^:：-]*)[:：]\s*(.*)$/);
  if (!matched) {
    return null;
  }

  return {
    role: matched[1].trim(),
    speaker: matched[2].trim(),
    content: matched[3].trim()
  };
}

export default function KnowledgeArticleDetailPage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const articleId = params.id ?? '';
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateMode, setDuplicateMode] = useState<'service_case' | 'service_faq'>('service_case');
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery<KnowledgeArticle>({
    queryKey: ['knowledge-article-detail', articleId],
    queryFn: () => knowledgeApi.getArticle(articleId),
    enabled: Boolean(articleId)
  });

  const { data: categories = [] } = useQuery<KnowledgeCategory[]>({
    queryKey: ['knowledge-categories'],
    queryFn: () => knowledgeApi.listCategories(),
    enabled: duplicateOpen
  });

  const categoryOptions = useMemo(() => {
    const rows: Array<{ label: string; value: string }> = [];
    const walk = (items: KnowledgeCategory[], prefix = '') => {
      for (const item of items) {
        rows.push({ label: `${prefix}${item.category_name}`, value: item.id });
        if (item.children?.length) {
          walk(item.children, `${prefix}${item.category_name} / `);
        }
      }
    };
    walk(categories);
    return rows;
  }, [categories]);

  const duplicateMutation = useMutation({
    mutationFn: async (values: Record<string, string>) =>
      knowledgeApi.createArticle({
        title: values.title,
        content: values.content,
        category_id: values.category_id,
        category_name: values.category_name,
        status: values.status,
        source_type: duplicateMode,
        source_ref: data?.source_ref ?? data?.id,
        keyword: values.keyword,
        platform_id: data?.platform_id,
        dept_id: data?.dept_id,
        shop_id: data?.shop_id
      }),
    onSuccess: async (created) => {
      message.success(duplicateMode === 'service_faq' ? 'Copied as FAQ' : 'Copied as Case');
      setDuplicateOpen(false);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      navigate(`/knowledge/articles/${created.id}`);
    }
  });

  if (!articleId) {
    return <Empty description="Missing article ID" />;
  }

  if (!isLoading && !data) {
    return <Empty description="Article not found" />;
  }

  const sourceLabel =
    data?.source_type === 'service_case'
      ? 'Case'
      : data?.source_type === 'service_faq'
        ? 'FAQ'
        : data?.source_type || 'Manual';
  const parsed = parseStructuredContent(data?.content);
  const keywordTags = (data?.keyword ?? '')
    .split(/[,\uFF0C/]/)
    .map((item) => item.trim())
    .filter(Boolean);

  const openDuplicateModal = (mode: 'service_case' | 'service_faq') => {
    setDuplicateMode(mode);
    setDuplicateOpen(true);
    form.setFieldsValue({
      title: `${mode === 'service_faq' ? 'FAQ' : 'Case'} - ${data?.title ?? ''}`,
      category_id: data?.category_id,
      category_name: data?.category_name,
      keyword: data?.keyword,
      status: 'draft',
      content: data?.content
    });
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        loading={isLoading}
        title={data?.title ?? 'Knowledge Article'}
        extra={
          <Space>
            <Button onClick={() => navigate('/knowledge/articles')}>Back</Button>
            <Button onClick={() => openDuplicateModal('service_case')}>Copy as Case</Button>
            <Button onClick={() => openDuplicateModal('service_faq')}>Copy as FAQ</Button>
            {data?.source_type === 'service_case' && data.source_ref ? (
              <Button type="primary" onClick={() => navigate(`/service/sessions/${data.source_ref}`)}>
                View Session
              </Button>
            ) : null}
          </Space>
        }
      >
        <Descriptions column={3}>
          <Descriptions.Item label="Category">{data?.category_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Source">
            <Tag color={data?.source_type === 'service_case' ? 'purple' : 'blue'}>{sourceLabel}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={data?.status === 'published' ? 'success' : 'default'}>{data?.status || '-'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Author">{data?.author_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Keyword">{data?.keyword || '-'}</Descriptions.Item>
          <Descriptions.Item label="Updated At">{data?.update_time || '-'}</Descriptions.Item>
          <Descriptions.Item label="Source Ref" span={3}>
            {data?.source_ref || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Keyword Tags" span={3}>
            <Space wrap>
              {keywordTags.length ? keywordTags.map((tag) => <Tag key={tag}>{tag}</Tag>) : '-'}
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {data?.source_type === 'service_case' ? (
        <>
          <Card loading={isLoading} title="Case Overview">
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              {parsed.overview.length ? (
                parsed.overview.map((item) => (
                  <Typography.Paragraph key={item} style={{ marginBottom: 0 }}>
                    {item}
                  </Typography.Paragraph>
                ))
              ) : (
                <Typography.Text type="secondary">No overview</Typography.Text>
              )}
            </Space>
          </Card>

          <Card loading={isLoading} title="Transcript">
            {parsed.transcript.length ? (
              <List
                dataSource={parsed.transcript}
                renderItem={(item) => {
                  const parsedLine = parseTranscriptLine(item);
                  if (!parsedLine) {
                    return (
                      <List.Item>
                        <Typography.Text>{item}</Typography.Text>
                      </List.Item>
                    );
                  }

                  const roleColor =
                    parsedLine.role === 'agent' ? 'blue' : parsedLine.role === 'customer' ? 'gold' : 'default';

                  return (
                    <List.Item>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color={roleColor}>{parsedLine.role}</Tag>
                          <Typography.Text strong>{parsedLine.speaker || '-'}</Typography.Text>
                        </Space>
                        <Typography.Text>{parsedLine.content}</Typography.Text>
                      </Space>
                    </List.Item>
                  );
                }}
              />
            ) : (
              <Typography.Text type="secondary">No transcript</Typography.Text>
            )}
          </Card>

          <Card loading={isLoading} title="Review Suggestions">
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {parsed.review.length ? (
                parsed.review.map((item) => (
                  <Typography.Paragraph key={item} style={{ marginBottom: 0 }}>
                    {item}
                  </Typography.Paragraph>
                ))
              ) : (
                <Typography.Text type="secondary">No review suggestions</Typography.Text>
              )}
            </Space>
          </Card>

          {parsed.fallback.length ? (
            <Card loading={isLoading} title="Raw Content">
              <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                {parsed.fallback.join('\n')}
              </Typography.Paragraph>
            </Card>
          ) : null}
        </>
      ) : (
        <Card loading={isLoading} title="Content">
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{data?.content || '-'}</Typography.Paragraph>
        </Card>
      )}

      <Divider style={{ margin: 0 }} />

      <BaseModal
        open={duplicateOpen}
        title={duplicateMode === 'service_faq' ? 'Copy as FAQ' : 'Copy as Case'}
        confirmLoading={duplicateMutation.isPending}
        width={760}
        onCancel={() => {
          setDuplicateOpen(false);
          form.resetFields();
        }}
        onOk={() => {
          form.validateFields().then((values) => duplicateMutation.mutate(values));
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Title" name="title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Category" name="category_id">
            <Select allowClear options={categoryOptions} />
          </Form.Item>
          <Form.Item label="Category Name" name="category_name">
            <Input />
          </Form.Item>
          <Form.Item label="Keyword" name="keyword">
            <Input />
          </Form.Item>
          <Form.Item label="Status" name="status">
            <Select options={[{ label: 'Draft', value: 'draft' }, { label: 'Published', value: 'published' }]} />
          </Form.Item>
          <Form.Item label="Content" name="content" rules={[{ required: true }]}>
            <Input.TextArea rows={12} />
          </Form.Item>
        </Form>
      </BaseModal>
    </Space>
  );
}
