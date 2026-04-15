import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Form,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
  Tabs,
} from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  EditOutlined,
  SortAscendingOutlined,
} from "@ant-design/icons";
import { systemApi } from "@/api/system";
import { BaseModal } from "@/components/common/BaseModal";
import { LinkageRuleSortList, type LinkageRule } from "./LinkageRuleSortList";

const { Text } = Typography;

// 所有模块事件
const MODULE_EVENTS = [
  { label: "审批提交", value: "approval.submitted", module: "审批流程" },
  { label: "审批通过", value: "approval.approved", module: "审批流程" },
  { label: "审批驳回", value: "approval.rejected", module: "审批流程" },
  { label: "考勤异常", value: "attendance.abnormal", module: "考勤排班" },
  { label: "排班发布", value: "schedule.published", module: "考勤排班" },
  { label: "订单生成", value: "order.created", module: "电商平台" },
  { label: "订单取消", value: "order.cancelled", module: "电商平台" },
  { label: "客服差评", value: "service.bad_review", module: "客服质检" },
  { label: "质检不合格", value: "service.quality_fail", module: "客服质检" },
  { label: "敏感词命中", value: "service.sensitive_hit", module: "客服质检" },
  { label: "接口监控异常", value: "interface.anomaly", module: "接口监控" },
  {
    label: "报销审批通过",
    value: "finance.reimbursement_approved",
    module: "财务管理",
  },
  { label: "考试结果通知", value: "exam.result", module: "考试管理" },
];

const RECIPIENT_RULES = [
  { label: "申请人", value: "applicant" },
  { label: "审批人", value: "approver" },
  { label: "部门管理员", value: "dept_admin" },
  { label: "平台管理员", value: "platform_admin" },
  { label: "接口负责人", value: "interface_owner" },
  { label: "指定角色", value: "role" },
];

