import { useMemo, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProColumns } from "@ant-design/pro-components";
import {
  ArrowLeftOutlined,
  CopyOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  approvalApi,
  type ApprovalNode,
  type ApprovalPerson,
  type ApprovalTemplate,
} from "@/api/approval";
import { BaseModal } from "@/components/common/BaseModal";
import { ActionGroup } from "@/components/common/ActionGroup";
import { Permission } from "@/components/permission/Permission";
import { BaseTable } from "@/components/table/BaseTable";
import { WorkflowEditor } from "./components/WorkflowEditor";
import { useDebounce, useFormDraft, useKeyboardShortcuts } from "@/hooks";
import { GlobalLoading } from "@/components/common";

const { Text } = Typography;

function createDefaultNodes(): ApprovalNode[] {
  return [
    {
      id: "start",
      name: "开始",
      type: "start",
      timeoutHours: 0,
      approvers: [],
      copies: [],
    },
    {
      id: `approval-${Date.now()}`,
      name: "一级审批",
      type: "approval",
      timeoutHours: 24,
      approvers: [],
      copies: [],
    },
    {
      id: "end",
      name: "结束",
      type: "end",
      timeoutHours: 0,
      approvers: [],
      copies: [],
    },
  ];
}

export default function ApprovalProcessPage() {
  const [filterForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [editingTemplate, setEditingTemplate] =
    useState<ApprovalTemplate | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["approval-templates"],
    queryFn: approvalApi.listTemplates,
  });

  const { data: people = [] } = useQuery<ApprovalPerson[]>({
    queryKey: ["approval-people"],
    queryFn: approvalApi.listPeople,
  });

  const filters = Form.useWatch([], filterForm) as
    | { name?: string; type?: string; status?: string }
    | undefined;

  const filteredTemplates = useMemo(() => {
    return templates.filter((item) => {
      if (
        filters?.name &&
        !item.name.toLowerCase().includes(filters.name.toLowerCase())
      ) {
        return false;
      }
      if (filters?.type && item.type !== filters.type) {
        return false;
      }
      if (filters?.status && item.status !== filters.status) {
        return false;
      }
      return true;
    });
  }, [filters?.name, filters?.status, filters?.type, templates]);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["approval-templates"] });

  const deleteMutation = useMutation({
    mutationFn: approvalApi.deleteTemplate,
    onSuccess: async () => {
      message.success("模板已删除");
      await refresh();
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => approvalApi.duplicateTemplate(id),
    onSuccess: async () => {
      message.success("模板已复制");
      await refresh();
    },
  });

  const createMutation = useMutation({
    mutationFn: approvalApi.createTemplate,
    onSuccess: async (template) => {
      message.success("模板已创建");
      setCreateOpen(false);
      createForm.resetFields();
      setEditingTemplate(template);
      await refresh();
    },
  });

  const saveMutation = useMutation({
    mutationFn: (payload: { id: string; data: ApprovalTemplate }) =>
      approvalApi.saveTemplate(payload.id, payload.data),
    onSuccess: async () => {
      message.success("流程已保存");
      setEditingTemplate(null);
      await refresh();
    },
  });

  if (editingTemplate) {
    return (
      <div className="p-4">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => setEditingTemplate(null)}
          className="mb-4 font-bold"
        >
          返回模板列表
        </Button>
        <WorkflowEditor
          template={editingTemplate}
          people={people}
          onSave={(nodes, formFields) =>
            saveMutation.mutate({
              id: editingTemplate.id,
              data: {
                ...editingTemplate,
                nodes,
                formFields,
                updatedAt: new Date().toISOString(),
              },
            })
          }
          loading={saveMutation.isPending}
        />
      </div>
    );
  }

  const columns: ProColumns<ApprovalTemplate>[] = [
    {
      title: "模板名称",
      dataIndex: "name",
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text className="font-black text-slate-900">{text}</Text>
          <Text className="text-xs text-slate-500">
            {record.description || "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "审批类型",
      dataIndex: "type",
      render: (type) => (
        <Tag className="border-slate-300 font-bold">{type}</Tag>
      ),
    },
    {
      title: "适用范围",
      dataIndex: "platformName",
      render: (_, record) => (
        <div className="flex flex-col">
          <Text className="text-xs text-slate-600">{record.platformName}</Text>
          <Text className="font-bold text-slate-900">
            {record.departmentName}
          </Text>
        </div>
      ),
    },
    {
      title: "流程节点",
      dataIndex: "nodes",
      render: (_, record) => (
        <Space size={4} wrap>
          {(record.nodes || []).map((node, idx) => (
            <span key={node.id} className="flex items-center">
              <Badge
                count={idx + 1}
                size="small"
                style={{ backgroundColor: "#64748b", transform: "scale(0.8)" }}
              />
              <Text className="ml-1 text-xs font-bold text-slate-600">
                {node.name}
              </Text>
              {idx < record.nodes.length - 1 ? (
                <span className="mx-1 text-slate-300">→</span>
              ) : null}
            </span>
          ))}
        </Space>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      render: (status) => (
        <Tag
          color={status === "enabled" ? "success" : "default"}
          className="border-2 font-black"
        >
          {status === "enabled" ? "启用中" : "已禁用"}
        </Tag>
      ),
    },
    {
      title: "操作",
      valueType: "option",
      width: 220,
      render: (_, record) => (
        <Space>
          <Permission code="approval:process:update">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              className="font-bold text-slate-900"
              onClick={() => setEditingTemplate(record)}
            >
              配置流程
            </Button>
          </Permission>
          <Permission code="approval:process:update">
            <Button
              type="link"
              size="small"
              icon={<CopyOutlined />}
              className="font-bold text-blue-600"
              loading={
                duplicateMutation.isPending &&
                duplicateMutation.variables === record.id
              }
              onClick={() => duplicateMutation.mutate(record.id)}
            >
              复制
            </Button>
          </Permission>
          <ActionGroup
            onDelete={() => deleteMutation.mutate(record.id)}
            deletePermission="approval:process:update"
          />
        </Space>
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
              prefix={<SearchOutlined />}
              placeholder="搜索模板名称"
              className="h-[44px]"
            />
          </Form.Item>
          <Form.Item name="type" className="mb-0 min-w-[150px]">
            <Select
              placeholder="审批类型"
              className="h-[44px]"
              options={[
                { label: "请假", value: "请假" },
                { label: "加班", value: "加班" },
                { label: "报销", value: "报销" },
              ]}
              allowClear
            />
          </Form.Item>
          <Form.Item name="status" className="mb-0 min-w-[120px]">
            <Select
              placeholder="状态"
              className="h-[44px]"
              options={[
                { label: "启用", value: "enabled" },
                { label: "禁用", value: "disabled" },
              ]}
              allowClear
            />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space size={8}>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => filterForm.resetFields()}
                className="h-[44px] border-slate-500 font-bold"
              >
                重置
              </Button>
              <Permission code="approval:process:update">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  className="h-[44px] font-bold"
                  onClick={() => setCreateOpen(true)}
                >
                  创建模板
                </Button>
              </Permission>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card bordered={false} className="shadow-sm">
        <BaseTable<ApprovalTemplate>
          columns={columns}
          dataSource={filteredTemplates}
          loading={isLoading}
          rowKey="id"
        />
      </Card>

      <BaseModal
        open={createOpen}
        title="创建审批模板"
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{ status: "enabled", type: "请假" }}
          onFinish={(values) =>
            createMutation.mutate({
              id: `tpl-${Date.now()}`,
              name: values.name,
              type: values.type,
              platformName: values.platformName,
              departmentName: values.departmentName,
              status: values.status,
              description: values.description || "",
              updatedAt: new Date().toISOString(),
              nodes: createDefaultNodes(),
            })
          }
        >
          <Form.Item
            label="模板名称"
            name="name"
            rules={[{ required: true, message: "请输入模板名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="审批类型"
            name="type"
            rules={[{ required: true, message: "请选择审批类型" }]}
          >
            <Select
              options={[
                { label: "请假", value: "请假" },
                { label: "加班", value: "加班" },
                { label: "报销", value: "报销" },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="平台名称"
            name="platformName"
            rules={[{ required: true, message: "请输入平台名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="部门名称"
            name="departmentName"
            rules={[{ required: true, message: "请输入部门名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select
              options={[
                { label: "启用", value: "enabled" },
                { label: "禁用", value: "disabled" },
              ]}
            />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </BaseModal>
    </div>
  );
}
