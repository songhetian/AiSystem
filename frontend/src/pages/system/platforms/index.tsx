import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProColumns } from "@ant-design/pro-components";
import {
  Button,
  Card,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  message,
} from "antd";
import { systemApi } from "@/api/system";
import { BaseModal } from "@/components/common/BaseModal";
import { Permission } from "@/components/permission/Permission";
import { BaseTable } from "@/components/table/BaseTable";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { GlobalLoading } from "@/components/common/GlobalLoading";
import { confirmBatchAction } from "@/utils/ui-helpers";

interface PlatformRecord {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: number;
}

const baseColumns: ProColumns<PlatformRecord>[] = [
  { title: "平台名称", dataIndex: "name" },
  { title: "平台编码", dataIndex: "code" },
  { title: "描述", dataIndex: "description" },
  {
    title: "状态",
    dataIndex: "status",
    render: (_, record) => (record.status === 1 ? "启用" : "禁用"),
  },
];

export default function SystemPlatformsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 表单草稿保存
  const { clearDraft } = useFormDraft(form, "system-platform-form", 30000);

  const { data = [], isLoading } = useQuery<PlatformRecord[]>({
    queryKey: ["system-platforms"],
    queryFn: systemApi.listPlatforms,
  });

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+n": () => setOpen(true),
    "Ctrl+r": () => {
      refresh();
      message.success("已刷新");
    },
    Escape: () => {
      setOpen(false);
      setEditing(null);
    },
  });

  const refresh = async () => {
    setSelectedIds([]);
    await queryClient.invalidateQueries({ queryKey: ["system-platforms"] });
  };

  const createMutation = useMutation({
    mutationFn: systemApi.createPlatform,
    onSuccess: async () => {
      setOpen(false);
      form.resetFields();
      clearDraft();
      message.success("创建成功");
      await refresh();
    },
    onError: (error: any) => {
      message.error(error?.message || "创建失败");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, unknown>;
    }) => systemApi.updatePlatform(id, payload),
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      form.resetFields();
      clearDraft();
      message.success("更新成功");
      await refresh();
    },
    onError: (error: any) => {
      message.error(error?.message || "更新失败");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: systemApi.deletePlatform,
    onSuccess: () => {
      message.success("删除成功");
      refresh();
    },
    onError: (error: any) => {
      message.error(error?.message || "删除失败");
    },
  });

  const batchStatusMutation = useMutation({
    mutationFn: systemApi.batchUpdatePlatformStatus,
    onSuccess: () => {
      message.success("批量操作成功");
      refresh();
    },
    onError: (error: any) => {
      message.error(error?.message || "批量操作失败");
    },
  });

  const columns: ProColumns<PlatformRecord>[] = [
    ...baseColumns,
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Permission code="system:platform:update">
            <Button
              type="link"
              onClick={() => {
                setEditing(record);
                form.setFieldsValue(record);
                setOpen(true);
              }}
            >
              编辑
            </Button>
          </Permission>
          <Permission code="system:platform:delete">
            <Popconfirm
              title="确认删除该平台？"
              onConfirm={() => deleteMutation.mutate(record.id)}
            >
              <Button type="link" danger>
                删除
              </Button>
            </Popconfirm>
          </Permission>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="平台管理"
      extra={
        <Space>
          <Permission code="system:platform:batch-status">
            <Button
              disabled={selectedIds.length === 0}
              onClick={() =>
                confirmBatchAction(
                  `批量启用选中的 ${selectedIds.length} 个平台`,
                  () =>
                    batchStatusMutation.mutate({ ids: selectedIds, status: 1 }),
                )
              }
            >
              批量启用
            </Button>
            <Button
              disabled={selectedIds.length === 0}
              onClick={() =>
                confirmBatchAction(
                  `批量禁用选中的 ${selectedIds.length} 个平台`,
                  () =>
                    batchStatusMutation.mutate({ ids: selectedIds, status: 0 }),
                )
              }
            >
              批量禁用
            </Button>
          </Permission>
          <Permission code="system:platform:create">
            <Button type="primary" onClick={() => setOpen(true)}>
              新增平台
            </Button>
          </Permission>
        </Space>
      }
    >
      <GlobalLoading loading={isLoading}>
        <BaseTable<PlatformRecord>
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={isLoading}
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: (keys: React.Key[]) => setSelectedIds(keys as string[]),
          }}
        />
      </GlobalLoading>
      <BaseModal
        open={open}
        title={editing ? "编辑平台" : "新增平台"}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) =>
            editing
              ? updateMutation.mutate({ id: editing.id, payload: values })
              : createMutation.mutate(values)
          }
          initialValues={{ status: 1 }}
        >
          <Form.Item
            label="平台名称"
            name="name"
            rules={[{ required: true, message: "请输入平台名称" }]}
          >
            <Input placeholder="输入平台名称" />
          </Form.Item>
          <Form.Item
            label="平台编码"
            name="code"
            rules={[{ required: !editing, message: "请输入平台编码" }]}
          >
            <Input disabled={Boolean(editing)} placeholder="一经创建不可修改" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="输入平台描述信息" />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select
              options={[
                { label: "启用", value: 1 },
                { label: "禁用", value: 0 },
              ]}
            />
          </Form.Item>
        </Form>
      </BaseModal>
    </Card>
  );
}
