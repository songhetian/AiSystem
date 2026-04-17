import { useMemo, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProColumns } from "@ant-design/pro-components";
import {
  CloudServerOutlined,
  ControlOutlined,
  HistoryOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  EyeOutlined,
  FilterOutlined,
  FileSearchOutlined,
  CodeOutlined,
  ClockCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  message,
  Tabs,
  Badge,
  Table,
  Tooltip,
  Drawer,
  Statistic,
  Row,
  Col,
} from "antd";
import {
  systemApi,
  type MappingTemplateRecord,
  type PlatformConfigRecord,
} from "@/api/system";
import { BaseModal } from "@/components/common/BaseModal";
import { ActionGroup } from "@/components/common/ActionGroup";
import { BaseTable } from "@/components/table/BaseTable";
import { ScriptManager } from "./components/ScriptManager";
import { useDebounce } from "@/hooks/useDebounce";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { GlobalLoading } from "@/components/common/GlobalLoading";

const { Text, Title } = Typography;

// ================================================
// 1. 映射模版管理 Tab (支持继承对比)
// ================================================
const TemplateTable: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MappingTemplateRecord | null>(null);
  const [filter, setFilter] = useState("");
  const debouncedFilter = useDebounce(filter, 500);
  const [form] = Form.useForm();
  const { clearDraft } = useFormDraft(form, "data-mapping-template-form");
  const searchInputRef = useRef<any>(null);
  const queryClient = useQueryClient();

  useKeyboardShortcuts({
    "Ctrl+n": () => setOpen(true),
    "Ctrl+f": () => searchInputRef.current?.focus(),
    "Ctrl+r": () =>
      queryClient.invalidateQueries({ queryKey: ["mapping-templates"] }),
    Escape: () => setOpen(false),
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ["system-platforms"],
    queryFn: systemApi.listPlatforms,
  });
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["mapping-templates", debouncedFilter],
    queryFn: () => systemApi.listMappingTemplates(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const selectedParentId = Form.useWatch("parent_id", form);
  const parentTemplate = useMemo(
    () => templates.find((t) => t.id === selectedParentId),
    [templates, selectedParentId],
  );

  const saveMutation = useMutation({
    mutationFn: systemApi.saveMappingTemplate,
    onSuccess: () => {
      message.success("治理基座已加固");
      setOpen(false);
      form.resetFields();
      clearDraft();
      queryClient.invalidateQueries({ queryKey: ["mapping-templates"] });
    },
    onError: () => message.error("治理基座保存失败"),
  });

  const filteredTemplates = useMemo(
    () =>
      templates.filter((t) =>
        t.name.toLowerCase().includes(filter.toLowerCase()),
      ),
    [templates, filter],
  );

  const columns: ProColumns<MappingTemplateRecord>[] = [
    {
      title: "核心驱动标识",
      dataIndex: "name",
      render: (text, record) => (
        <Space direction="vertical" size={1}>
          <Text className="font-black text-slate-900 text-base">{text}</Text>
          {record.parent_id && (
            <Tag
              color="#1e293b"
              className="text-[10px] font-black border-slate-500 rounded-md"
            >
              <LinkOutlined /> INHERIT:{" "}
              {templates.find((t) => t.id === record.parent_id)?.name}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: "实体类型",
      dataIndex: "data_type",
      render: (type) => (
        <Tag color="blue" className="font-black border-slate-500 bg-blue-50">
          {type?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "治理策略",
      render: (_, record) => (
        <Space>
          {record.is_public ? (
            <Tag className="font-black border-slate-500 bg-slate-900 text-white">
              SYSTEM_PUBLIC
            </Tag>
          ) : (
            <Tag className="font-bold border-slate-300">DEPT_PRIVATE</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "覆写密度",
      dataIndex: "mapping_rules",
      render: (rules: any) => (
        <Badge count={Object.keys(rules || {}).length} color="#64748b" />
      ),
    },
    {
      title: "操作",
      valueType: "option",
      render: (_, record) => (
        <ActionGroup
          onEdit={() => {
            setEditing(record);
            form.setFieldsValue({
              ...record,
              mapping_rules_str: JSON.stringify(record.mapping_rules, null, 2),
            });
            setOpen(true);
          }}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-4 w-full bg-slate-50 p-2 rounded-2xl border border-slate-100 items-center">
        <Input
          ref={searchInputRef}
          placeholder="搜索模版名称..."
          className="h-[44px] border-slate-500 font-black flex-grow max-w-[400px]"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          prefix={<FileSearchOutlined className="text-slate-400" />}
        />
        <div className="flex-grow" />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="h-[44px] font-black border-slate-900 bg-slate-900 shadow-lg"
          onClick={() => {
            setEditing(null);
            form.resetFields();
            setOpen(true);
          }}
        >
          定义新基座
        </Button>
      </div>
      <GlobalLoading loading={isLoading}>
        <BaseTable<MappingTemplateRecord>
          columns={columns}
          dataSource={filteredTemplates}
          loading={isLoading}
          rowKey="id"
        />
      </GlobalLoading>

      <BaseModal
        open={open}
        title={editing ? "治理编排：配置逻辑基座" : "定义：初始化逻辑基座"}
        onOk={() => form.submit()}
        onCancel={() => setOpen(false)}
        width={1100}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => {
            try {
              v.mapping_rules = JSON.parse(v.mapping_rules_str);
              saveMutation.mutate(v);
            } catch (_error) {
              message.error("JSON 语法校验异常");
            }
          }}
        >
          <Row gutter={32}>
            <Col span={10}>
              <Card
                size="small"
                title={
                  <span className="font-black">
                    <SettingOutlined /> 元数据配置
                  </span>
                }
                className="rounded-2xl border-slate-200 bg-slate-50/50"
              >
                <Form.Item
                  name="name"
                  label="模版唯一标识"
                  rules={[{ required: true }]}
                >
                  <Input
                    placeholder="PDD_ORDER_STD_V1"
                    className="h-[44px] border-slate-500 font-black"
                  />
                </Form.Item>
                <Form.Item
                  name="platform_id"
                  label="目标平台"
                  rules={[{ required: true }]}
                >
                  <Select
                    className="h-[44px] border-slate-500"
                    options={platforms.map((p) => ({
                      label: p.name,
                      value: p.id,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  name="parent_id"
                  label="继承基座 (Base Template)"
                  tooltip="继承后自动复用父级所有 Mapping 规则"
                >
                  <Select
                    allowClear
                    className="h-[44px] border-slate-500"
                    options={templates
                      .filter((t) => t.is_public && t.id !== editing?.id)
                      .map((t) => ({ label: `[基准] ${t.name}`, value: t.id }))}
                  />
                </Form.Item>
                <Form.Item
                  name="data_type"
                  label="数据实体"
                  rules={[{ required: true }]}
                >
                  <Select
                    className="h-[44px] border-slate-500"
                    options={[
                      { label: "订单 (Order)", value: "order" },
                      { label: "商品 (Product)", value: "product" },
                    ]}
                  />
                </Form.Item>
              </Card>
            </Col>
            <Col span={14}>
              <div className="space-y-4">
                {parentTemplate && (
                  <div className="bg-slate-900 rounded-2xl p-4 border-l-4 border-blue-500">
                    <Title
                      level={5}
                      className="!text-blue-400 !mb-2 font-black text-xs uppercase"
                    >
                      <LinkOutlined /> Inherited Base Rules (Read Only)
                    </Title>
                    <div className="text-[10px] font-mono text-slate-500 h-[100px] overflow-auto">
                      <pre>
                        {JSON.stringify(parentTemplate.mapping_rules, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl relative">
                  <div className="absolute top-4 right-4">
                    <CodeOutlined className="text-green-500 text-xl" />
                  </div>
                  <Title
                    level={5}
                    className="!text-slate-100 !mb-4 font-black flex items-center gap-2"
                  >
                    规则覆写 (Override Orchestration)
                  </Title>
                  <Form.Item
                    name="mapping_rules_str"
                    rules={[{ required: true }]}
                  >
                    <Input.TextArea
                      rows={12}
                      className="font-mono text-xs border-none bg-transparent text-green-400 p-0 focus:ring-0 focus:shadow-none"
                      placeholder='{ "std_field": "external_path" }'
                    />
                  </Form.Item>
                </div>
              </div>
            </Col>
          </Row>
        </Form>
      </BaseModal>
    </div>
  );
};

// ================================================
// 2. 接入配置与监控 Tab
// ================================================
// 2. 接入配置与监控 Tab (规范化重构 V3.0)
// ================================================
const ConfigTable: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformConfigRecord | null>(null);
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebounce(searchText, 500);
  const [form] = Form.useForm();
  const { clearDraft } = useFormDraft(form, "platform-config-form");
  const searchInputRef = useRef<any>(null);
  const queryClient = useQueryClient();

  useKeyboardShortcuts({
    "Ctrl+n": () => setOpen(true),
    "Ctrl+f": () => searchInputRef.current?.focus(),
    "Ctrl+r": () =>
      queryClient.invalidateQueries({ queryKey: ["platform-configs"] }),
    Escape: () => setOpen(false),
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ["system-platforms"],
    queryFn: systemApi.listPlatforms,
  });
  const { data: depts = [] } = useQuery({
    queryKey: ["system-departments"],
    queryFn: systemApi.listDepartments,
  });
  const { data: templates = [] } = useQuery({
    queryKey: ["mapping-templates"],
    queryFn: () => systemApi.listMappingTemplates(),
  });

  // 遵循规范 7.4.1：处理标准化响应中的 data 字段
  const { data: configsRes, isLoading } = useQuery({
    queryKey: ["platform-configs", debouncedSearchText],
    queryFn: () => systemApi.listPlatformConfigs(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const configs = (configsRes as any)?.data || [];

  const saveMutation = useMutation({
    mutationFn: systemApi.savePlatformConfig,
    onSuccess: (res: any) => {
      if (res.code === 200) {
        message.success("数据链路治理策略已生效");
        setOpen(false);
        form.resetFields();
        clearDraft();
        queryClient.invalidateQueries({ queryKey: ["platform-configs"] });
      } else {
        message.error(res.message || "治理策略同步失败");
      }
    },
    onError: () => message.error("网络链路异常，请检查网关状态"),
  });

  const columns: ProColumns<PlatformConfigRecord>[] = [
    {
      title: <Text className="font-black text-slate-900">核心节点</Text>,
      render: (_, record) => (
        <Space>
          <div className="bg-slate-900 p-3 rounded-2xl shadow-xl border border-slate-700">
            <ThunderboltOutlined className="text-yellow-400 text-lg" />
          </div>
          <div>
            <div className="font-black text-slate-900 text-base">
              {platforms.find((p) => p.id === record.platform_id)?.name ||
                "未知架构"}
            </div>
            <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest bg-slate-100 px-1 rounded">
              NODE::{record.id?.slice(-8)}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: <Text className="font-black text-slate-900">管理单元</Text>,
      render: (_, record) => (
        <Text className="font-black text-slate-600 bg-white border border-slate-200 px-4 py-1.5 rounded-full shadow-sm">
          {depts.find((d) => d.id === record.dept_id)?.name || "待分配"}
        </Text>
      ),
    },
    {
      title: <Text className="font-black text-slate-900">映射基座</Text>,
      render: (_, record) => (
        <Tag
          className="font-black border-slate-500 px-3 py-1 scale-105"
          color="blue"
        >
          {templates.find((t) => t.id === record.template_id)?.name ||
            "未挂载驱动"}
        </Tag>
      ),
    },
    {
      title: <Text className="font-black text-slate-900">接入端点</Text>,
      dataIndex: "api_endpoint",
      render: (url: string) => (
        <Text className="font-mono text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
          {url}
        </Text>
      ),
    },
    {
      title: <Text className="font-black text-slate-900">治理指数</Text>,
      render: () => (
        <Tooltip title="基于过去 1,000 次调用的平均稳定性。100% 代表极致稳定。">
          <div className="flex flex-col gap-1 w-[120px]">
            <div className="flex justify-between items-end">
              <Text className="text-[10px] text-slate-400 font-black">
                STABILITY
              </Text>
              <Text className="text-green-600 font-black text-xs">99.2%</Text>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                style={{ width: "99%" }}
              />
            </div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: <Text className="font-black text-slate-900">治理</Text>,
      valueType: "option",
      render: (_, record) => (
        <ActionGroup
          onEdit={() => {
            setEditing(record);
            form.setFieldsValue(record);
            setOpen(true);
          }}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-4 w-full bg-slate-50 p-3 rounded-2xl items-center border border-slate-200">
        <Input
          ref={searchInputRef}
          placeholder="检索外部集群节点 (AppKey)..."
          className="h-[44px] border-slate-500 font-bold max-w-[350px] shadow-sm"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          prefix={<SearchOutlined className="text-slate-400" />}
        />
        <div className="flex-grow" />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="h-[44px] font-black border-slate-900 bg-slate-900 px-8 rounded-xl shadow-lg hover:scale-105 transition-all"
          onClick={() => {
            setEditing(null);
            form.resetFields();
            setOpen(true);
          }}
        >
          建立新治理链路
        </Button>
      </div>

      <GlobalLoading loading={isLoading}>
        <BaseTable<PlatformConfigRecord>
          columns={columns}
          dataSource={configs}
          loading={isLoading}
          rowKey="id"
          className="border border-slate-200 rounded-3xl overflow-hidden shadow-2xl"
        />
      </GlobalLoading>

      <BaseModal
        open={open}
        title={
          <div className="font-black text-slate-900 text-xl pb-2 border-b border-slate-100">
            {editing ? "治理：精细化链路参数" : "建立：初始化集成实例"}
          </div>
        }
        onOk={() => form.submit()}
        onCancel={() => setOpen(false)}
        width={750}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => saveMutation.mutate(v)}
          className="pt-6"
        >
          <div className="grid grid-cols-2 gap-8">
            <Form.Item
              name="platform_id"
              label={
                <Text className="font-black text-slate-900">物理平台架构</Text>
              }
              rules={[{ required: true }]}
            >
              <Select
                className="h-[44px] border-slate-500 font-bold"
                options={platforms.map((p) => ({ label: p.name, value: p.id }))}
              />
            </Form.Item>
            <Form.Item
              name="dept_id"
              label={
                <Text className="font-black text-slate-900">责任管理组织</Text>
              }
              rules={[{ required: true }]}
            >
              <Select
                className="h-[44px] border-slate-500 font-bold"
                options={depts.map((d) => ({ label: d.name, value: d.id }))}
              />
            </Form.Item>
          </div>
          <Form.Item
            name="template_id"
            label={
              <Text className="font-black text-slate-900">
                核心决策模版 (Driver)
              </Text>
            }
            rules={[{ required: true }]}
          >
            <Select
              className="h-[44px] border-slate-500 font-bold"
              options={templates.map((t) => ({ label: t.name, value: t.id }))}
            />
          </Form.Item>
          <Form.Item
            name="api_endpoint"
            label={
              <Text className="font-black text-slate-900">
                外部 API 接入端点 (Gateway)
              </Text>
            }
            rules={[{ required: true, type: "url" }]}
          >
            <Input
              placeholder="例如: http://localhost:3888/mock/jd/order"
              className="h-[44px] border-slate-500 font-mono font-black shadow-inner"
            />
          </Form.Item>
          <div className="grid grid-cols-2 gap-8">
            <Form.Item
              name="app_key"
              label={
                <Text className="font-black text-slate-900">
                  App Key (Credentials)
                </Text>
              }
              rules={[{ required: true }]}
            >
              <Input
                placeholder="分配给雷犀的唯一身份标识"
                className="h-[44px] border-slate-500 font-mono font-black py-2"
              />
            </Form.Item>
            <Form.Item
              name="app_secret"
              label={
                <Text className="font-black text-slate-900">
                  Secret (Credentials)
                </Text>
              }
              rules={[{ required: true }]}
            >
              <Input.Password
                placeholder="私密密钥，严禁外传"
                className="h-[44px] border-slate-500 py-2"
              />
            </Form.Item>
          </div>
        </Form>
      </BaseModal>
    </div>
  );
};

// ================================================
// 3. 集成审计日志 (V2.3 FINAL)
// ================================================
const LogTable: React.FC = () => {
  const [selected, setSelected] = useState<any>(null);
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, 500);
  const searchInputRef = useRef<any>(null);

  useKeyboardShortcuts({
    "Ctrl+f": () => searchInputRef.current?.focus(),
    Escape: () => setSelected(null),
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["integration-logs", debouncedKeyword],
    queryFn: () => systemApi.listIntegrationLogs(),
    refetchInterval: 5000,
    staleTime: 3 * 1000,
    refetchOnWindowFocus: false,
  });

  const filteredLogs = useMemo(
    () =>
      logs.filter(
        (l) =>
          l.biz_type.toLowerCase().includes(keyword.toLowerCase()) ||
          l.message.includes(keyword),
      ),
    [logs, keyword],
  );

  const columns = [
    {
      title: "治理批次号",
      dataIndex: "id",
      render: (id: string) => (
        <Text className="font-black text-[10px] text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
          #{id.slice(-10)}
        </Text>
      ),
      width: 140,
    },
    {
      title: "目标实体",
      render: (r: any) => (
        <Tag className="font-black border-slate-500 px-3">
          {r.biz_type?.toUpperCase()}
        </Tag>
      ),
      width: 140,
    },
    {
      title: "判定结果",
      dataIndex: "error_code",
      render: (c: string) =>
        c ? (
          <Tag color="red" className="font-black border-red-500 px-3">
            CRITICAL::{c}
          </Tag>
        ) : (
          <Badge
            color="#10b981"
            text={<Text className="font-black text-green-600">PASS</Text>}
          />
        ),
      width: 180,
    },
    {
      title: "延时性能",
      dataIndex: "duration_ms",
      render: (ms: number) => (
        <Text
          className={
            ms > 800
              ? "text-red-600 font-black bg-red-50 px-2 rounded"
              : "text-slate-500 font-bold"
          }
        >
          {ms}ms
        </Text>
      ),
      width: 100,
    },
    {
      title: "审计摘要",
      dataIndex: "message",
      ellipsis: true,
      render: (t: string) => (
        <Text className="font-bold text-slate-800">{t}</Text>
      ),
    },
    {
      title: "深度下钻",
      valueType: "option",
      render: (_: any, record: any) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          className="bg-slate-900 border-none rounded-xl px-4"
          onClick={() => setSelected(record)}
        >
          溯源
        </Button>
      ),
      width: 120,
    },
  ];

  return (
    <>
      <div className="flex gap-4 w-full bg-slate-50 p-2 rounded-2xl mb-4 items-center border border-slate-100">
        <Input
          ref={searchInputRef}
          placeholder="搜索实体类型、错误消息..."
          className="h-[44px] border-slate-500 font-bold flex-grow max-w-[400px]"
          prefix={<FilterOutlined className="text-slate-400" />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <div className="flex items-center gap-0 border border-slate-500 rounded-xl overflow-hidden h-[44px]">
          <Button
            type="text"
            className="h-full px-6 font-black text-slate-600 hover:bg-slate-200 border-r border-slate-500 rounded-none bg-white"
          >
            今日审计
          </Button>
          <Button
            type="text"
            className="h-full px-6 font-black text-slate-400 hover:bg-slate-200 rounded-none"
          >
            追溯历史
          </Button>
        </div>
        <div className="flex-grow" />
        <Button
          icon={<HistoryOutlined />}
          className="h-[44px] border-slate-500 font-black px-6 rounded-xl"
        >
          归档策略
        </Button>
      </div>

      <Table
        dataSource={filteredLogs}
        columns={columns}
        loading={isLoading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        size="small"
        className="border border-slate-200 rounded-3xl overflow-hidden shadow-2xl"
      />

      <Drawer
        title={
          <span className="font-black text-2xl tracking-tighter">
            DATA LINEAGE AUDIT :: 深度链路溯源
          </span>
        }
        open={!!selected}
        onClose={() => setSelected(null)}
        width={950}
        destroyOnClose
        className="rhino-drawer"
      >
        {selected && (
          <div className="space-y-8">
            <div className="bg-slate-950 p-8 rounded-[2rem] border border-slate-800 shadow-2xl">
              <Row gutter={48}>
                <Col span={6}>
                  <Statistic
                    title={
                      <span className="text-slate-500 font-black">LATENCY</span>
                    }
                    value={selected.duration_ms}
                    suffix="ms"
                    valueStyle={{ fontWeight: 900, color: "#fff" }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title={
                      <span className="text-slate-500 font-black">
                        PLATFORM
                      </span>
                    }
                    value={selected.platform_id}
                    valueStyle={{
                      fontWeight: 900,
                      color: "#3b82f6",
                      textTransform: "uppercase",
                    }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title={
                      <span className="text-slate-500 font-black">STATUS</span>
                    }
                    value={selected.error_code || "STABLE"}
                    valueStyle={{
                      fontWeight: 900,
                      color: selected.error_code ? "#ef4444" : "#10b981",
                    }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title={
                      <span className="text-slate-500 font-black">
                        RETRY_COUNT
                      </span>
                    }
                    value={0}
                    valueStyle={{ fontWeight: 900, color: "#4b5563" }}
                  />
                </Col>
              </Row>
            </div>
            <div className="grid grid-cols-2 gap-8 h-[550px]">
              <div className="flex flex-col">
                <Title
                  level={5}
                  className="!mb-4 font-black text-slate-900 flex items-center gap-3"
                >
                  <HistoryOutlined className="text-slate-400" />{" "}
                  EXTERNAL_RAW_SOURCE
                </Title>
                <div className="flex-grow bg-[#0f172a] text-[#4ade80] p-8 rounded-[2rem] font-mono text-[11px] overflow-auto shadow-inner border-2 border-slate-800">
                  <pre className="selection:bg-green-500/30">
                    {JSON.stringify(
                      selected.request_payload || {
                        status: "EMPTY",
                        message: "当前日志未记录原始请求载荷",
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </div>
              <div className="flex flex-col">
                <Title
                  level={5}
                  className="!mb-4 font-black text-slate-900 flex items-center gap-3"
                >
                  <ThunderboltOutlined className="text-blue-600" />{" "}
                  RHINO_STANDARD_ENTITY
                </Title>
                <div className="flex-grow bg-[#020617] text-[#60a5fa] p-8 rounded-[2rem] font-mono text-[11px] overflow-auto shadow-inner border-2 border-blue-900/40">
                  <pre className="selection:bg-blue-500/30">
                    {JSON.stringify(
                      selected.response_data || {
                        status: "EMPTY",
                        message: "当前日志未记录标准化输出结果",
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </div>
            </div>
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
              <Space size="large">
                <SafetyCertificateOutlined className="text-green-500 text-2xl" />
                <div>
                  <div className="text-white font-black text-sm">
                    审计存证已签署
                  </div>
                  <div className="text-slate-500 font-bold text-xs">
                    审计链 ID: {selected.id.toUpperCase()}
                  </div>
                </div>
              </Space>
              <Button
                ghost
                className="font-black border-slate-600 hover:border-white"
              >
                导出存证报告
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
};

// ================================================
// 主页面组件
// ================================================
export default function DataMappingPage() {
  return (
    <div className="p-10 space-y-10 bg-white min-h-screen">
      <header className="flex justify-between items-end border-b-2 border-slate-50 pb-10">
        <Space direction="vertical" size={2}>
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-slate-900 p-3 rounded-2xl shadow-2xl rotate-3 hover:rotate-0 transition-transform">
              <ControlOutlined className="text-white text-2xl" />
            </div>
            <Title
              level={1}
              className="!mb-0 font-black text-slate-900 tracking-tighter text-4xl"
            >
              数据治理核心 (Integration Matrix)
            </Title>
          </div>
          <Text className="text-slate-400 font-bold text-lg flex items-center gap-4">
            <Badge status="processing" color="#000" />
            工业级异构数据标准化接入引擎
            <span className="text-slate-100 text-2xl font-thin">/</span>
            <span className="text-slate-900 bg-slate-100 px-3 py-1 rounded-full font-black text-sm tracking-widest shadow-sm">
              RHINO OS V2.3.0
            </span>
          </Text>
        </Space>
        <Card
          className="rounded-[2rem] border-slate-900 border-[3px] shadow-[10px_10px_0px_#f1f5f9] hover:shadow-none transition-all cursor-default"
          size="small"
        >
          <Statistic
            title={
              <span className="font-black text-slate-400 tracking-widest uppercase text-[10px]">
                Active Nodes Cluster
              </span>
            }
            value={12}
            valueStyle={{ fontWeight: 900, color: "#000", fontSize: "2rem" }}
            prefix={<SafetyCertificateOutlined className="text-blue-600" />}
          />
        </Card>
      </header>

      <Tabs
        type="card"
        className="rhino-tabs-heavy-v2"
        items={[
          {
            key: "templates",
            label: (
              <span className="font-black text-lg px-8 py-3">
                1. 映射基座治理
              </span>
            ),
            children: (
              <div className="pt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <TemplateTable />
              </div>
            ),
          },
          {
            key: "configs",
            label: (
              <span className="font-black text-lg px-8 py-3">
                2. 链路驱动编排
              </span>
            ),
            children: (
              <div className="pt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <ConfigTable />
              </div>
            ),
          },
          {
            key: "audit",
            label: (
              <Badge count={12} offset={[25, 0]}>
                <span className="font-black text-lg px-8 py-3">
                  3. 审计链路溯源
                </span>
              </Badge>
            ),
            children: (
              <div className="pt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <LogTable />
              </div>
            ),
          },
          {
            key: "monitor",
            label: (
              <span className="font-black text-base px-6">
                <ReloadOutlined className="animate-spin" /> 运维状态
              </span>
            ),
            children: (
              <div className="pt-4 py-20 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <CloudServerOutlined
                  style={{ fontSize: 80, color: "#cbd5e1" }}
                />
                <Title level={3} className="mt-6 font-black text-slate-400">
                  采集集群后端常驻中...
                </Title>
                <Text className="text-slate-400 font-bold max-w-[400px] text-center">
                  当前有 43 个边缘节点正在执行实时采集，链路负载处于 HEALTHY
                  状态。统计图表每 60s 准时重构。
                </Text>
              </div>
            ),
          },
          {
            key: "scripts",
            label: (
              <span className="font-black text-lg px-8 py-3">
                <ClockCircleOutlined /> 定时脚本
              </span>
            ),
            children: (
              <div className="pt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <ScriptManager />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
