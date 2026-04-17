import { useState, useRef, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProColumns } from "@ant-design/pro-components";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tabs,
  Tag,
  message,
  Modal,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { personnelApi } from "@/api/personnel";
import { systemApi } from "@/api/system";
import { BaseModal } from "@/components/common/BaseModal";
import { BaseTable } from "@/components/table/BaseTable";
import { Permission } from "@/components/permission/Permission";
import { PositionDraggableList } from "./components/PositionDraggableList";
import { useDebounce, useFormDraft, useKeyboardShortcuts } from "@/hooks";
import { GlobalLoading } from "@/components/common";

interface PositionRecord {
  id: string;
  name: string;
  code: string;
  description?: string;
  department_id: string;
  department_name?: string;
  level?: number;
  sequence?: string;
  platform_id?: string;
  status: number;
  sort: number;
}

interface DepartmentRecord {
  id: string;
  name: string;
}

export default function PositionsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PositionRecord | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const [searchText, setSearchText] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<
    string | undefined
  >();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<any>(null);

  // 使用防抖优化搜索
  const debouncedSearchText = useDebounce(searchText, 500);

  // 使用表单草稿自动保存
  const { clearDraft } = useFormDraft(form, "position-form", 30000);

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

  const { data = [], isLoading } = useQuery<PositionRecord[]>({
    queryKey: ["personnel-positions"],
    queryFn: personnelApi.listPositions,
  });

  const { data: departments = [] } = useQuery<DepartmentRecord[]>({
    queryKey: ["system-department-options"],
    queryFn: systemApi.listDepartments,
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["personnel-positions"] });

  const createMutation = useMutation({
    mutationFn: personnelApi.createPosition,
    onSuccess: async () => {
      message.success("岗位创建成功");
      setOpen(false);
      form.resetFields();
      clearDraft();
      await refresh();
    },
    onError: () => {
      message.error("创建失败，请重试");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, unknown>;
    }) => personnelApi.updatePosition(id, payload),
    onSuccess: async () => {
      message.success("岗位更新成功");
      setOpen(false);
      setEditing(null);
      form.resetFields();
      clearDraft();
      await refresh();
    },
    onError: () => {
      message.error("更新失败，请重试");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: personnelApi.deletePosition,
    onSuccess: () => {
      message.success("岗位删除成功");
      refresh();
    },
    onError: () => {
      message.error("删除失败，请重试");
    },
  });

  const handleDelete = (id: string, name: string) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除岗位"${name}"吗？此操作不可恢复。`,
      okText: "确认删除",
      okType: "danger",
      cancelText: "取消",
      onOk: () => deleteMutation.mutate(id),
    });
  };

  // 过滤数据
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchSearch =
        !debouncedSearchText ||
        item.name?.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
        item.code?.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
        item.sequence
          ?.toLowerCase()
          .includes(debouncedSearchText.toLowerCase());

      const matchDepartment =
        !departmentFilter || item.department_id === departmentFilter;

      return matchSearch && matchDepartment;
    });
  }, [data, debouncedSearchText, departmentFilter]);

  const columns: ProColumns<PositionRecord>[] = [
    {
      title: "岗位名称",
      dataIndex: "name",
      render: (text) => <span className="font-semibold">{text}</span>,
    },
    {
      title: "岗位编码",
      dataIndex: "code",
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "所属部门",
      dataIndex: "department_name",
      render: (text) => text || "-",
    },
    {
      title: "岗位等级",
      dataIndex: "level",
      render: (level) => (level ? `L${level}` : "-"),
    },
    {
      title: "岗位序列",
      dataIndex: "sequence",
      render: (text) => text || "-",
    },
    {
      title: "描述",
      dataIndex: "description",
      render: (text) => text || "-",
      ellipsis: true,
    },
    {
      title: "操作",
      valueType: "option",
      width: 150,
      render: (_, record) => (
        <Space>
          <Permission code="personnel:position:update">
            <Button
              type="link"
              size="small"
              onClick={() => {
                setEditing(record);
                form.setFieldsValue(record);
                setOpen(true);
              }}
            >
              编辑
            </Button>
          </Permission>
          <Permission code="personnel:position:delete">
            <Button
              type="link"
              size="small"
              danger
              onClick={() => handleDelete(record.id, record.name)}
            >
              删除
            </Button>
          </Permission>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="岗位管理"
      extra={
        <Space>
          <Permission code="personnel:position:create">
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
              新增岗位
            </Button>
          </Permission>
        </Space>
      }
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab="岗位列表" key="list">
          <Space style={{ marginBottom: 16 }} wrap>
            <Input.Search
              ref={searchInputRef}
              placeholder="搜索岗位名称、编码、序列 (Ctrl+F)"
              allowClear
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
            />
            <Select
              placeholder="筛选部门"
              allowClear
              style={{ width: 200 }}
              value={departmentFilter}
              onChange={setDepartmentFilter}
              options={[
                { label: "全部部门", value: undefined },
                ...departments.map((dept) => ({
                  label: dept.name,
                  value: dept.id,
                })),
              ]}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setSearchText("");
                setDepartmentFilter(undefined);
                refresh();
              }}
              title="快捷键: Ctrl+R"
            >
              重置
            </Button>
            {filteredData.length !== data.length && (
              <Tag color="blue">
                显示 {filteredData.length} / {data.length} 条
              </Tag>
            )}
          </Space>

          <GlobalLoading loading={isLoading}>
            <BaseTable<PositionRecord>
              rowKey="id"
              columns={columns}
              dataSource={filteredData}
              loading={isLoading}
            />
          </GlobalLoading>
        </Tabs.TabPane>

        <Tabs.TabPane tab="岗位排序" key="sort">
          <PositionDraggableList positions={data} onUpdate={refresh} />
        </Tabs.TabPane>
      </Tabs>

      <BaseModal
        open={open}
        title={editing ? "编辑岗位" : "新增岗位"}
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
        >
          <Form.Item
            label="岗位名称"
            name="name"
            rules={[{ required: true, message: "请输入岗位名称" }]}
          >
            <Input placeholder="请输入岗位名称" />
          </Form.Item>
          <Form.Item
            label="岗位编码"
            name="code"
            rules={[
              { required: !editing, message: "请输入岗位编码" },
              {
                pattern: /^[A-Z0-9_-]+$/,
                message: "编码只能包含大写字母、数字、下划线和横线",
              },
            ]}
          >
            <Input
              disabled={Boolean(editing)}
              placeholder="例如: DEV_001"
              style={{ textTransform: "uppercase" }}
            />
          </Form.Item>
          <Form.Item
            label="所属部门"
            name="department_id"
            rules={[{ required: true, message: "请选择所属部门" }]}
          >
            <Select
              placeholder="请选择所属部门"
              options={departments.map((item) => ({
                label: item.name,
                value: item.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="岗位等级" name="level">
            <InputNumber
              style={{ width: "100%" }}
              min={1}
              max={10}
              placeholder="1-10"
            />
          </Form.Item>
          <Form.Item label="岗位序列" name="sequence">
            <Input placeholder="例如: 技术序列、管理序列" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="请输入岗位描述" />
          </Form.Item>
        </Form>
      </BaseModal>
    </Card>
  );
}
