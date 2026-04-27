/**
 * 敏感词管理页面（优化版）
 * 使用新的组件库重构，提供更好的视觉效果和用户体验
 */

import React, { useMemo, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  message,
} from "antd";
import { PlusOutlined, ReloadOutlined, EditOutlined } from "@ant-design/icons";
import { PageContainer, SectionCard } from '@/components/layout';
import { ActionBar, StatusTag } from '@/components/business';
import { Table, Button, Modal } from '@/components/ui';
import {
  serviceApi,
  type SaveServiceSensitiveTermPayload,
  type ServiceSensitiveTerm,
} from "@/api/service";
import { Permission } from "@/components/permission/Permission";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { formatDate } from '@/utils/format';

// 敏感词分类配置
const categoryOptions = [
  { label: "辱骂类", value: "abuse" },
  { label: "推诿类", value: "shirking" },
  { label: "承诺风险", value: "promise_risk" },
  { label: "平台违规", value: "platform_risk" },
];

// 严重级别配置
const severityConfig = {
  1: { status: 'success' as const, text: '轻微' },
  2: { status: 'warning' as const, text: '一般' },
  3: { status: 'warning' as const, text: '中等' },
  4: { status: 'error' as const, text: '严重' },
  5: { status: 'error' as const, text: '极严重' },
};

