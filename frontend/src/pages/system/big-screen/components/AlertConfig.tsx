import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Form,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { dashboardApi } from "@/api/system/dashboard";
import { systemApi } from "@/api/system";
import { BaseModal } from "@/components/common/BaseModal";

const { Text } = Typography;

const ALERT_METRICS = [
  {
    label: "订单退款率",
    value: "order_refund_rate",
    unit: "%",
    defaultThreshold: 10,
  },
  {
    label: "质检合格率",
    value: "quality_pass_rate",
    unit: "%",
    defaultThreshold: 80,
    reverse: true,
  },
  {
    label: "接口响应时间",
    value: "api_response_time",
    unit: "ms",
    defaultThreshold: 500,
  },
  {
    label: "接口调用成功率",
    value: "api_success_rate",
    unit: "%",
    defaultThreshold: 95,
    reverse: true,
  },
  {
    label: "敏感词命中次数",
    value: "sensitive_hit_count",
    unit: "次",
    defaultThreshold: 10,
  },
  { label: "流失率", value: "loss_rate", unit: "%", defaultThreshold: 20 },
  {
    label: "客户满意度",
    value: "satisfaction_rate",
    unit: "%",
    defaultThreshold: 80,
    reverse: true,
  },
];

const ALERT_LEVELS = [
  { label: "严重", value: "critical", color: "red" },
  { label: "警告", value: "warning", color: "orange" },
  { label: "提示", value: "info", color: "blue" },
];

export function AlertConfig() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["dashboard-alert-configs"],
    queryFn: dashboardApi.listAlertConfigs,
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ["system-platforms"],
    queryFn: systemApi.listPlatforms,
  });

  const saveMutation = useMutation({
    mutationFn: dashboardApi.saveAlertConfig,
    onSuccess: () => {
      message.success("预警配置已保存");
      setOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["dashboard-alert-configs"] });
    },
    onError: () => message.error("保存失败"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dashboardApi.deleteAlertConfig(id),
    onSuccess: () => {
      message.success("预警配置已删除");
      queryClient.invalidateQueries({ queryKey: ["dashboard-alert-configs"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      dashboardApi.toggleAlertConfig(id, enabled),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dashboard-alert-configs"] }),
  });

  const columns = [
    {
      title: "监控指标",
      dataIndex: "metric",
      render: (metric: string) => {
        const m = ALERT_METRICS.find((x) => x.value === metric);
        return (
          <Text className="font-bold text-slate-900">{m?.label || metric}</Text>
        );
      },
    },
    {
      title: "预警阈值",
      render: (_: any, record: any) => {
        const m = ALERT_METRICS.find((x) => x.value === record.metric);
        const op = m?.reverse ? "低于" : "超过";
        return (
          <Text className="font-bold">
            {op}{" "}
            <span className="text-red-600">
              {record.threshold}
              {m?.unit}
            </span>
          </Text>
        );
      },
    },
    {
      title: "预警级别",
      dataIndex: "level",
      width: 100,
      render: (level: string) => {
        const l = ALERT_LEVELS.find((x) => x.value === level);
        return (
          <Tag color={l?.color} className="font-bold">
            {l?.label}
          </Tag>
        );
      },
    },
    {
      title: "关联平台",
      dataIndex: "platform_id",
      width: 120,
      render: (id: string) => {
        if (!id) return <Text type="secondary">全平台</Text>;
        const p = platforms.find((p: any) => p.id === id);
        return (
          <Tag color="blue" className="font-bold">
            {p?.name || id}
          </Tag>
        );
      },
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
                title: "确认删除预警配置",
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
          新建预警配置
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={configs}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
        size="small"
        className="border border-slate-200 rounded-xl overflow-hidden"
      />

      <BaseModal
        open={open}
        title={editing ? "编辑预警配置" : "新建预警配置"}
        onOk={() => form.validateFields().then(saveMutation.mutate)}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
        confirmLoading={saveMutation.isPending}
        width={520}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="metric"
            label="监控指标"
            rules={[{ required: true }]}
          >
            <Select
              className="h-[44px]"
              options={ALERT_METRICS.map((m) => ({
                label: m.label,
                value: m.value,
              }))}
              onChange={(v) => {
                const m = ALERT_METRICS.find((x) => x.value === v);
                if (m) form.setFieldValue("threshold", m.defaultThreshold);
              }}
            />
          </Form.Item>
          <Form.Item
            name="threshold"
            label="预警阈值"
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item
            name="level"
            label="预警级别"
            initialValue="warning"
            rules={[{ required: true }]}
          >
            <Select
              className="h-[44px]"
              options={ALERT_LEVELS.map((l) => ({
                label: l.label,
                value: l.value,
              }))}
            />
          </Form.Item>
          <Form.Item name="platform_id" label="关联平台（不选则全平台生效）">
            <Select
              allowClear
              className="h-[44px]"
              placeholder="全平台"
              options={platforms.map((p: any) => ({
                label: p.name,
                value: p.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="enabled"
            label="启用预警"
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
