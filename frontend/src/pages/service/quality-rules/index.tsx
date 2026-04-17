import { useMemo, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProColumns } from "@ant-design/pro-components";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  message,
} from "antd";
import { serviceApi, type ServiceQualityRule } from "@/api/service";
import { BaseModal } from "@/components/common/BaseModal";
import { Permission } from "@/components/permission/Permission";
import { BaseTable } from "@/components/table/BaseTable";
import { QualityRuleSortList } from "./components/QualityRuleSortList";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { GlobalLoading } from "@/components/common/GlobalLoading";

const { TabPane } = Tabs;

const ruleTypeOptions = [
  { label: "响应超时", value: "response_timeout" },
  { label: "违规话术", value: "forbidden_phrase" },
  { label: "服务态度", value: "service_attitude" },
  { label: "业务熟练度", value: "business_skill" },
];

export default function ServiceQualityRulesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceQualityRule | null>(null);
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

  const { data = [], isLoading } = useQuery<ServiceQualityRule[]>({
    queryKey: ["service-quality-rules"],
    queryFn: serviceApi.listQualityRules,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["service-quality-rules"],
    });
  };

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
        return serviceApi.updateQualityRule(editing.id, payload);
      }

      return serviceApi.createQualityRule(payload);
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

  const columns: ProColumns<ServiceQualityRule>[] = useMemo(
    () => [
      { title: "规则名称", dataIndex: "rule_name" },
      {
        title: "规则类型",
        dataIndex: "rule_type",
        render: (_, record) =>
          ruleTypeOptions.find((item) => item.value === record.rule_type)
            ?.label ?? record.rule_type,
      },
      { title: "扣分", dataIndex: "deduct_score", width: 80 },
      { title: "阈值", dataIndex: "pass_threshold", width: 80 },
      {
        title: "关键词 / 超时",
        render: (_, record) =>
          record.rule_type === "response_timeout"
            ? `${record.response_timeout_sec ?? 0} 秒`
            : (record.trigger_keywords ?? []).join("，") || "-",
      },
      {
        title: "状态",
        dataIndex: "enabled",
        width: 100,
        render: (_, record) => (
          <Tag color={record.enabled ? "success" : "default"}>
            {record.enabled ? "启用" : "停用"}
          </Tag>
        ),
      },
      {
        title: "操作",
        width: 220,
        render: (_, record) => (
          <Space>
            <Permission code="service:quality-rule:update">
              <Button
                type="link"
                onClick={() => {
                  setEditing(record);
                  setOpen(true);
                  form.setFieldsValue({
                    ...record,
                    trigger_keywords: (record.trigger_keywords ?? []).join(
                      "，",
                    ),
                  });
                }}
              >
                编辑
              </Button>
            </Permission>
            <Permission code="service:quality-rule:update">
              <Switch
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
    ],
    [form, toggleMutation],
  );

  return (
    <>
      <Tabs defaultActiveKey="list">
        <TabPane tab="规则列表" key="list">
          <Card
            title="质检规则"
            extra={
              <Permission code="service:quality-rule:create">
                <Button
                  type="primary"
                  onClick={() => {
                    setEditing(null);
                    setOpen(true);
                    form.resetFields();
                  }}
                  title="快捷键: Ctrl+N"
                >
                  新建规则
                </Button>
              </Permission>
            }
          >
            <GlobalLoading loading={isLoading}>
              <BaseTable<ServiceQualityRule>
                rowKey="id"
                columns={columns}
                dataSource={data}
                loading={isLoading}
              />
            </GlobalLoading>
          </Card>
        </TabPane>

        <TabPane tab="规则排序" key="sort">
          <Permission code="service:quality-rule:sort">
            <QualityRuleSortList />
          </Permission>
        </TabPane>
      </Tabs>

      <BaseModal
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
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="规则类型"
            name="rule_type"
            rules={[{ required: true }]}
          >
            <Select options={ruleTypeOptions} />
          </Form.Item>
          <Form.Item label="规则描述" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space style={{ display: "flex" }} size={12}>
            <Form.Item
              label="扣分"
              name="deduct_score"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} max={100} />
            </Form.Item>
            <Form.Item
              label="达标阈值"
              name="pass_threshold"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} max={100} />
            </Form.Item>
            <Form.Item label="排序" name="sort">
              <InputNumber min={0} />
            </Form.Item>
          </Space>
          <Form.Item label="触发关键词" name="trigger_keywords">
            <Input.TextArea rows={3} placeholder="多个关键词用逗号分隔" />
          </Form.Item>
          <Form.Item label="响应超时秒数" name="response_timeout_sec">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </BaseModal>
    </>
  );
}
