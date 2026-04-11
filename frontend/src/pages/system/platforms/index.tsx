import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProColumns } from "@ant-design/pro-components";
import { Button, Card, Form, Input, Popconfirm, Select, Space } from "antd";
import { systemApi } from "@/api/system";
import { BaseModal } from "@/components/common/BaseModal";
import { Permission } from "@/components/permission/Permission";
import { BaseTable } from "@/components/table/BaseTable";

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
  const { data = [], isLoading } = useQuery<PlatformRecord[]>({
    queryKey: ["system-platforms"],
    queryFn: systemApi.listPlatforms,
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
      await refresh();
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
      await refresh();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: systemApi.deletePlatform,
    onSuccess: refresh,
  });
  const batchStatusMutation = useMutation({
    mutationFn: systemApi.batchUpdatePlatformStatus,
    onSuccess: refresh,
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
                batchStatusMutation.mutate({ ids: selectedIds, status: 1 })
              }
            >
              批量启用
            </Button>
            <Button
              disabled={selectedIds.length === 0}
              onClick={() =>
                batchStatusMutation.mutate({ ids: selectedIds, status: 0 })
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
      <BaseModal
        open={open}
        title={editing ? "编辑平台" : "新增平台"}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) =>
            editing
              ? updateMutation.mutate({ id: editing.id, payload: values })
              : createMutation.mutate(values)
          }
        >
          <Form.Item label="平台名称" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label="平台编码"
            name="code"
            rules={[{ required: !editing }]}
          >
            <Input disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue={1}>
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
