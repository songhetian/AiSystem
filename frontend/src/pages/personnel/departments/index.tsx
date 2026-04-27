/**
 * 人事管理 - 部门管理页面（优化版）
 * 使用新的组件库重构，提供更好的视觉效果和用户体验
 */

import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tree, Space, Input, Form, message, Select } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import type { DataNode } from "antd/es/tree";
import { PageContainer, SectionCard } from '@/components/layout';
import { ActionBar, StatusTag } from '@/components/business';
import { Button, Modal } from '@/components/ui';
import { personnelApi } from "@/api/personnel";
import { Permission } from "@/components/permission/Permission";
import { useDebounce, useFormDraft, useKeyboardShortcuts } from "@/hooks";
import { formatDate } from '@/utils/format';

/**
 * 部门数据类型
 */
interface DepartmentRecord {
  id: string;
  name: string;
  code?: string;
  parent_id?: string | null;
  status?: number;
  sort_order?: number;
  description?: string;
  create_time?: string;
  children?: DepartmentRecord[];
}

const DepartmentsPage: React.FC = () => {
  // 状态管理
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<DepartmentRecord | null>(null);
  const [searchText, setSearchText] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const searchInputRef = useRef<any>(null);

  // 使用防抖优化搜索
  const debouncedSearchText = useDebounce(searchText, 500);

  // 使用表单草稿自动保存
  const { clearDraft } = useFormDraft(form, "department-form", 30000);

  // 键盘快捷键
  useKeyboardShortcuts({
    "ctrl+n": () => handleAdd(),
    "ctrl+f": () => searchInputRef.current?.focus(),
    "ctrl+r": () => refresh(),
    "escape": () => {
      if (modalVisible) setModalVisible(false);
    },
  });

  // 查询部门列表
  const { data = [], isLoading } = useQuery<DepartmentRecord[]>({
    queryKey: ["personnel-departments"],
    queryFn: personnelApi.listDepartments,
  });

  // 刷新数据
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["personnel-departments"] });

  // 创建部门
  const createMutation = useMutation({
    mutationFn: personnelApi.createDepartment,
    onSuccess: () => {
      message.success("部门创建成功");
      setModalVisible(false);
      form.resetFields();
      clearDraft();
      refresh();
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || "创建失败，请重试");
    },
  });

  // 更新部门
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      personnelApi.updateDepartment(id, data),
    onSuccess: () => {
      message.success("部门更新成功");
      setModalVisible(false);
      setEditing(null);
      form.resetFields();
      clearDraft();
      refresh();
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || "更新失败，请重试");
    },
  });

  // 删除部门
  const deleteMutation = useMutation({
    mutationFn: personnelApi.deleteDepartment,
    onSuccess: () => {
      message.success("部门删除成功");
      refresh();
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || "删除失败，请重试");
    },
  });

  // 构建树形数据
  const buildTree = (items: DepartmentRecord[]): DataNode[] => {
    const nodeMap = new Map(
      items.map((item) => [
        item.id,
        {
          key: item.id,
          title: item.name,
          children: [] as DataNode[],
          data: item
        },
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

  // 新增部门
  const handleAdd = () => {
    setEditing(null);
    form.resetFields();
    setModalVisible(true);
  };

  // 编辑部门
  const handleEdit = (record: DepartmentRecord) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  // 删除部门
  const handleDelete = (record: DepartmentRecord) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除部门 "${record.name}" 吗？此操作不可恢复。`,
      okText: "确认删除",
      cancelText: "取消",
      onOk: () => deleteMutation.mutate(record.id),
    });
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        updateMutation.mutate({ id: editing.id, data: values });
      } else {
        createMutation.mutate(values);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 获取上级部门选项（排除自己和子孙节点）
  const getParentOptions = (currentId?: string): DepartmentRecord[] => {
    if (!currentId) return data;

    const excludeIds = new Set<string>();

    // 添加当前节点
    excludeIds.add(currentId);

    // 递归添加所有子孙节点
    const addDescendants = (parentId: string) => {
      data.forEach(item => {
        if (item.parent_id === parentId) {
          excludeIds.add(item.id);
          addDescendants(item.id);
        }
      });
    };

    addDescendants(currentId);

    return data.filter(item => !excludeIds.has(item.id));
  };

  const treeData = buildTree(data);
  const filteredTreeData = filterTree(treeData, debouncedSearchText);

  // 搜索时自动展开所有节点
  const displayExpandedKeys = debouncedSearchText
    ? getAllKeys(filteredTreeData)
    : expandedKeys;

  return (
    <PageContainer
      title="部门管理"
      subTitle="管理组织架构，支持树形展示和层级管理"
      breadcrumb={{
        items: [
          { title: '首页', path: '/' },
          { title: '人事管理' },
          { title: '部门管理' },
        ],
      }}
    >
      {/* 操作区域 */}
      <SectionCard>
        <ActionBar
          actions={[
            {
              key: 'add',
              label: '新增部门',
              icon: <PlusOutlined />,
              type: 'primary',
              permission: 'personnel:department:create',
              onClick: handleAdd,
            },
            {
              key: 'refresh',
              label: '刷新',
              icon: <ReloadOutlined />,
              onClick: refresh,
            },
          ]}
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
              <span style={{ color: '#999', fontSize: 14 }}>
                共 {data.length} 个部门
                {selectedKeys.length > 0 && ` / 已选 ${selectedKeys.length} 个`}
              </span>
            </Space>
          }
          align="space-between"
          glass
        />
      </SectionCard>

      {/* 部门树形结构 */}
      <SectionCard title="组织架构" icon={<ApartmentOutlined />} glass>
        {filteredTreeData.length > 0 ? (
          <Tree
            showLine
            defaultExpandAll
            expandedKeys={displayExpandedKeys}
            selectedKeys={selectedKeys}
            onExpand={(keys) => setExpandedKeys(keys as string[])}
            onSelect={(keys) => setSelectedKeys(keys as string[])}
            treeData={filteredTreeData}
            titleRender={(node: any) => {
              const dept = data.find((d) => d.id === String(node.key));
              return (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '4px 8px',
                  borderRadius: 4,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 500 }}>{node.title}</span>
                    {dept?.code && (
                      <span style={{
                        fontSize: 12,
                        color: '#666',
                        background: '#f0f0f0',
                        padding: '2px 6px',
                        borderRadius: 2
                      }}>
                        {dept.code}
                      </span>
                    )}
                    {dept?.status !== undefined && (
                      <StatusTag
                        status={dept.status === 1 ? 'success' : 'error'}
                        text={dept.status === 1 ? '启用' : '禁用'}
                        size="small"
                      />
                    )}
                  </div>
                  <Space
                    size="small"
                    style={{
                      opacity: 0,
                      transition: 'opacity 0.2s'
                    }}
                    className="tree-node-actions"
                  >
                    <Permission code="personnel:department:update">
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (dept) handleEdit(dept);
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
                          if (dept) handleDelete(dept);
                        }}
                      >
                        删除
                      </Button>
                    </Permission>
                  </Space>
                </div>
              );
            }}
          />
        ) : (
          <div style={{
            textAlign: 'center',
            color: '#999',
            padding: '60px 0'
          }}>
            {debouncedSearchText ? "未找到匹配的部门" : "暂无部门数据"}
          </div>
        )}
      </SectionCard>

      {/* 部门表单弹窗 */}
      <Modal
        visible={modalVisible}
        title={editing ? '编辑部门' : '新增部门'}
        width={600}
        glass
        onCancel={() => {
          setModalVisible(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: 1, sort_order: 0 }}
        >
          <Form.Item
            label="部门名称"
            name="name"
            rules={[
              { required: true, message: '请输入部门名称' },
              { max: 50, message: '部门名称最多50个字符' },
            ]}
          >
            <Input placeholder="请输入部门名称" />
          </Form.Item>

          <Form.Item
            label="部门编码"
            name="code"
            rules={[
              { max: 20, message: '部门编码最多20个字符' },
              { pattern: /^[A-Z0-9_]+$/, message: '部门编码只能包含大写字母、数字和下划线' },
            ]}
          >
            <Input
              placeholder="请输入部门编码（如：HR、IT、SALES）"
              disabled={!!editing}
              style={{ textTransform: 'uppercase' }}
            />
          </Form.Item>

          <Form.Item
            label="上级部门"
            name="parent_id"
          >
            <Select
              placeholder="请选择上级部门（不选择则为顶级部门）"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={getParentOptions(editing?.id).map(item => ({
                label: item.name,
                value: item.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="状态"
            name="status"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select>
              <Select.Option value={1}>启用</Select.Option>
              <Select.Option value={0}>禁用</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="排序"
            name="sort_order"
            rules={[{ type: 'number', min: 0, message: '排序值不能小于0' }]}
          >
            <Input
              type="number"
              placeholder="请输入排序值（数字越小越靠前）"
              min={0}
            />
          </Form.Item>

          <Form.Item
            label="部门描述"
            name="description"
            rules={[{ max: 200, message: '描述最多200个字符' }]}
          >
            <Input.TextArea
              placeholder="请输入部门描述"
              rows={3}
              showCount
              maxLength={200}
            />
          </Form.Item>

          {editing && (
            <div style={{
              padding: 12,
              background: '#f0f9ff',
              borderRadius: 8,
              marginTop: 16,
            }}>
              <div style={{ fontSize: 12, color: '#0369a1' }}>💡 提示：</div>
              <ul style={{
                fontSize: 12,
                color: '#0369a1',
                marginTop: 8,
                paddingLeft: 20,
              }}>
                <li>部门编码创建后不可修改</li>
                <li>删除部门前请确保没有子部门和员工</li>
                <li>禁用部门会影响相关员工的权限</li>
              </ul>
            </div>
          )}
        </Form>
      </Modal>

      {/* 添加CSS样式 */}
      <style jsx>{`
        .tree-node-actions {
          opacity: 0 !important;
          transition: opacity 0.2s;
        }

        .ant-tree-node-content-wrapper:hover .tree-node-actions {
          opacity: 1 !important;
        }
      `}</style>
    </PageContainer>
  );
};

export default DepartmentsPage;
