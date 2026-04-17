import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProColumns } from "@ant-design/pro-components";
import {
  Divider,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Button,
  Card,
  message,
} from "antd";
import {
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { systemApi, type ApiKeyRecord } from "@/api/system";
import { BaseModal } from "@/components/common/BaseModal";
import { ActionGroup } from "@/components/common/ActionGroup";
import { BaseTable } from "@/components/table/BaseTable";
import { GlobalLoading } from "@/components/common/GlobalLoading";
import { useDebounce } from "@/hooks/useDebounce";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

const { Text } = Typography;

export default function ApiKeysPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiKeyRecord | null>(null);
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const queryClient = useQueryClient();
  const { clearDraft } = useFormDraft(form, "system-api-key-form");

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+n": () => {
      setEditing(null);
      form.resetFields();
      form.setFieldsValue({ status: 1 });
      setOpen(true);
    },
    "Ctrl+r": () => refresh(),
    Escape: () => setOpen(false),
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ["system-platforms"],
    queryFn: systemApi.listPlatforms,
    staleTime: 5 * 60 * 1000,
  });
  const { data: departments = [] } = useQuery({
    queryKey: ["system-departments"],
    queryFn: systemApi.listDepartments,
    staleTime: 5 * 60 * 1000,
  });
  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ["system-api-keys"],
    queryFn: systemApi.listApiKeys,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const keyword = Form.useWatch("name", filterForm) as string | undefined;
  const debouncedKeyword = useDebounce(keyword, 500);
    queryFn: systemApi.listApiKeys,
  });

  const keyword = Form.useWatch("name", filterForm) as string | undefined;

  const filteredApiKeys = useMemo(() => {
    if (!debouncedKeyword) {
      return apiKeys;
    }
    return apiKeys.filter((item) =>
      item.name.toLowerCase().includes(debouncedKeyword.toLowerCase()),
    );
  }, [apiKeys, debouncedKeyword]);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["system-api-keys"] });

  const saveMutation = useMutation({
    mutationFn: async (values: Partial<ApiKeyRecord>) => {
      if (editing) {
        return systemApi.updateApiKey(editing.id, values);
      }
      return systemApi.saveApiKey(values);
    },
    onSuccess: async () => {
      message.success(editing ? "凭据已更新" : "凭据已创建");
      setOpen(false);
      setEditing(null);
      form.resetFields();
      clearDraft();
      await refresh();
    },
    onError: () => {
      message.error(editing ? "凭据更新失败，请重试" : "凭据创建失败，请重试");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: systemApi.deleteApiKey,
    onSuccess: async () => {
      message.success("凭据已删除");
      await refresh();
    },
    onError: () => {
      message.error("凭据删除失败，请重试");
    },
  });

  const columns: ProColumns<ApiKeyRecord>[] = [
    {
      title: "凭据名称",
      dataIndex: "name",
      render: (text) => (
        <Text className="font-black text-slate-900">
          <KeyOutlined className="mr-2" />
          {text}
        </Text>
      ),
    },
    {
      title: "服务类型",
      dataIndex: "service_type",
      render: (value) => (
        <Tag className="border-slate-300 font-bold uppercase">{value}</Tag>
      ),
    },
    {
      title: "API Key",
      dataIndex: "api_key",
      render: (value) => (
        <Text className="font-mono text-slate-400">
          {String(value).slice(0, 6)}****************{String(value).slice(-4)}
        </Text>
      ),
    },
    {
      title: "分配范围",
      dataIndex: "dept_id",
      render: (deptId, record) => {
        const platform = platforms.find(
          (item) => item.id === record.platform_id,
        );
        const department = departments.find((item) => item.id === deptId);
        return (
          <Space direction="vertical" size={0}>
            <Text className="text-xs text-slate-500">
              {platform?.name || "-"}
            </Text>
            <Tag color={deptId ? "blue" : "gold"} className="font-black">
              {deptId ? `部门专享: ${department?.name || "-"}` : "平台全局共享"}
            </Tag>
          </Space>
        );
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      render: (value) => (
        <Tag
          color={value === 1 ? "success" : "default"}
          className="border-2 font-bold"
        >
          {value === 1 ? "启用" : "禁用"}
        </Tag>
      ),
    },
    {
      title: "操作",
      valueType: "option",
      render: (_, record) => (
        <ActionGroup
          onEdit={() => {
            setEditing(record);
            form.setFieldsValue(record);
            setOpen(true);
          }}
          onDelete={() => deleteMutation.mutate(record.id)}
        />
      ),
    },
  ];

  return (
    <GlobalLoading loading={isLoading}>
      <div className="space-y-4 p-4">
      <Card bordered={false} className="shadow-sm">
        <Form
          form={filterForm}
          layout="inline"
          className="flex flex-wrap items-center gap-4"
        >
          <Form.Item name="name" className="mb-0 min-w-[200px] flex-grow">
            <Input
              prefix={<SearchOutlined />}
              placeholder="搜索凭据名称"
              className="h-[44px]"
            />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space>
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
                  form.setFieldsValue({ status: 1 });
                  setOpen(true);
                }}
                className="h-[44px] font-bold"
              >
                新增凭据
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card bordered={false} className="shadow-sm">
        <BaseTable<ApiKeyRecord>
          columns={columns}
          dataSource={filteredApiKeys}
          rowKey="id"
          loading={isLoading}
        />
      </Card>

      <BaseModal
        open={open}
        title={
          <Text className="text-lg font-black">
            <SafetyCertificateOutlined className="mr-2" />
            {editing ? "编辑 API 凭据" : "配置 API 凭据"}
          </Text>
        }
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: 1 }}
          onFinish={(values) => saveMutation.mutate(values)}
        >
          <Form.Item
            label="凭据名称"
            name="name"
            rules={[{ required: true, message: "请输入凭据名称" }]}
          >
            <Input
              placeholder="如：OpenAI 官方 Key"
              className="font-bold text-slate-900"
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="服务类型"
              name="service_type"
              rules={[{ required: true, message: "请选择服务类型" }]}
            >
              <Select
                options={[
                  { label: "OpenAI", value: "openai" },
                  { label: "Claude", value: "claude" },
                  { label: "Aliyun", value: "aliyun" },
                  { label: "Taobao API", value: "taobao" },
                ]}
              />
            </Form.Item>
            <Form.Item label="状态" name="status">
              <Select
                options={[
                  { label: "启用", value: 1 },
                  { label: "禁用", value: 0 },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item
            label="API Key"
            name="api_key"
            rules={[{ required: true, message: "请输入 API Key" }]}
          >
            <Input.Password placeholder="sk-..." />
          </Form.Item>
          <Form.Item label="API Secret（可选）" name="api_secret">
            <Input.Password />
          </Form.Item>
          <Form.Item label="API Endpoint（可选）" name="endpoint">
            <Input placeholder="https://api.openai.com/v1" />
          </Form.Item>

          <Divider orientation="left">
            <Text className="text-sm font-black text-slate-600">权限分配</Text>
          </Divider>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-2 gap-4">
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
              <Form.Item
                label="分配部门（可选）"
                name="dept_id"
                tooltip="留空表示该平台下所有部门共享此 Key"
              >
                <Select
                  allowClear
                  placeholder="全局共享"
                  options={departments.map((item) => ({
                    label: item.name,
                    value: item.id,
                  }))}
                />
              </Form.Item>
            </div>
          </div>
        </Form>
      </BaseModal>
    </div>
    </GlobalLoading>
  );
}