// 敏感词管理页面组件
export default function ServiceSensitiveTermsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceSensitiveTerm | null>(null);
  const [form] = Form.useForm();

  // 表单草稿保存
  const { clearDraft } = useFormDraft(
    form,
    "service-sensitive-term-form",
    30000,
  );

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+n": () => {
      setEditing(null);
      setOpen(true);
      form.resetFields();
    },
    "Ctrl+r": () => {
      refresh();
      message.success("已刷新");
    },
    Escape: () => {
      setOpen(false);
      setEditing(null);
    },
  });

  // 数据查询
  const { data = [], isLoading } = useQuery<ServiceSensitiveTerm[]>({
    queryKey: ["service-sensitive-terms"],
    queryFn: serviceApi.listSensitiveTerms,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 刷新数据
  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["service-sensitive-terms"],
    });
  };

  // 保存敏感词
  const saveMutation = useMutation({
    mutationFn: async (values: SaveServiceSensitiveTermPayload) => {
      if (editing) {
        return serviceApi.updateSensitiveTerm(editing.id, values);
      }

      return serviceApi.createSensitiveTerm(values);
    },
    onSuccess: async () => {
      message.success(editing ? "敏感词已更新" : "敏感词已创建");
      setOpen(false);
      setEditing(null);
      form.resetFields();
      clearDraft();
      await refresh();
    },
    onError: (error: any) => {
      message.error(error?.message || "操作失败");
    },
  });

  // 切换敏感词状态
  const toggleMutation = useMutation({
    mutationFn: async ({
      record,
      enabled,
    }: {
      record: ServiceSensitiveTerm;
      enabled: boolean;
    }) =>
      serviceApi.updateSensitiveTerm(record.id, {
        term: record.term,
        category: record.category,
        severity: record.severity,
        enabled: enabled ? 1 : 0,
        replace_text: record.replace_text,
        description: record.description,
        platform_id: record.platform_id,
        dept_id: record.dept_id,
        shop_id: record.shop_id,
      }),
    onSuccess: () => {
      message.success("状态已更新");
      refresh();
    },
    onError: (error: any) => {
      message.error(error?.message || "操作失败");
    },
  });

  // 打开编辑弹窗
  const handleEdit = (record: ServiceSensitiveTerm) => {
    setEditing(record);
    setOpen(true);
    form.setFieldsValue(record);
  };

  // 新增敏感词
  const handleAdd = () => {
    setEditing(null);
    setOpen(true);
    form.resetFields();
  };

  // 表格列配置
  const columns = [
    {
      title: "敏感词",
      dataIndex: "term",
      key: "term",
      render: (_: any, record: ServiceSensitiveTerm) => (
        <span style={{ fontWeight: 'bold', color: '#dc2626' }}>
          {record.term}
        </span>
      ),
    },
    {
      title: "分类",
      dataIndex: "category",
      key: "category",
      width: 120,
      render: (_: any, record: ServiceSensitiveTerm) => {
        const categoryConfig = categoryOptions.find(
          (item) => item.value === record.category
        );
        return (
          <StatusTag
            status="default"
            text={categoryConfig?.label ?? record.category}
          />
        );
      },
    },
    {
      title: "严重级别",
      dataIndex: "severity",
      key: "severity",
      width: 100,
      render: (_: any, record: ServiceSensitiveTerm) => {
        const config = severityConfig[record.severity as keyof typeof severityConfig];
        return config ? (
          <StatusTag
            status={config.status}
            text={`${record.severity}级 ${config.text}`}
          />
        ) : (
          <span>{record.severity}</span>
        );
      },
    },
    {
      title: "替代文本",
      dataIndex: "replace_text",
      key: "replace_text",
      width: 160,
      render: (_: any, record: ServiceSensitiveTerm) => (
        <span style={{ fontSize: '12px', color: '#64748b' }}>
          {record.replace_text || '-'}
        </span>
      ),
    },
    {
      title: "状态",
      dataIndex: "enabled",
      key: "enabled",
      width: 100,
      render: (_: any, record: ServiceSensitiveTerm) => (
        <StatusTag
          status={record.enabled ? "success" : "default"}
          text={record.enabled ? "启用" : "停用"}
        />
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 200,
      render: (_: any, record: ServiceSensitiveTerm) => (
        <Space size={4}>
          <Permission code="service:sensitive-term:update">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          </Permission>
          <Permission code="service:sensitive-term:update">
            <Switch
              size="small"
              checked={record.enabled === 1}
              checkedChildren="启用"
              unCheckedChildren="停用"
              onChange={(checked) =>
                toggleMutation.mutate({ record, enabled: checked })
              }
            />
          </Permission>
        </Space>
      ),
    },
  ];

  // 页面渲染
  return (
    <PageContainer
      title="敏感词管理"
      subTitle="管理客服对话中的敏感词汇，自动检测和替换"
      breadcrumb={{
        items: [
          { title: '首页', path: '/' },
          { title: 'AI质检' },
          { title: '敏感词管理' },
        ],
      }}
    >
      <SectionCard glass>
        <ActionBar
          actions={[
            {
              key: 'add',
              label: '新建敏感词',
              icon: <PlusOutlined />,
              type: 'primary',
              onClick: handleAdd,
              permission: 'service:sensitive-term:create',
            },
            {
              key: 'refresh',
              label: '刷新',
              icon: <ReloadOutlined />,
              onClick: refresh,
            },
          ]}
          extra={<span>共 {data.length} 个敏感词</span>}
          align="space-between"
          glass
        />

        <Table
          columns={columns}
          dataSource={data}
          loading={isLoading}
          rowKey="id"
          glass
          density="compact"
          striped
          hoverable
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/总共 ${total} 个敏感词`,
          }}
        />
      </SectionCard>

      {/* 敏感词编辑弹窗 */}
      <Modal
        open={open}
        title={editing ? "编辑敏感词" : "新建敏感词"}
        confirmLoading={saveMutation.isPending}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => {
          form.validateFields().then((values) => saveMutation.mutate(values));
        }}
        glass
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ severity: 1, enabled: 1 }}
        >
          <Form.Item
            label="敏感词"
            name="term"
            rules={[{ required: true, message: '请输入敏感词' }]}
          >
            <Input placeholder="请输入敏感词" />
          </Form.Item>

          <Form.Item
            label="分类"
            name="category"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select options={categoryOptions} placeholder="请选择分类" />
          </Form.Item>

          <Form.Item
            label="严重级别"
            name="severity"
            rules={[{ required: true, message: '请选择严重级别' }]}
          >
            <Select
              placeholder="请选择严重级别"
              options={[
                { label: '1级 轻微', value: 1 },
                { label: '2级 一般', value: 2 },
                { label: '3级 中等', value: 3 },
                { label: '4级 严重', value: 4 },
                { label: '5级 极严重', value: 5 },
              ]}
            />
          </Form.Item>

          <Form.Item label="替代文本" name="replace_text">
            <Input placeholder="检测到敏感词时的替代文本" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea
              rows={3}
              placeholder="敏感词的详细描述或使用说明"
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
