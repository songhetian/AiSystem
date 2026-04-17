import { useState, useMemo, useCallback, useRef } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Upload,
  Checkbox,
  Tree,
  Row,
  Col,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ExportOutlined,
  ImportOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  permissionTemplateApi,
  PermissionTemplate,
} from "@/api/permission-template";
import { systemApi } from "@/api/system";
import { AdvancedSearch } from "@/components/common/AdvancedSearch";
import { useHotkeys } from "@/hooks/useHotkeys";
import { usePermissionTree } from "@/hooks/usePermissionTree";
import { HotkeyGuide } from "@/components/common/HotkeyGuide";
import { useTemplateModal } from "./hooks/useTemplateModal";
import { useTemplateOperations } from "./hooks/useTemplateOperations";
import { useDebounce } from "@/hooks/useDebounce";
import { GlobalLoading } from "@/components/common/GlobalLoading";
import "./index.less";

export default function PermissionTemplatePage() {
  const [searchForm] = Form.useForm();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<PermissionTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] =
    useState<PermissionTemplate | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useState<any>({});
  const debouncedSearchParams = useDebounce(searchParams, 500);
  const [partialApply, setPartialApply] = useState(false);
  const [checkedMenuKeys, setCheckedMenuKeys] = useState<string[]>([]);
  const [checkedButtonKeys, setCheckedButtonKeys] = useState<string[]>([]);
  const searchInputRef = useRef<any>(null);

  // 获取模板列表
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["permission-templates", debouncedSearchParams],
    queryFn: () => permissionTemplateApi.getTemplateList(debouncedSearchParams),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 获取菜单和按钮数据
  const { data: menus = [] } = useQuery({
    queryKey: ["system-menus"],
    queryFn: systemApi.listMenus,
  });

  const { data: buttons = [] } = useQuery({
    queryKey: ["system-buttons"],
    queryFn: systemApi.listButtons,
  });

  // 获取角色列表
  const { data: roles = [] } = useQuery({
    queryKey: ["system-roles"],
    queryFn: systemApi.listRoles,
  });

  // 创建模板
  const createMutation = useMutation({
    mutationFn: permissionTemplateApi.createTemplate,
    onSuccess: () => {
      message.success("创建成功");
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["permission-templates"] });
    },
    onError: () => {
      message.error("创建失败");
    },
  });

  // 更新模板
  const updateMutation = useMutation({
    mutationFn: permissionTemplateApi.updateTemplate,
    onSuccess: () => {
      message.success("更新成功");
      setModalOpen(false);
      form.resetFields();
      setEditingTemplate(null);
      queryClient.invalidateQueries({ queryKey: ["permission-templates"] });
    },
    onError: () => {
      message.error("更新失败");
    },
  });

  // 删除模板
  const deleteMutation = useMutation({
    mutationFn: permissionTemplateApi.deleteTemplate,
    onSuccess: () => {
      message.success("删除成功");
      queryClient.invalidateQueries({ queryKey: ["permission-templates"] });
    },
    onError: () => {
      message.error("删除失败");
    },
  });

  // 复制模板
  const copyMutation = useMutation({
    mutationFn: ({ id, newName }: { id: string; newName: string }) =>
      permissionTemplateApi.copyTemplate(id, newName),
    onSuccess: () => {
      message.success("复制成功");
      queryClient.invalidateQueries({ queryKey: ["permission-templates"] });
    },
    onError: () => {
      message.error("复制失败");
    },
  });

  // 应用模板
  const applyMutation = useMutation({
    mutationFn: permissionTemplateApi.applyTemplate,
    onSuccess: () => {
      message.success("应用成功");
      setApplyModalOpen(false);
      setSelectedTemplate(null);
    },
    onError: () => {
      message.error("应用失败");
    },
  });

  // 导出模板
  const exportMutation = useMutation({
    mutationFn: permissionTemplateApi.exportTemplates,
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `permission-templates-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success("导出成功");
      setExportModalOpen(false);
      setSelectedRowKeys([]);
    },
    onError: () => {
      message.error("导出失败");
    },
  });

  // 导入模板
  const importMutation = useMutation({
    mutationFn: permissionTemplateApi.importTemplates,
    onSuccess: (data: any) => {
      message.success(`导入完成：${data.results.length} 个模板`);
      setImportModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["permission-templates"] });
    },
    onError: () => {
      message.error("导入失败");
    },
  });

  // 快捷键
  useHotkeys(
    [
      {
        key: "n",
        ctrl: true,
        description: "新建模板",
        handler: () => {
          setEditingTemplate(null);
          setModalOpen(true);
        },
      },
    ],
    true,
  );

  // 构建菜单树
  const buildMenuTree = (menus: any[]) => {
    const menuMap = new Map();
    menus.forEach((menu) => {
      menuMap.set(menu.id, {
        key: menu.id,
        title: menu.menu_name,
        children: [],
      });
    });

    const tree: any[] = [];
    menus.forEach((menu) => {
      const node = menuMap.get(menu.id);
      if (menu.parent_id && menuMap.has(menu.parent_id)) {
        menuMap.get(menu.parent_id).children.push(node);
      } else {
        tree.push(node);
      }
    });

    return tree;
  };

  // 按菜单分组按钮
  const groupButtonsByMenu = (buttons: any[]) => {
    const grouped: Record<string, any[]> = {};
    buttons.forEach((button) => {
      if (!grouped[button.menu_id]) grouped[button.menu_id] = [];
      grouped[button.menu_id].push(button);
    });
    return grouped;
  };

  const menuTreeData = buildMenuTree(menus);
  const groupedButtons = groupButtonsByMenu(buttons);

  // 构建按钮树
  const buildButtonTree = () => {
    return menus
      .filter((m: any) => groupedButtons[m.id]?.length > 0)
      .map((menu: any) => ({
        key: menu.id,
        title: menu.menu_name,
        selectable: false,
        children: groupedButtons[menu.id].map((button: any) => ({
          key: button.id,
          title: button.button_name,
        })),
      }));
  };

  const buttonTreeData = buildButtonTree();

  const handleCreate = () => {
    setEditingTemplate(null);
    form.resetFields();
    setCheckedMenuKeys([]);
    setCheckedButtonKeys([]);
    setModalOpen(true);
  };

  const handleEdit = (record: PermissionTemplate) => {
    setEditingTemplate(record);
    form.setFieldsValue({
      templateName: record.template_name,
      templateType: record.template_type,
      description: record.description,
      category: record.category,
    });
    setCheckedMenuKeys(record.permission_config.menuIds || []);
    setCheckedButtonKeys(record.permission_config.buttonIds || []);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleCopy = (record: PermissionTemplate) => {
    Modal.confirm({
      title: "复制模板",
      content: (
        <Form>
          <Form.Item label="新模板名称">
            <Input
              id="newTemplateName"
              placeholder="请输入新模板名称"
              defaultValue={`${record.template_name} - 副本`}
            />
          </Form.Item>
        </Form>
      ),
      onOk: () => {
        const input = document.getElementById(
          "newTemplateName",
        ) as HTMLInputElement;
        const newName = input?.value || `${record.template_name} - 副本`;
        copyMutation.mutate({ id: record.id, newName });
      },
    });
  };

  const handleApply = (record: PermissionTemplate) => {
    setSelectedTemplate(record);
    setPartialApply(false);
    setApplyModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    const data = {
      ...values,
      permissionConfig: {
        type: "custom",
        menuIds: checkedMenuKeys,
        buttonIds: checkedButtonKeys,
      },
    };

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleExport = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("请选择要导出的模板");
      return;
    }
    setExportModalOpen(true);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        importMutation.mutate({
          templates: data.data || data,
          overwrite: 0,
        });
      } catch (error) {
        message.error("文件格式错误");
      }
    };
    reader.readAsText(file);
    return false;
  };

  const handleSearch = (values: any) => {
    setSearchParams(values);
  };

  const columns = [
    {
      title: "模板名称",
      dataIndex: "template_name",
      key: "template_name",
      width: 200,
    },
    {
      title: "类型",
      dataIndex: "template_type",
      key: "template_type",
      width: 100,
      render: (type: string) => (
        <Tag color={type === "system" ? "blue" : "green"}>
          {type === "system" ? "系统" : "自定义"}
        </Tag>
      ),
    },
    {
      title: "分类",
      dataIndex: "category",
      key: "category",
      width: 120,
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "权限数量",
      key: "permissions",
      width: 150,
      render: (_: any, record: PermissionTemplate) => (
        <Space>
          <Tag color="blue">
            {record.permission_config.type === "all"
              ? "全部"
              : record.permission_config.menuIds?.length || 0}{" "}
            菜单
          </Tag>
          <Tag color="green">
            {record.permission_config.type === "all"
              ? "全部"
              : record.permission_config.buttonIds?.length || 0}{" "}
            按钮
          </Tag>
        </Space>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "create_time",
      key: "create_time",
      width: 180,
    },
    {
      title: "操作",
      key: "action",
      width: 280,
      fixed: "right" as const,
      render: (_: any, record: PermissionTemplate) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={() => handleApply(record)}
          >
            应用
          </Button>
          <Button
            type="link"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleCopy(record)}
          >
            复制
          </Button>
          {record.is_default === 0 && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                编辑
              </Button>
              <Popconfirm
                title="确定删除此模板？"
                onConfirm={() => handleDelete(record.id)}
              >
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                >
                  删除
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="permission-template-page">
      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <div className="page-header">
            <Space>
              <h2>权限模板管理</h2>
              <HotkeyGuide />
            </Space>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreate}
              >
                新建模板 (Ctrl+N)
              </Button>
              <Button
                icon={<ExportOutlined />}
                onClick={handleExport}
                disabled={selectedRowKeys.length === 0}
              >
                导出
              </Button>
              <Upload
                accept=".json"
                showUploadList={false}
                beforeUpload={handleImport}
              >
                <Button icon={<ImportOutlined />}>导入</Button>
              </Upload>
            </Space>
          </div>

          <AdvancedSearch
            form={searchForm}
            onSearch={handleSearch}
            fields={[
              {
                name: "templateType",
                label: "模板类型",
                type: "select",
                options: [
                  { label: "系统模板", value: "system" },
                  { label: "自定义模板", value: "custom" },
                ],
              },
              {
                name: "category",
                label: "分类",
                type: "input",
              },
              {
                name: "keyword",
                label: "关键词",
                type: "input",
                placeholder: "搜索模板名称或描述",
              },
            ]}
          />

          <GlobalLoading loading={isLoading}>
            <Table
              rowKey="id"
              columns={columns}
              dataSource={templates}
              loading={isLoading}
              rowSelection={{
                selectedRowKeys,
                onChange: setSelectedRowKeys,
              }}
              scroll={{ x: 1200 }}
              pagination={{
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条`,
              }}
            />
          </GlobalLoading>
        </Space>
      </Card>

      {/* 创建/编辑模板 */}
      <Modal
        open={modalOpen}
        title={editingTemplate ? "编辑模板" : "新建模板"}
        onCancel={() => {
          setModalOpen(false);
          setEditingTemplate(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={1000}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="模板名称"
                name="templateName"
                rules={[{ required: true, message: "请输入模板名称" }]}
              >
                <Input placeholder="如：部门主管模板" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="模板类型"
                name="templateType"
                initialValue="custom"
                rules={[{ required: true }]}
              >
                <Select
                  disabled={!!editingTemplate}
                  options={[
                    { label: "系统模板", value: "system" },
                    { label: "自定义模板", value: "custom" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="分类" name="category">
                <Input placeholder="如：管理类、业务类" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="描述该模板的用途和权限范围" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="菜单权限">
                <Card size="small" style={{ maxHeight: 300, overflow: "auto" }}>
                  <Tree
                    checkable
                    checkedKeys={checkedMenuKeys}
                    onCheck={(checked: any) => setCheckedMenuKeys(checked)}
                    treeData={menuTreeData}
                  />
                </Card>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="按钮权限">
                <Card size="small" style={{ maxHeight: 300, overflow: "auto" }}>
                  <Tree
                    checkable
                    checkedKeys={checkedButtonKeys}
                    onCheck={(checked: any) => setCheckedButtonKeys(checked)}
                    treeData={buttonTreeData}
                  />
                </Card>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 应用模板 */}
      <Modal
        open={applyModalOpen}
        title="应用模板到角色"
        onCancel={() => {
          setApplyModalOpen(false);
          setSelectedTemplate(null);
        }}
        onOk={() => {
          const roleId = (
            document.getElementById("applyRoleSelect") as HTMLSelectElement
          )?.value;
          if (!roleId) {
            message.warning("请选择角色");
            return;
          }
          applyMutation.mutate({
            templateId: selectedTemplate!.id,
            roleId,
            partial: partialApply ? 1 : 0,
          });
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <strong>模板：</strong>
            {selectedTemplate?.template_name}
          </div>
          <Form.Item label="选择角色">
            <Select
              id="applyRoleSelect"
              placeholder="请选择要应用的角色"
              style={{ width: "100%" }}
              options={roles.map((role: any) => ({
                label: role.role_name,
                value: role.id,
              }))}
            />
          </Form.Item>
          <Checkbox
            checked={partialApply}
            onChange={(e) => setPartialApply(e.target.checked)}
          >
            部分套用（仅应用选中的权限）
          </Checkbox>
        </Space>
      </Modal>

      {/* 导出模板 */}
      <Modal
        open={exportModalOpen}
        title="导出模板"
        onCancel={() => setExportModalOpen(false)}
        onOk={() => {
          const encrypted = (
            document.getElementById("exportEncrypted") as HTMLInputElement
          )?.checked
            ? 1
            : 0;
          exportMutation.mutate({
            templateIds: selectedRowKeys,
            encrypted,
          });
        }}
      >
        <Space direction="vertical">
          <div>已选择 {selectedRowKeys.length} 个模板</div>
          <Checkbox id="exportEncrypted">加密导出</Checkbox>
        </Space>
      </Modal>
    </div>
  );
}
