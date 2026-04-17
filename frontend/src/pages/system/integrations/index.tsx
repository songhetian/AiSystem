import { useMemo, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProColumns } from "@ant-design/pro-components";
import {
  ApiOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Divider,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { systemApi, type IntegrationRecord } from "@/api/system";
import { BaseModal } from "@/components/common/BaseModal";
import { ActionGroup } from "@/components/common/ActionGroup";
import { BaseTable } from "@/components/table/BaseTable";
import { useDebounce } from "@/hooks/useDebounce";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { GlobalLoading } from "@/components/common/GlobalLoading";

const { Text } = Typography;

interface IntegrationFormValues {
  source_name: string;
  platform_id: string;
  api_endpoint: string;
  method: string;
  status: number;
  mapping_json: {
    customer_nickname?: string;
    session_no?: string;
    content?: string;
  };
}

export default function DataIntegrationPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IntegrationRecord | null>(null);
  const [form] = Form.useForm<IntegrationFormValues>();
  const [filterForm] = Form.useForm();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<any>(null);

  // 表单草稿保存
  const { clearDraft } = useFormDraft(form, "system-integration-form", 30000);

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+n": () => {
      setEditing(null);
      form.resetFields();
      form.setFieldsValue({
        method: "GET",
        status: 1,
        mapping_json: {},
      });
      setOpen(true);
    },
    "Ctrl+f": () => searchInputRef.current?.focus(),
    "Ctrl+r": () => {
      refresh();
      message.success("已刷新");
    },
    Escape: () => {
      setOpen(false);
      setEditing(null);
    },
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ["system-platforms"],
    queryFn: systemApi.listPlatforms,
  });
  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["system-integrations"],
    queryFn: systemApi.listIntegrations,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const keyword = Form.useWatch("name", filterForm) as string | undefined;

  // 搜索防抖
  const debouncedKeyword = useDebounce(keyword || "", 500);

  const filteredIntegrations = useMemo(() => {
    if (!debouncedKeyword) {
      return integrations;
    }
    return integrations.filter((item) =>
      item.source_name.toLowerCase().includes(debouncedKeyword.toLowerCase()),
    );
  }, [integrations, debouncedKeyword]);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["system-integrations"] });

  const saveMutation = useMutation({
    mutationFn: async (values: IntegrationFormValues) => {
      const payload = {
        ...values,
        mapping_json: Object.fromEntries(
          Object.entries(values.mapping_json || {}).filter(([, value]) =>
            Boolean(value),
          ),
        ),
      };

      if (editing) {
        return systemApi.updateIntegration(editing.id, payload);
      }
      return systemApi.createIntegration(payload);
    },
    onSuccess: async () => {
      message.success(editing ? "集成已更新" : "集成已创建");
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

  const deleteMutation = useMutation({
    mutationFn: systemApi.deleteIntegration,
    onSuccess: async () => {
      message.success("集成已删除");
      await refresh();
    },
    onError: (error: any) => {
      message.error(error?.message || "删除失败");
    },
  });

  const columns: ProColumns<IntegrationRecord>[] = [
    {
      title: "来源名称",
      dataIndex: "source_name",
      render: (text) => (
        <Text className="font-black text-slate-900">
          <ApiOutlined className="mr-2" />
          {text}
        </Text>
      ),
    },
    {
      title: "接口地址",
      dataIndex: "api_endpoint",
      render: (text) => (
        <Text className="text-xs text-slate-500" copyable>
          {text}
        </Text>
      ),
    },
    {
      title: "映射规则",
      dataIndex: "mapping_json",
      render: (_, record) => {
        const mapping = record.mapping_json as Record<string, string> | null;
        return (
          <Space size={4} wrap>
            {Object.entries(mapping || {}).map(([key, value]) => (
              <Tag
                key={key}
                className="border-blue-200 bg-blue-50 font-bold text-blue-600"
              >
                {key} → {value}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      render: (status) => (
        <Tag
          color={status === 1 ? "success" : "default"}
          className="border-2 font-black"
        >
          {status === 1 ? "生效中" : "已停用"}
        </Tag>
      ),
    },
    {
      title: "操作",
      valueType: "option",
      width: 160,
      render: (_, record) => (
        <ActionGroup
          onEdit={() => {
            setEditing(record);
            form.setFieldsValue(record as IntegrationFormValues);
            setOpen(true);
          }}
          onDelete={() => deleteMutation.mutate(record.id)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4 p-4">
      <Card bordered={false} className="shadow-sm">
        <Form
          form={filterForm}
          layout="inline"
          className="flex flex-wrap items-center gap-4"
        >
          <Form.Item name="name" className="mb-0 min-w-[200px] flex-grow">
            <Input
              ref={searchInputRef}
              prefix={<SearchOutlined />}
              placeholder="搜索数据源名称 (Ctrl+F)"
              className="h-[44px]"
              allowClear
            />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space size={8}>
              <Button
                icon={<ReloadOutlined />}
                className="h-[44px] border-slate-500 font-bold"
                onClick={() => filterForm.resetFields()}
              >
                重置
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditing(null);
                  form.resetFields();
                  form.setFieldsValue({
                    method: "GET",
                    status: 1,
                    mapping_json: {},
                  });
                  setOpen(true);
                }}
                className="h-[44px] font-bold"
                title="快捷键: Ctrl+N"
              >
                新增集成
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card bordered={false} className="shadow-sm">
        <GlobalLoading loading={isLoading}>
          <BaseTable<IntegrationRecord>
            columns={columns}
            dataSource={filteredIntegrations}
            rowKey="id"
            loading={isLoading}
          />
        </GlobalLoading>
      </Card>

      <BaseModal
        open={open}
        title={
          <Text className="text-lg font-black">
            <LinkOutlined className="mr-2" />
            {editing ? "编辑外部 API 集成" : "配置外部 API 数据映射"}
          </Text>
        }
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ method: "GET", status: 1, mapping_json: {} }}
          onFinish={(values) => saveMutation.mutate(values)}
        >
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="来源名称"
              name="source_name"
              rules={[{ required: true, message: "请输入来源名称" }]}
            >
              <Input
                placeholder="输入外部平台名称"
                className="font-bold text-slate-900"
              />
            </Form.Item>
            <Form.Item
              label="所属平台"
              name="platform_id"
              rules={[{ required: true, message: "请选择平台" }]}
            >
              <Select
                options={platforms.map((item) => ({
                  label: item.name,
                  value: item.id,
                }))}
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="请求方法" name="method">
              <Select
                options={[
                  { label: "GET", value: "GET" },
                  { label: "POST", value: "POST" },
                ]}
              />
            </Form.Item>
            <Form.Item label="状态" name="status">
              <Select
                options={[
                  { label: "启用", value: 1 },
                  { label: "停用", value: 0 },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item
            label="API Endpoint"
            name="api_endpoint"
            rules={[{ required: true, message: "请输入 API Endpoint" }]}
          >
            <Input placeholder="https://api.external.com/v1/sessions" />
          </Form.Item>

          <Divider orientation="left">
            <Text className="text-sm font-black text-slate-600">
              字段映射（内部 → 外部）
            </Text>
          </Divider>

          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-4">
              <Input
                value="customer_nickname"
                disabled
                className="w-40 bg-white font-bold"
              />
              <Text className="font-black">→</Text>
              <Form.Item
                name={["mapping_json", "customer_nickname"]}
                className="mb-0 flex-1"
              >
                <Input placeholder="外部 JSON 字段名（如：user_nick）" />
              </Form.Item>
            </div>
            <div className="flex items-center gap-4">
              <Input
                value="session_no"
                disabled
                className="w-40 bg-white font-bold"
              />
              <Text className="font-black">→</Text>
              <Form.Item
                name={["mapping_json", "session_no"]}
                className="mb-0 flex-1"
              >
                <Input placeholder="外部 JSON 字段名（如：tid）" />
              </Form.Item>
            </div>
            <div className="flex items-center gap-4">
              <Input
                value="content"
                disabled
                className="w-40 bg-white font-bold"
              />
              <Text className="font-black">→</Text>
              <Form.Item
                name={["mapping_json", "content"]}
                className="mb-0 flex-1"
              >
                <Input placeholder="外部 JSON 字段名（如：msg_content）" />
              </Form.Item>
            </div>
          </div>
        </Form>
      </BaseModal>
    </div>
  );
}
