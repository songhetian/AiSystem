/**
 * 质检规则页面（优化版）
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
  Tabs,
  message,
} from "antd";
import { PlusOutlined, ReloadOutlined, EditOutlined } from "@ant-design/icons";
import { PageContainer, SectionCard } from '@/components/layout';
import { ActionBar, StatusTag } from '@/components/business';
import { Table, Button, Modal } from '@/components/ui';
import { serviceApi, type ServiceQualityRule } from "@/api/service";
import { Permission } from "@/components/permission/Permission";
import { QualityRuleSortList } from "./components/QualityRuleSortList";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { formatDate } from '@/utils/format';

const { TabPane } = Tabs;

// 规则类型配置
const ruleTypeOptions = [
  { label: "响应超时", value: "response_timeout" },
  { label: "违规话术", value: "forbidden_phrase" },
  { label: "服务态度", value: "service_attitude" },
  { label: "业务熟练度", value: "business_skill" },
];

// 质检规则页面组件
export default function ServiceQualityRulesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceQualityRule | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const [form] = Form.useForm();

  // 表单草稿保存
  const { clearDraft } = useFormDraft(form, "service-quality-rule-form", 30000);

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
  const { data = [], isLoading } = useQuery<ServiceQualityRule[]>({
    queryKey: ["service-quality-rules"],
    queryFn: serviceApi.listQualityRules,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 刷新数据
  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["service-quality-rules"],
    });
  };

  // 保存规则
  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const payload = {
        ...values,
        trigger_keywords:
          typeof values.trigger_keywords === "string"
            ? values.trigger_keywords
                .split(/[,\n，]/)
                .map((item: string) => item.trim())
                .filter(Boolean)
            : [],
      };

      if (editing) {
        return serviceApi.updateQualityRule(editing.id, payload as any);
      }

      return serviceApi.createQualityRule(payload as any);
    },
    onSuccess: async () => {
      message.success(editing ? "规则已更新" : "规则已创建");
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

  // 切换规则状态
  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: number }) =>
      enabled
        ? serviceApi.enableQualityRule(id)
        : serviceApi.disableQualityRule(id),
    onSuccess: () => {
      message.success("状态已更新");
      refresh();
    },
    onError: (error: any) => {
      message.error(error?.message || "操作失败");
    },
  });

  // 打开编辑弹窗
  const handleEdit = (record: ServiceQualityRule) => {
    setEditing(record);
    setOpen(true);
    form.setFieldsValue({
      ...record,
      trigger_keywords: (record.trigger_keywords ?? []).join("，"),
    });
  };

  // 新增规则
  const handleAdd = () => {
    setEditing(null);
    setOpen(true);
    form.resetFields();
  };

  // 表格列配置
  const columns = [
    {
      title: "规则名称",
      dataIndex: "rule_name",
      key: "rule_name",
      render: (_: any, record: ServiceQualityRule) => (
        <span style={{ fontWeight: 'bold' }}>{record.rule_name}</span>
      ),
    },
    {
      title: "规则类型",
      dataIndex: "rule_type",
      key: "rule_type",
      width: 120,
      render: (_: any, record: ServiceQualityRule) => {
        const typeConfig = ruleTypeOptions.find(
          (item) => item.value === record.rule_type
        );
        return (
          <StatusTag
            status="default"
            text={typeConfig?.label ?? record.rule_type}
          />
        );
      },
    },
    {
      title: "扣分",
      dataIndex: "deduct_score",
      key: "deduct_score",
      width: 80,
      render: (_: any, record: ServiceQualityRule) => (
        <span style={{ fontWeight: 'bold', color: '#dc2626' }}>
          -{record.deduct_score}
        </span>
      ),
    },
    {
      title: "阈值",
      dataIndex: "pass_threshold",
      key: "pass_threshold",
      width: 80,
      render: (_: any, record: ServiceQualityRule) => (
        <span style={{ fontWeight: 'bold', color: '#059669' }}>
          {record.pass_threshold}
        </span>
      ),
    },
    {
      title: "关键词/超时",
      key: "trigger_info",
      render: (_: any, record: ServiceQualityRule) => {
        if (record.rule_type === "response_timeout") {
          return (
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {record.response_timeout_sec ?? 0} 秒
            </span>
          );
        }
        const keywords = record.trigger_keywords ?? [];
        return keywords.length > 0 ? (
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            {keywords.join("，")}
          </span>
        ) : (
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>-</span>
        );
      },
    },
    {
      title: "状态",
      dataIndex: "enabled",
      key: "enabled",
      width: 100,
      render: (_: any, record: ServiceQualityRule) => (
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
      render: (_: any, record: ServiceQualityRule) => (
        <Space size={4}>
          <Permission code="service:quality-rule:update">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          </Permission>
          <Permission code="service:quality-rule:update">
            <Switch
              size="small"
              checked={record.enabled === 1}
              checkedChildren="启用"
              unCheckedChildren="停用"
              onChange={(checked) =>
                toggleMutation.mutate({
                  id: record.id,
                  enabled: checked ? 1 : 0,
                })
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
      title="质检规则"
      subTitle="配置AI质检规则，自动评估客服质量"
      breadcrumb={{
        items: [
          { title: '首页', path: '/' },
          { title: 'AI质检' },
          { title: '质检规则' },
        ],
      }}
    >
      <SectionCard glass>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "list",
              label: "规则列表",
              children: (
                <>
                  <ActionBar
                    actions={[
                      {
                        key: 'add',
                        label: '新建规则',
                        icon: <PlusOutlined />,
                        type: 'primary',
                        onClick: handleAdd,
                        permission: 'service:quality-rule:create',
                      },
                      {
                        key: 'refresh',
                        label: '刷新',
                        icon: <ReloadOutlined />,
                        onClick: refresh,
                      },
                    ]}
                    extra={<span>共 {data.length} 条规则</span>}
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
                        `第 ${range[0]}-${range[1]} 条/总共 ${total} 条规则`,
                    }}
                  />
                </>
              ),
            },
            {
              key: "sort",
              label: "规则排序",
              children: (
                <Permission code="service:quality-rule:sort">
                  <QualityRuleSortList />
                </Permission>
              ),
            },
          ]}
        />
      </SectionCard>

      {/* 规则编辑弹窗 */}
      <Modal
        open={open}
        title={editing ? "编辑质检规则" : "新建质检规则"}
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
          initialValues={{
            deduct_score: 5,
            pass_threshold: 80,
            enabled: 1,
            sort: 0,
          }}
        >
          <Form.Item
            label="规则名称"
            name="rule_name"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="请输入规则名称" />
          </Form.Item>

          <Form.Item
            label="规则类型"
            name="rule_type"
            rules={[{ required: true, message: '请选择规则类型' }]}
          >
            <Select options={ruleTypeOptions} placeholder="请选择规则类型" />
          </Form.Item>

          <Form.Item label="规则描述" name="description">
            <Input.TextArea rows={3} placeholder="请输入规则描述" />
          </Form.Item>

          <Space style={{ display: "flex" }} size={12}>
            <Form.Item
              label="扣分"
              name="deduct_score"
              rules={[{ required: true, message: '请输入扣分' }]}
            >
              <InputNumber min={0} max={100} placeholder="扣分" />
            </Form.Item>
            <Form.Item
              label="达标阈值"
              name="pass_threshold"
              rules={[{ required: true, message: '请输入达标阈值' }]}
            >
              <InputNumber min={0} max={100} placeholder="达标阈值" />
            </Form.Item>
            <Form.Item label="排序" name="sort">
              <InputNumber min={0} placeholder="排序" />
            </Form.Item>
          </Space>

          <Form.Item label="触发关键词" name="trigger_keywords">
            <Input.TextArea
              rows={3}
              placeholder="多个关键词用逗号分隔，如：投诉，退款，差评"
            />
          </Form.Item>

          <Form.Item label="响应超时秒数" name="response_timeout_sec">
            <InputNumber
              min={0}
              style={{ width: "100%" }}
              placeholder="响应超时秒数"
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
