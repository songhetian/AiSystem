import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Tree,
  Tabs,
  message,
} from "antd";
import type { DataNode } from "antd/es/tree";
import { systemApi, type CreateDepartmentPayload } from "@/api/system";
import { BaseModal } from "@/components/common/BaseModal";
import { Permission } from "@/components/permission/Permission";
import { DepartmentTreeDraggable } from "./components/DepartmentTreeDraggable";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { GlobalLoading } from "@/components/common/GlobalLoading";
import { confirmBatchAction } from "@/utils/ui-helpers";

interface DepartmentNode {
  id: string;
  name: string;
  code: string;
  parent_id?: string | null;
  status: number;
  sort: number;
  platform_id?: string;
  children?: DepartmentNode[];
}

interface PlatformRecord {
  id: string;
  name: string;
}

export default function SystemDepartmentsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentNode | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("list");
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 表单草稿保存
  const { clearDraft } = useFormDraft(form, "system-department-form", 30000);

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

  const { data: departments = [], isLoading } = useQuery<DepartmentNode[]>({
    queryKey: ["system-departments-tree"],
    queryFn: systemApi.listDepartmentTree,
  });

  const { data: platforms = [] } = useQuery<PlatformRecord[]>({
    queryKey: ["system-platform-options"],
    queryFn: systemApi.listPlatforms,
  });

  const refresh = async () => {
    setCheckedKeys([]);
    await queryClient.invalidateQueries({
      queryKey: ["system-departments-tree"],
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateDepartmentPayload) =>
      systemApi.createDepartment(payload),
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
    }) => systemApi.updateDepartment(id, payload),
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
    mutationFn: systemApi.deleteDepartment,
    onSuccess: () => {
      message.success("删除成功");
      refresh();
    },
    onError: (error: any) => {
      message.error(error?.message || "删除失败");
    },
  });

  const batchStatusMutation = useMutation({
    mutationFn: systemApi.batchUpdateDepartmentStatus,
    onSuccess: () => {
      message.success("批量操作成功");
      refresh();
    },
    onError: (error: any) => {
      message.error(error?.message || "批量操作失败");
    },
  });

  const onEdit = (item: DepartmentNode) => {
    setEditing(item);
    form.setFieldsValue(item);
    setOpen(true);
  };

  return (
    <Card
      title="部门管理"
      loading={isLoading}
      extra={
        <Space>
          <Permission code="system:department:batch-status">
            <Button
              disabled={checkedKeys.length === 0}
              onClick={() =>
                confirmBatchAction(
                  `批量启用选中的 ${checkedKeys.length} 个部门`,
                  () =>
                    batchStatusMutation.mutate({ ids: checkedKeys, status: 1 }),
                )
              }
            >
              批量启用
            </Button>
            <Button
              disabled={checkedKeys.length === 0}
              onClick={() =>
                confirmBatchAction(
                  `批量禁用选中的 ${checkedKeys.length} 个部门`,
                  () =>
                    batchStatusMutation.mutate({ ids: checkedKeys, status: 0 }),
                )
              }
            >
              批量禁用
            </Button>
          </Permission>
          <Permission code="system:department:create">
            <Button type="primary" onClick={() => setOpen(true)}>
              新增部门
            </Button>
          </Permission>
        </Space>
      }
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab="部门列表" key="list">
          <GlobalLoading loading={isLoading}>
            <Tree
              checkable
              defaultExpandAll
              checkedKeys={checkedKeys}
              onCheck={(keys) => setCheckedKeys(keys as string[])}
              treeData={buildDepartmentTree(
                departments,
                onEdit,
                deleteMutation.mutate,
              )}
            />
          </GlobalLoading>
        </Tabs.TabPane>
        <Tabs.TabPane tab="部门排序" key="sort">
          <DepartmentTreeDraggable
            departments={departments}
            onUpdate={refresh}
          />
        </Tabs.TabPane>
      </Tabs>

      <BaseModal
        open={open}
        title={editing ? "编辑部门" : "新增部门"}
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
          initialValues={{ status: 1, sort: 0 }}
        >
          <Form.Item
            label="部门名称"
            name="name"
            rules={[{ required: true, message: "请输入部门名称" }]}
          >
            <Input placeholder="输入部门名称" />
          </Form.Item>
          <Form.Item
            label="部门编码"
            name="code"
            rules={[{ required: !editing, message: "请输入部门编码" }]}
          >
            <Input disabled={Boolean(editing)} placeholder="一经创建不可修改" />
          </Form.Item>
          <Form.Item label="上级部门" name="parent_id">
            <Select
              allowClear
              placeholder="选择上级部门"
              options={flattenDepartmentOptions(departments)}
            />
          </Form.Item>
          <Form.Item label="所属平台" name="platform_id">
            <Select
              allowClear
              placeholder="选择所属平台"
              options={platforms.map((item) => ({
                label: item.name,
                value: item.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="排序" name="sort">
            <InputNumber style={{ width: "100%" }} placeholder="输入排序号" />
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

function buildDepartmentTree(
  items: DepartmentNode[],
  onEdit: (item: DepartmentNode) => void,
  onDelete: (id: string) => void,
): DataNode[] {
  return items.map((item) => ({
    key: item.id,
    title: (
      <Space>
        <span>
          {item.name}{" "}
          {item.status === 0 && (
            <span style={{ color: "#ff4d4f" }}>(禁用)</span>
          )}
        </span>
        <Permission code="system:department:update">
          <Button type="link" size="small" onClick={() => onEdit(item)}>
            编辑
          </Button>
        </Permission>
        <Permission code="system:department:delete">
          <Popconfirm
            title="确认删除该部门？"
            onConfirm={() => onDelete(item.id)}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Permission>
      </Space>
    ),
    children: buildDepartmentTree(item.children ?? [], onEdit, onDelete),
  }));
}

function flattenDepartmentOptions(
  items: DepartmentNode[],
  prefix = "",
): Array<{ label: string; value: string }> {
  return items.flatMap((item) => [
    { label: `${prefix}${item.name}`, value: item.id },
    ...flattenDepartmentOptions(
      item.children ?? [],
      `${prefix}${item.name} / `,
    ),
  ]);
}
