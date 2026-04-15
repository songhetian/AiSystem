import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { systemApi } from "@/api/system";
import { BaseModal } from "@/components/common/BaseModal";

const { Text } = Typography;

const CRON_PRESETS = [
  { label: "每小时", value: "0 * * * *" },
  { label: "每天凌晨2点", value: "0 2 * * *" },
  { label: "每天8点", value: "0 8 * * *" },
  { label: "每周一凌晨", value: "0 2 * * 1" },
  { label: "每月1号", value: "0 2 1 * *" },
];

export function ScriptManager() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const { data: scripts = [], isLoading } = useQuery({
    queryKey: ["integration-scripts"],
    queryFn: systemApi.listIntegrationScripts,
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ["system-platforms"],
    queryFn: systemApi.listPlatforms,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["mapping-templates"],
    queryFn: systemApi.listMappingTemplates,
  });

  const saveMutation = useMutation({
    mutationFn: systemApi.saveIntegrationScript,
    onSuccess: () => {
      message.success("脚本配置已保存");
      setOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["integration-scripts"] });
    },
    onError: () => message.error("保存失败"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      systemApi.toggleIntegrationScript(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-scripts"] });
    },
  });

  const triggerMutation = useMutation({
    mutationFn: (id: string) => systemApi.triggerIntegrationScript(id),
    onSuccess: () => message.success("脚本已手动触发执行"),
    onError: () => message.error("触发失败"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => systemApi.deleteIntegrationScript(id),
    onSuccess: () => {
      message.success("脚本已删除");
      queryClient.invalidateQueries({ queryKey: ["integration-scripts"] });
    },
  });

  const columns = [
    {
      title: "脚本名称",
      dataIndex: "name",
      render: (name: string, record: any) => (
        <Space direction="vertical" size={2}>
          <Text className="font-bold text-slate-900">{name}</Text>
          <Text className="text-xs text-slate-400 font-mono">
            {record.cron_expression}
          </Text>
        </Space>
      ),
    },
    {
      title: "目标平台",
      dataIndex: "platform_id",
      width: 120,
      render: (id: string) => {
        const p = platforms.find((p: any) => p.id === id);
        return (
          <Tag color="blue" className="font-bold">
            {p?.name || id}
          </Tag>
        );
      },
    },
    {
      title: "映射模板",
      dataIndex: "template_id",
      width: 140,
      render: (id: string) => {
        const t = templates.find((t: any) => t.id === id);
        return (
          <Text className="text-slate-600 font-bold">{t?.name || "-"}</Text>
        );
      },
    },
    {
      title: "状态",
      dataIndex: "enabled",
      width: 100,
      render: (enabled: boolean, record: any) => (
        <Switch
          checked={enabled}
          size="small"
          onChange={(v) => toggleMutation.mutate({ id: record.id, enabled: v })}
        />
      ),
    },
    {
      title: "上次执行",
      dataIndex: "last_run_at",
      width: 160,
      render: (t: string, record: any) => (
        <Space direction="vertical" size={0}>
          <Text className="text-xs text-slate-500">
            {t ? new Date(t).toLocaleString() : "从未执行"}
          </Text>
          {record.last_status && (
            <Badge
              status={record.last_status === "success" ? "success" : "error"}
              text={
                <Text className="text-xs">
                  {record.last_status === "success" ? "成功" : "失败"}
                </Text>
              }
            />
          )}
        </Space>
      ),
    },
    {
      title: "操作",
      width: 140,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Tooltip title="立即执行">
            <Button
              type="text"
              icon={<PlayCircleOutlined className="text-green-600" />}
              loading={triggerMutation.isPending}
              onClick={() => triggerMutation.mutate(record.id)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(record);
                form.setFieldsValue(record);
                setOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: "确认删除脚本",
                  content: "删除后脚本将停止执行，历史日志保留。",
                  okButtonProps: { danger: true },
                  onOk: () => deleteMutation.mutate(record.id),
                });
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="flex gap-4 mb-4 items-center">
        <div className="flex-grow" />
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
          新建定时脚本
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={scripts}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
        size="small"
        className="border border-slate-200 rounded-xl overflow-hidden"
      />

      <BaseModal
        open={open}
        title={editing ? "编辑定时脚本" : "新建定时脚本"}
        onOk={() => form.validateFields().then(saveMutation.mutate)}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
        confirmLoading={saveMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="脚本名称" rules={[{ required: true }]}>
            <Input
              placeholder="例如：拼多多订单每日同步"
              className="h-[44px]"
            />
          </Form.Item>
          <Form.Item
            name="platform_id"
            label="目标平台"
            rules={[{ required: true }]}
          >
            <Select
              className="h-[44px]"
              options={platforms.map((p: any) => ({
                label: p.name,
                value: p.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="template_id"
            label="映射模板"
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
            name="cron_expression"
            label="执行频率（Cron 表达式）"
            rules={[{ required: true }]}
          >
            <Input
              placeholder="0 2 * * *"
              className="h-[44px] font-mono"
              addonBefore={
                <Select
                  placeholder="快捷选择"
                  style={{ width: 130 }}
                  onChange={(v) => form.setFieldValue("cron_expression", v)}
                  options={CRON_PRESETS}
                />
              }
            />
          </Form.Item>
          <Form.Item name="retry_count" label="失败重试次数" initialValue={3}>
            <Select
              className="h-[44px]"
              options={[1, 2, 3, 5].map((n) => ({
                label: `${n} 次`,
                value: n,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="retry_interval"
            label="重试间隔（分钟）"
            initialValue={5}
          >
            <Select
              className="h-[44px]"
              options={[1, 5, 10, 30].map((n) => ({
                label: `${n} 分钟`,
                value: n,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="enabled"
            label="启用脚本"
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