export function LinkageRules() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("list");

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["message-linkage-rules"],
    queryFn: systemApi.listMessageLinkageRules,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["message-templates"],
    queryFn: systemApi.listMessageTemplates,
  });

  const saveMutation = useMutation({
    mutationFn: systemApi.saveMessageLinkageRule,
    onSuccess: () => {
      message.success("联动规则已保存");
      setOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["message-linkage-rules"] });
    },
    onError: () => message.error("保存失败"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => systemApi.deleteMessageLinkageRule(id),
    onSuccess: () => {
      message.success("规则已删除");
      queryClient.invalidateQueries({ queryKey: ["message-linkage-rules"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      systemApi.toggleMessageLinkageRule(id, enabled),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["message-linkage-rules"] }),
  });

  const sortMutation = useMutation({
    mutationFn: async (rules: LinkageRule[]) => {
      // 批量更新规则排序和优先级
      // 这里可以调用后端API批量更新
      // await systemApi.updateLinkageRulesSort(rules);
      // 目前先逐个更新
      for (const rule of rules) {
        await systemApi.saveMessageLinkageRule({
          id: rule.id,
          event: rule.event,
          template_id: rule.template_id,
          recipient_rules: rule.recipient_rules,
          priority: rule.priority,
          enabled: rule.enabled,
          sort: rule.sort,
        });
      }
      return rules;
    },
    onSuccess: () => {
      message.success("规则排序已保存");
      queryClient.invalidateQueries({ queryKey: ["message-linkage-rules"] });
    },
    onError: () => {
      message.error("排序保存失败");
    },
  });

  // 准备排序数据
  const sortRules: LinkageRule[] = rules.map((rule: any) => {
    const event = MODULE_EVENTS.find((e) => e.value === rule.event);
    const template = templates.find((t: any) => t.id === rule.template_id);
    return {
      ...rule,
      event_label: event?.label,
      module: event?.module,
      template_name: template?.name,
      sort: rule.sort || 0,
    };
  });

  const columns = [
    {
      title: "触发事件",
      dataIndex: "event",
      render: (event: string) => {
        const e = MODULE_EVENTS.find((m) => m.value === event);
        return (
          <Space direction="vertical" size={2}>
            <Text className="font-bold text-slate-900">
              {e?.label || event}
            </Text>
            <Tag className="text-xs">{e?.module}</Tag>
          </Space>
        );
      },
    },
    {
      title: "通知模板",
      dataIndex: "template_id",
      render: (id: string) => {
        const t = templates.find((t: any) => t.id === id);
        return (
          <Text className="font-bold text-slate-700">{t?.name || "-"}</Text>
        );
      },
    },
    {
      title: "接收人规则",
      dataIndex: "recipient_rules",
      render: (rules: string[]) => (
        <Space wrap>
          {(rules || []).map((r) => {
            const rule = RECIPIENT_RULES.find((x) => x.value === r);
            return (
              <Tag key={r} color="blue" className="font-bold">
                {rule?.label || r}
              </Tag>
            );
          })}
        </Space>
      ),
    },
    {
      title: "优先级",
      dataIndex: "priority",
      width: 80,
      render: (p: number) => (
        <Tag color={p === 1 ? "red" : p === 2 ? "orange" : "default"}>
          {p === 1 ? "高" : p === 2 ? "中" : "低"}
        </Tag>
      ),
    },
    {
      title: "启用",
      dataIndex: "enabled",
      width: 80,
      render: (enabled: boolean, record: any) => (
        <Switch
          checked={enabled}
          size="small"
          onChange={(v) => toggleMutation.mutate({ id: record.id, enabled: v })}
        />
      ),
    },
    {
      title: "操作",
      width: 100,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setEditing(record);
              form.setFieldsValue(record);
              setOpen(true);
            }}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: "确认删除联动规则",
                okButtonProps: { danger: true },
                onOk: () => deleteMutation.mutate(record.id),
              });
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "list",
            label: (
              <Space>
                <span>规则列表</span>
              </Space>
            ),
            children: (
              <>
                <div className="flex justify-end mb-4">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    className="h-[44px] font-bold bg-slate-900 border-none"
                    onClick={() => {
                      setEditing(null);
                      form.resetFields();
                      setOpen(true);
                    }}
                  >
                    新建联动规则
                  </Button>
                </div>

                <Table
                  columns={columns}
                  dataSource={rules}
                  rowKey="id"
                  loading={isLoading}
                  pagination={{ pageSize: 10 }}
                  size="small"
                  className="border border-slate-200 rounded-xl overflow-hidden"
                />
              </>
            ),
          },
          {
            key: "sort",
            label: (
              <Space>
                <SortAscendingOutlined />
                <span>规则排序</span>
              </Space>
            ),
            children: (
              <LinkageRuleSortList
                rules={sortRules}
                onSave={(rules) => sortMutation.mutate(rules)}
                loading={sortMutation.isPending}
              />
            ),
          },
        ]}
      />

      <BaseModal
        open={open}
        title={editing ? "编辑联动规则" : "新建联动规则"}
        onOk={() => form.validateFields().then(saveMutation.mutate)}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
        confirmLoading={saveMutation.isPending}
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="event" label="触发事件" rules={[{ required: true }]}>
            <Select
              className="h-[44px]"
              showSearch
              optionFilterProp="label"
              options={MODULE_EVENTS.map((e) => ({
                label: `${e.module} - ${e.label}`,
                value: e.value,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="template_id"
            label="通知模板"
            rules={[{ required: true }]}
          >
            <Select
              className="h-[44px]"
              options={templates.map((t: any) => ({
                label: t.name,
                value: t.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="recipient_rules"
            label="接收人规则"
            rules={[{ required: true }]}
          >
            <Select
              mode="multiple"
              className="h-auto"
              options={RECIPIENT_RULES}
            />
          </Form.Item>
          <Form.Item name="priority" label="优先级" initialValue={3}>
            <Select
              className="h-[44px]"
              options={[
                { label: "高优先级", value: 1 },
                { label: "中优先级", value: 2 },
                { label: "低优先级", value: 3 },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="enabled"
            label="启用规则"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </Form>
      </BaseModal>
    </>
  );
}
