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
} from "antd";
import type { DataNode } from "antd/es/tree";
import { systemApi, type CreateDepartmentPayload } from "@/api/system";
import { BaseModal } from "@/components/common/BaseModal";
import { Permission } from "@/components/permission/Permission";
import { DepartmentTreeDraggable } from "./components/DepartmentTreeDraggable";

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
    }) => systemApi.updateDepartment(id, payload),
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      form.resetFields();
      await refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: systemApi.deleteDepartment,
    onSuccess: refresh,
  });

  const batchStatusMutation = useMutation({
    mutationFn: systemApi.batchUpdateDepartmentStatus,
    onSuccess: refresh,
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
                batchStatusMutation.mutate({ ids: checkedKeys, status: 1 })
              }
            >
              批量启用
            </Button>
            <Button
              disabled={checkedKeys.length === 0}
              onClick={() =>
                batchStatusMutation.mutate({ ids: checkedKeys, status: 0 })
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
          <Form.Item label="部门名称" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label="部门编码"
            name="code"
            rules={[{ required: !editing }]}
          >
            <Input disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item label="上级部门" name="parent_id">
            <Select
              allowClear
              options={flattenDepartmentOptions(departments)}
            />
          </Form.Item>
          <Form.Item label="所属平台" name="platform_id">
            <Select
              allowClear
              options={platforms.map((item) => ({
                label: item.name,
                value: item.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="排序" name="sort" initialValue={0}>
            <InputNumber style={{ width: "100%" }} />
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
