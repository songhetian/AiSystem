import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Switch, Tag, message } from 'antd';
import { BaseModal } from '@/components/common/BaseModal';
import { Permission } from '@/components/permission/Permission';
import { BaseTable } from '@/components/table/BaseTable';
import { knowledgeApi, type KnowledgeTag, type KnowledgeTagImpact } from '@/api/knowledge';

export default function KnowledgeTagsPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [sourceType, setSourceType] = useState<string>();
  const [enabled, setEnabled] = useState<string>('all');
  const [editing, setEditing] = useState<KnowledgeTag | null>(null);
  const [mergeSource, setMergeSource] = useState<KnowledgeTag | null>(null);
  const [open, setOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [form] = Form.useForm();
  const [mergeForm] = Form.useForm();

  const { data = [], isLoading } = useQuery<KnowledgeTag[]>({
    queryKey: ['knowledge-tags', keyword, sourceType, enabled],
    queryFn: () =>
      knowledgeApi.listTags({
        keyword: keyword || undefined,
        source_type: sourceType || undefined,
        enabled: enabled === 'all' ? undefined : enabled
      })
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['knowledge-tags'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (editing) {
        return knowledgeApi.updateTag(editing.id, values as Partial<KnowledgeTag> & { tag_name: string });
      }
      return knowledgeApi.createTag(values as Partial<KnowledgeTag> & { tag_name: string });
    },
    onSuccess: async () => {
      message.success(editing ? 'Tag updated' : 'Tag created');
      setOpen(false);
      setEditing(null);
      form.resetFields();
      await refresh();
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled: nextEnabled }: { id: string; enabled: boolean }) =>
      nextEnabled ? knowledgeApi.enableTag(id) : knowledgeApi.disableTag(id),
    onSuccess: async () => {
      message.success('Tag status updated');
      await refresh();
    }
  });

  const mergeMutation = useMutation({
    mutationFn: async (values: { target_tag_id: string }) => {
      if (!mergeSource) {
        throw new Error('Missing source tag');
      }
      return knowledgeApi.mergeTag(mergeSource.id, values);
    },
    onSuccess: async () => {
      message.success('Tags merged');
      setMergeOpen(false);
      setMergeSource(null);
      mergeForm.resetFields();
      await refresh();
    }
  });

  const mergeOptions = useMemo(
    () =>
      data
        .filter((item) => item.id !== mergeSource?.id && !item.is_deleted)
        .map((item) => ({
          label: `${item.tag_name}${item.source_type ? ` (${item.source_type})` : ''}`,
          value: item.id
        })),
    [data, mergeSource?.id]
  );

  const columns: ProColumns<KnowledgeTag>[] = useMemo(
    () => [
      { title: 'Tag Name', dataIndex: 'tag_name' },
      { title: 'Tag Code', dataIndex: 'tag_code', width: 180 },
      {
        title: 'Source',
        dataIndex: 'source_type',
        width: 140,
        render: (_, record) => <Tag>{record.source_type || '-'}</Tag>
      },
      {
        title: 'Color',
        width: 100,
        render: (_, record) => (record.color ? <Tag color={record.color}>{record.color}</Tag> : '-')
      },
      { title: 'Sort', dataIndex: 'sort', width: 80 },
      {
        title: 'Status',
        width: 120,
        render: (_, record) => <Tag color={record.is_deleted ? 'default' : 'success'}>{record.is_deleted ? '停用' : '启用'}</Tag>
      },
      {
        title: 'Actions',
        width: 240,
        render: (_, record) => (
          <Space size="small">
            <Permission code="knowledge:tag:update">
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
            <Permission code="knowledge:tag:update">
              <Button
                type="link"
                disabled={record.is_deleted}
                onClick={() => {
                  setMergeSource(record);
                  setMergeOpen(true);
                  mergeForm.resetFields();
                }}
              >
                Merge
              </Button>
            </Permission>
            <Permission code="knowledge:tag:update">
              <Switch
                size="small"
                checked={!record.is_deleted}
                loading={toggleMutation.isPending}
                onChange={async (checked) => {
                  if (checked) {
                    toggleMutation.mutate({ id: record.id, enabled: true });
                    return;
                  }

                  const impact = (await knowledgeApi.getTagImpact(record.id)) as KnowledgeTagImpact;
                  Modal.confirm({
                    title: `停用标签：${record.tag_name}`,
                    content: `该标签当前命中 ${impact.session_count} 条会话、${impact.article_count} 篇知识文章。停用后不会删除已有数据，但后续确认时将不再作为启用标签出现。`,
                    okText: '确认停用',
                    cancelText: '取消',
                    onOk: async () => {
                      await toggleMutation.mutateAsync({ id: record.id, enabled: false });
                    }
                  });
                }}
              />
            </Permission>
          </Space>
        )
      }
    ],
    [data, form, mergeForm, toggleMutation.isPending]
  );

  return (
    <>
      <Card
        title="Knowledge Tags"
        extra={
          <Space wrap>
            <Input.Search allowClear placeholder="Search tag name or code" style={{ width: 260 }} onChange={(e) => setKeyword(e.target.value)} />
            <Select
              allowClear
              placeholder="Filter by source"
              style={{ width: 180 }}
              value={sourceType}
              onChange={(value) => setSourceType(value)}
              options={[
                { label: 'Service Quality', value: 'service_quality' },
                { label: 'Service Case', value: 'service_case' },
                { label: 'FAQ', value: 'service_faq' }
              ]}
            />
            <Select
              style={{ width: 140 }}
              value={enabled}
              onChange={setEnabled}
              options={[
                { label: '全部状态', value: 'all' },
                { label: '仅启用', value: '1' },
                { label: '仅停用', value: '0' }
              ]}
            />
            <Permission code="knowledge:tag:create">
              <Button
                type="primary"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                  form.resetFields();
                  form.setFieldsValue({ sort: 0 });
                }}
              >
                New Tag
              </Button>
            </Permission>
          </Space>
        }
      >
        <BaseTable<KnowledgeTag> rowKey="id" columns={columns} dataSource={data} loading={isLoading} />
      </Card>

      <BaseModal
        open={open}
        title={editing ? 'Edit Tag' : 'New Tag'}
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
        <Form form={form} layout="vertical" initialValues={{ sort: 0 }}>
          <Form.Item label="Tag Name" name="tag_name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Tag Code" name="tag_code">
            <Input />
          </Form.Item>
          <Form.Item label="Source Type" name="source_type">
            <Select
              allowClear
              options={[
                { label: 'Service Quality', value: 'service_quality' },
                { label: 'Service Case', value: 'service_case' },
                { label: 'FAQ', value: 'service_faq' }
              ]}
            />
          </Form.Item>
          <Form.Item label="Color" name="color">
            <Select
              allowClear
              options={['blue', 'green', 'gold', 'orange', 'purple', 'red', 'cyan'].map((value) => ({ label: value, value }))}
            />
          </Form.Item>
          <Form.Item label="Sort" name="sort">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </BaseModal>

      <BaseModal
        open={mergeOpen}
        title={mergeSource ? `Merge Tag: ${mergeSource.tag_name}` : 'Merge Tag'}
        confirmLoading={mergeMutation.isPending}
        onCancel={() => {
          setMergeOpen(false);
          setMergeSource(null);
          mergeForm.resetFields();
        }}
        onOk={() => {
          mergeForm.validateFields().then((values) => mergeMutation.mutate(values as { target_tag_id: string }));
        }}
      >
        <Form form={mergeForm} layout="vertical">
          <Form.Item label="Target Tag" name="target_tag_id" rules={[{ required: true, message: 'Please select a target tag' }]}>
            <Select showSearch placeholder="Select the target tag to keep" optionFilterProp="label" options={mergeOptions} />
          </Form.Item>
        </Form>
      </BaseModal>
    </>
  );
}
