import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProColumns } from "@ant-design/pro-components";
import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Tabs,
  Typography,
  Tag,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { systemApi } from "@/api/system";
import type {
  ShopRecord,
  PlatformRecord,
  DepartmentRecord,
} from "@/api/system";
import { BaseModal } from "@/components/common/BaseModal";
import { BaseTable } from "@/components/table/BaseTable";
import { ActionGroup } from "@/components/common/ActionGroup";
import { Permission } from "@/components/permission/Permission";
import { ShopSortList } from "./components/ShopSortList";

const { Text } = Typography;

export default function SystemShopsPage() {
  const [activeTab, setActiveTab] = useState("list");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ShopRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortPlatformId, setSortPlatformId] = useState<string>();
  const [sortDepartmentId, setSortDepartmentId] = useState<string>();
  const [filterForm] = Form.useForm();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 1. 数据查询
  const { data: platforms = [] } = useQuery<PlatformRecord[]>({
    queryKey: ["system-platforms"],
    queryFn: async () => {
      const res = await systemApi.listPlatforms();
      return Array.isArray(res) ? res : [];
    },
  });

  const { data: departments = [] } = useQuery<DepartmentRecord[]>({
    queryKey: ["system-departments"],
    queryFn: async () => {
      const res = await systemApi.listDepartments();
      return Array.isArray(res) ? res : [];
    },
  });

  const { data: shops = [], isLoading } = useQuery<ShopRecord[]>({
    queryKey: ["system-shops"],
    queryFn: async () => {
      const res = await systemApi.listShops();
      return Array.isArray(res) ? res : [];
    },
  });

  // 筛选用于排序的店铺
  const filteredShopsForSort = useMemo(() => {
    return shops.filter((shop) => {
      if (sortPlatformId && shop.platform_id !== sortPlatformId) return false;
      if (sortDepartmentId && shop.department_id !== sortDepartmentId)
        return false;
      return true;
    });
  }, [shops, sortPlatformId, sortDepartmentId]);

  const refresh = async () => {
    setSelectedIds([]);
    await queryClient.invalidateQueries({ queryKey: ["system-shops"] });
  };

  const handleSaveSort = async (items: Array<{ id: string; sort: number }>) => {
    await systemApi.updateShopSort(items);
    await refresh();
  };

  // 2. 变更操作
  const createMutation = useMutation({
    mutationFn: systemApi.createShop,
    onSuccess: () => {
      setOpen(false);
      form.resetFields();
      refresh();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      systemApi.updateShop(id, payload),
    onSuccess: () => {
      setOpen(false);
      setEditing(null);
      form.resetFields();
      refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: systemApi.deleteShop,
    onSuccess: refresh,
  });

  const batchStatusMutation = useMutation({
    mutationFn: systemApi.batchUpdateShopStatus,
    onSuccess: refresh,
  });

  // 3. 联动逻辑
  const selectedPlatform = Form.useWatch("platform_id", form);
  const filteredDepartments = useMemo(() => {
    if (!selectedPlatform) return departments;
    return departments.filter((d) => d.platform_id === selectedPlatform);
  }, [selectedPlatform, departments]);

  // 4. 表格列定义
  const columns: ProColumns<ShopRecord>[] = [
    {
      title: "店铺名称",
      dataIndex: "name",
      render: (text) => (
        <Text className="font-bold text-slate-900">{text}</Text>
      ),
    },
    {
      title: "店铺编码",
      dataIndex: "code",
      render: (text) => (
        <Text className="font-bold text-slate-600">{text}</Text>
      ),
    },
    {
      title: "类型",
      dataIndex: "type",
      render: (_, record) => {
        const type = record.type;
        return (
          <Tag
            color={type === 1 ? "processing" : "warning"}
            className="font-bold"
          >
            {type === 1 ? "线上" : "线下"}
          </Tag>
        );
      },
    },
    {
      title: "归属",
      dataIndex: "platform_id",
      render: (_, record) => {
        const pName = platforms.find((p) => p.id === record.platform_id)?.name;
        const dName = departments.find(
          (d) => d.id === record.department_id,
        )?.name;
        return (
          <Space direction="vertical" size={0}>
            <Text className="text-slate-500 text-xs">平台: {pName || "-"}</Text>
            <Text className="text-slate-900 font-bold">
              部门: {dName || "-"}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      render: (_, record) => {
        const status = record.status;
        return (
          <Tag
            color={status === 1 ? "success" : "error"}
            className="font-black border-2"
          >
            {status === 1 ? "启用" : "禁用"}
          </Tag>
        );
      },
    },
    {
      title: "操作",
      valueType: "option",
      width: 150,
      render: (_, record) => (
        <ActionGroup
          onEdit={() => {
            setEditing(record);
            form.setFieldsValue(record);
            setOpen(true);
          }}
          onDelete={() => deleteMutation.mutate(record.id)}
          editPermission="system:shop:update"
          deletePermission="system:shop:delete"
        />
      ),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "list",
            label: "店铺列表",
            children: (
              <>
                {/* 搜索筛选区 - 单行全铺满自适应布局 */}
                <Card bordered={false} className="shadow-sm">
                  <Form
                    form={filterForm}
                    layout="inline"
                    className="flex flex-wrap items-center gap-4"
                  >
                    <Form.Item
                      name="name"
                      className="flex-grow min-w-[200px] mb-0"
                    >
                      <Input
                        prefix={<SearchOutlined />}
                        placeholder="搜索店铺名称"
                        className="h-[44px]"
                      />
                    </Form.Item>
                    <Form.Item
                      name="platform_id"
                      className="flex-grow min-w-[180px] mb-0"
                    >
                      <Select
                        placeholder="所属平台"
                        className="h-[44px] w-full"
                        options={platforms.map((p) => ({
                          label: p.name,
                          value: p.id,
                        }))}
                        allowClear
                      />
                    </Form.Item>
                    <Form.Item name="status" className="min-w-[120px] mb-0">
                      <Select
                        placeholder="状态"
                        className="h-[44px] w-full"
                        options={[
                          { label: "启用", value: 1 },
                          { label: "禁用", value: 0 },
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
                        <Permission code="system:shop:batch-status">
                          <Button
                            disabled={selectedIds.length === 0}
                            onClick={() =>
                              batchStatusMutation.mutate({
                                ids: selectedIds,
                                status: 1,
                              })
                            }
                            className="h-[44px] font-bold"
                          >
                            批量启用
                          </Button>
                          <Button
                            disabled={selectedIds.length === 0}
                            onClick={() =>
                              batchStatusMutation.mutate({
                                ids: selectedIds,
                                status: 0,
                              })
                            }
                            className="h-[44px] font-bold"
                          >
                            批量禁用
                          </Button>
                        </Permission>
                        <Permission code="system:shop:create">
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setOpen(true)}
                            className="h-[44px] font-bold"
                          >
                            新增店铺
                          </Button>
                        </Permission>
                      </Space>
                    </Form.Item>
                  </Form>
                </Card>

                {/* 数据表格区 */}
                <Card bordered={false} className="shadow-sm">
                  <BaseTable<ShopRecord>
                    columns={columns}
                    dataSource={shops}
                    loading={isLoading}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    rowSelection={{
                      selectedRowKeys: selectedIds,
                      onChange: (keys: React.Key[]) =>
                        setSelectedIds(keys as string[]),
                    }}
                  />
                </Card>
              </>
            ),
          },
          {
            key: "sort",
            label: "店铺排序",
            children: (
              <ShopSortList
                shops={filteredShopsForSort}
                platforms={platforms}
                departments={departments}
                onSave={handleSaveSort}
                platformId={sortPlatformId}
                departmentId={sortDepartmentId}
                onPlatformChange={setSortPlatformId}
                onDepartmentChange={setSortDepartmentId}
              />
            ),
          },
        ]}
      />

      {/* 新增/编辑弹窗 */}
      <BaseModal
        open={open}
        title={editing ? "编辑店铺" : "新增店铺"}
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
          initialValues={{ status: 1, type: 1 }}
        >
          <Form.Item
            label="店铺名称"
            name="name"
            rules={[{ required: true, message: "请输入店铺名称" }]}
          >
            <Input
              placeholder="输入店铺全称"
              className="font-bold text-slate-900"
            />
          </Form.Item>
          <Form.Item
            label="店铺编码"
            name="code"
            rules={[{ required: !editing, message: "请输入唯一编码" }]}
          >
            <Input disabled={!!editing} placeholder="一经创建不可修改" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="所属平台"
              name="platform_id"
              rules={[{ required: true }]}
            >
              <Select
                options={platforms.map((p) => ({ label: p.name, value: p.id }))}
              />
            </Form.Item>
            <Form.Item
              label="所属部门"
              name="department_id"
              rules={[{ required: true }]}
            >
              <Select
                options={filteredDepartments.map((d) => ({
                  label: d.name,
                  value: d.id,
                }))}
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="店铺类型" name="type">
              <Select
                options={[
                  { label: "线上 (Online)", value: 1 },
                  { label: "线下 (Offline)", value: 2 },
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

          <Form.Item label="联系电话" name="phone">
            <Input />
          </Form.Item>
          <Form.Item label="详细地址" name="address">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="描述信息" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </BaseModal>
    </div>
  );
}
