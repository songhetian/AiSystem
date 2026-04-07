import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Form, Input, InputNumber, Select, Space, Switch, Tag, message } from 'antd';
import { serviceApi, type ServiceSensitiveTerm } from '@/api/service';
import { BaseModal } from '@/components/common/BaseModal';
import { Permission } from '@/components/permission/Permission';
import { BaseTable } from '@/components/table/BaseTable';

const categoryOptions = [
  { label: '辱骂类', value: 'abuse' },
  { label: '推诿类', value: 'shirking' },
  { label: '承诺风险', value: 'promise_risk' },
  { label: '平台违规', value: 'platform_risk' }
];

export default function ServiceSensitiveTermsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceSensitiveTerm | null>(null);
  const [form] = Form.useForm();

  const { data = [], isLoading } = useQuery<ServiceSensitiveTerm[]>({
    queryKey: ['service-sensitive-terms'],
    queryFn: serviceApi.listSensitiveTerms
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['service-sensitive-terms'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      if (editing) {
        return serviceApi.updateSensitiveTerm(editing.id, values);
      }

      return serviceApi.createSensitiveTerm(values);
    },
    onSuccess: async () => {
      message.success(editing ? '敏感词已更新' : '敏感词已创建');
      setOpen(false);
      setEditing(null);
      form.resetFields();
      await refresh();
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ record, enabled }: { record: ServiceSensitiveTerm; enabled: boolean }) =>
      serviceApi.updateSensitiveTerm(record.id, {
        term: record.term,
        category: record.category,
        severity: record.severity,
        enabled: enabled ? 1 : 0,
        replace_text: record.replace_text,
        description: record.description,
        platform_id: record.platform_id,
        dept_id: record.dept_id,
        shop_id: record.shop_id
      }),
    onSuccess: refresh
  });

  const columns: ProColumns<ServiceSensitiveTerm>[] = useMemo(
    () => [
      { title: '敏感词', dataIndex: 'term' },
      {
        title: '分类',
        dataIndex: 'category',
        render: (_, record) => categoryOptions.find((item) => item.value === record.category)?.label ?? record.category
      },
      { title: '严重级别', dataIndex: 'severity', width: 100 },
      { title: '替代文本', dataIndex: 'replace_text', width: 160, render: (_, record) => record.replace_text || '-' },
      {
        title: '状态',
        dataIndex: 'enabled',
        width: 100,
        render: (_, record) => <Tag color={record.enabled ? 'success' : 'default'}>{record.enabled ? '启用' : '停用'}</Tag>
      },
      {
        title: '操作',
        width: 220,
        render: (_, record) => (
          <Space>
            <Permission code="service:sensitive-term:update">
              <Button
                type="link"
                onClick={() => {
                  setEditing(record);
                  setOpen(true);
                  form.setFieldsValue(record);
                }}
              >
                编辑
              </Button>
            </Permission>
            <Permission code="service:sensitive-term:update">
              <Switch
                checked={record.enabled === 1}
                checkedChildren="启用"
                unCheckedChildren="停用"
                onChange={(checked) => toggleMutation.mutate({ record, enabled: checked })}
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
        title="敏感词管理"
        extra={
          <Permission code="service:sensitive-term:create">
            <Button
              type="primary"
              onClick={() => {
                setEditing(null);
                setOpen(true);
                form.resetFields();
              }}
            >
              新建敏感词
            </Button>
          </Permission>
        }
      >
        <BaseTable<ServiceSensitiveTerm> rowKey="id" columns={columns} dataSource={data} loading={isLoading} />
      </Card>

      <BaseModal
        open={open}
        title={editing ? '编辑敏感词' : '新建敏感词'}
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
        <Form form={form} layout="vertical" initialValues={{ severity: 1, enabled: 1 }}>
          <Form.Item label="敏感词" name="term" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="分类" name="category" rules={[{ required: true }]}>
            <Select options={categoryOptions} />
          </Form.Item>
          <Form.Item label="严重级别" name="severity" rules={[{ required: true }]}>
            <InputNumber min={1} max={5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="替代文本" name="replace_text">
            <Input />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </BaseModal>
    </>
  );
}
