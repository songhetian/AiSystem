import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Tree, Button, Space, Input, Form, message, Modal } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { DataNode } from "antd/es/tree";
import { personnelApi } from "@/api/personnel";
import { BaseModal } from "@/components/common/BaseModal";
import { Permission } from "@/components/permission/Permission";
import { useDebounce, useFormDraft, useKeyboardShortcuts } from "@/hooks";
import { GlobalLoading } from "@/components/common";

interface DepartmentRecord {
  id: string;
  name: string;
  parent_id?: string | null;
}

export default function DepartmentsPage() {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRecord | null>(null);
  const [searchText, setSearchText] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const searchInputRef = useRef<any>(null);

  // 使用防抖优化搜索
  const debouncedSearchText = useDebounce(searchText, 500);

  // 使用表单草稿自动保存
  const { clearDraft } = useFormDraft(form, "department-form", 30000);

  // 添加快捷键支持
  useKeyboardShortcuts({
    "Ctrl+n": () => {
      setOpen(true);
      setEditing(null);
      form.resetFields();
    },
    "Ctrl+f": () => searchInputRef.current?.focus(),
    "Ctrl+r": () => refresh(),
    Escape: () => {
      if (open) setOpen(false);
    },
  });

  const { data = [], isLoading } = useQuery<DepartmentRecord[]>({
    queryKey: ["personnel-departments"],
    queryFn: personnelApi.listDepartments,
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["personnel-departments"] });

  const createMutation = useMutation({
    mutationFn: personnelApi.createDepartment,
    onSuccess: () => {
      message.success("部门创建成功");
      setOpen(false);
      form.resetFields();
      clearDraft();
      refresh();
    },
    onError: () => {
      message.error("创建失败，请重试");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      personnelApi.updateDepartment(id, data),
    onSuccess: () => {
      message.success("部门更新成功");
      setOpen(false);
      setEditing(null);
      form.resetFields();
      clearDraft();
      refresh();
    },
    onError: () => {
      message.error("更新失败，请重试");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: personnelApi.deleteDepartment,
    onSuccess: () => {
      message.success("部门删除成功");
      refresh();
    },
    onError: () => {
      message.error("删除失败，请重试");
    },
  });

  const handleDelete = (id: string, name: string) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除部门"${name}"吗？此操作不可恢复。`,
      okText: "确认删除",
      okType: "danger",
      cancelText: "取消",
      onOk: () => deleteMutation.mutate(id),
    });
  };

  // 过滤树节点
  const filterTree = (nodes: DataNode[], searchText: string): DataNode[] => {
    if (!searchText) return nodes;

    return nodes.reduce((acc: DataNode[], node) => {
      const title = String(node.title).toLowerCase();
      const matches = title.includes(searchText.toLowerCase());
      const children = node.children
        ? filterTree(node.children, searchText)
        : [];

      if (matches || children.length > 0) {
        acc.push({
          ...node,
          children: children.length > 0 ? children : node.children,
        });
      }

      return acc;
    }, []);
  };

  // 获取所有节点的 key
  const getAllKeys = (nodes: DataNode[]): string[] => {
    const keys: string[] = [];
    const traverse = (nodes: DataNode[]) => {
      nodes.forEach((node) => {
        keys.push(String(node.key));
        if (node.children) {
          traverse(node.children);
        }
      });
    };
    traverse(nodes);
    return keys;
  };

  const treeData = buildTree(data);
  const filteredTreeData = filterTree(treeData, debouncedSearchText);

  // 搜索时自动展开所有节点
  const displayExpandedKeys = debouncedSearchText
    ? getAllKeys(filteredTreeData)
    : expandedKeys;

  return (
    <div className="p-4">
      <Card
        title="组织架构视图"
        extra={
          <Space>
            <Input.Search
              ref={searchInputRef}
              placeholder="搜索部门 (Ctrl+F)"
              allowClear
              style={{ width: 250 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={refresh}
              title="快捷键: Ctrl+R"
            >
              刷新
            </Button>
            <Permission code="personnel:department:create">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setOpen(true);
                  setEditing(null);
                  form.resetFields();
                }}
                title="快捷键: Ctrl+N"
              >
                新增部门
              </Button>
            </Permission>
          </Space>
        }
      >
        <GlobalLoading loading={isLoading}>
          {filteredTreeData.length > 0 ? (
            <Tree
              defaultExpandAll
              expandedKeys={displayExpandedKeys}
              onExpand={(keys) => setExpandedKeys(keys as string[])}
              treeData={filteredTreeData}
              titleRender={(node: DataNode) => (
                <div className="flex items-center justify-between group">
                  <span>{node.title as React.ReactNode}</span>
                  <Space
                    size="small"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Permission code="personnel:department:update">
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          const dept = data.find((d) => d.id === String(node.key));
                          if (dept) {
                            setEditing(dept);
                            form.setFieldsValue(dept);
                            setOpen(true);
                          }
                        }}
                      >
                        编辑
                      </Button>
                    </Permission>
                    <Permission code="personnel:department:delete">
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          const dept = data.find((d) => d.id === String(node.key));
                          if (dept) {
                            handleDelete(dept.id, dept.name);
                          }
                        }}
                      >
                        删除
                      </Button>
                    </Permission>
                  </Space>
                </div>
              )}
            />
          ) : (
            <div className="text-center text-gray-400 py-8">
              {debouncedSearchText ? "未找到匹配的部门" : "暂无部门数据"}
            </div>
          )}
        </GlobalLoading>
      </Card>

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
          onFinish={(values) => {
            if (editing) {
              updateMutation.mutate({ id: editing.id, data: values });
            } else {
              createMutation.mutate(values);
            }
          }}
        >
          <Form.Item
            label="部门名称"
            name="name"
            rules={[{ required: true, message: "请输入部门名称" }]}
          >
            <Input placeholder="请输入部门名称" />
          </Form.Item>
          <Form.Item label="上级部门" name="parent_id">
            <Tree
              treeData={treeData}
              onSelect={(keys) => {
                if (keys.length > 0) {
                  form.setFieldValue("parent_id", keys[0]);
                }
              }}
            />
          </Form.Item>
        </Form>
      </BaseModal>
    </div>
  );
}

function buildTree(items: DepartmentRecord[]): DataNode[] {
  const nodeMap = new Map(
    items.map((item) => [
      item.id,
      { key: item.id, title: item.name, children: [] as DataNode[] },
    ]),
  );
  const roots: DataNode[] = [];

  items.forEach((item) => {
    const node = nodeMap.get(item.id)!;
    if (item.parent_id && nodeMap.has(item.parent_id)) {
      nodeMap.get(item.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}
