import { useState } from "react";
import {
  Modal,
  List,
  Card,
  Tag,
  Space,
  Spin,
  Empty,
  Input,
  Select,
  Tabs,
  Checkbox,
  Tree,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  ThunderboltOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
  permissionTemplateApi,
  PermissionTemplate as ApiPermissionTemplate,
} from "@/api/permission-template";
import { systemApi } from "@/api/system";

const { Search } = Input;

interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  menuIds: string[];
  buttonIds: string[];
  color: string;
}

interface PermissionTemplateModalProps {
  open: boolean;
  onCancel: () => void;
  onSelect: (template: PermissionTemplate) => void;
  roleId?: string;
}

export const PermissionTemplateModal = ({
  open,
  onCancel,
  onSelect,
  roleId,
}: PermissionTemplateModalProps) => {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>();
  const [selectedTemplate, setSelectedTemplate] =
    useState<ApiPermissionTemplate | null>(null);
  const [partialApply, setPartialApply] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // 获取模板列表
  const { data: templates = [], isLoading } = useQuery({
    queryKey: [
      "permission-templates",
      { keyword: searchKeyword, category: selectedCategory },
    ],
    queryFn: () =>
      permissionTemplateApi.getTemplateList({
        keyword: searchKeyword,
        category: selectedCategory,
      }),
    enabled: open,
  });

  // 获取菜单和按钮数据（用于部分套用）
  const { data: menus = [] } = useQuery({
    queryKey: ["system-menus"],
    queryFn: systemApi.listMenus,
    enabled: open && partialApply,
  });

  const { data: buttons = [] } = useQuery({
    queryKey: ["system-buttons"],
    queryFn: systemApi.listButtons,
    enabled: open && partialApply,
  });

  // 获取分类列表
  const categories = Array.from(
    new Set(templates.map((t) => t.category).filter(Boolean)),
  );

  // 模板颜色映射
  const getTemplateColor = (template: ApiPermissionTemplate) => {
    if (template.is_default === 1) return "red";
    if (template.template_type === "system") return "blue";
    return "green";
  };

  // 转换API模板为组件模板格式
  const convertTemplate = (
    apiTemplate: ApiPermissionTemplate,
  ): PermissionTemplate => {
    return {
      id: apiTemplate.id,
      name: apiTemplate.template_name,
      description: apiTemplate.description || "",
      menuIds: apiTemplate.permission_config.menuIds || [],
      buttonIds: apiTemplate.permission_config.buttonIds || [],
      color: getTemplateColor(apiTemplate),
    };
  };

  // 构建权限树（用于部分套用）
  const buildPermissionTree = () => {
    if (!selectedTemplate) return [];

    const config = selectedTemplate.permission_config;
    const menuIds = config.menuIds || [];
    const buttonIds = config.buttonIds || [];

    return menus
      .filter((m: any) => menuIds.includes(m.id))
      .map((menu: any) => ({
        key: menu.id,
        title: menu.menu_name,
        children: buttons
          .filter((b: any) => b.menu_id === menu.id && buttonIds.includes(b.id))
          .map((button: any) => ({
            key: button.id,
            title: button.button_name,
          })),
      }));
  };

  const handleSelectTemplate = (template: ApiPermissionTemplate) => {
    if (partialApply) {
      setSelectedTemplate(template);
    } else {
      onSelect(convertTemplate(template));
      onCancel();
    }
  };

  const handleConfirmPartialApply = () => {
    if (!selectedTemplate) {
      message.warning("请选择模板");
      return;
    }

    if (selectedPermissions.length === 0) {
      message.warning("请选择要应用的权限");
      return;
    }

    const config = selectedTemplate.permission_config;
    onSelect({
      id: selectedTemplate.id,
      name: selectedTemplate.template_name,
      description: selectedTemplate.description || "",
      menuIds: (config.menuIds || []).filter((id) =>
        selectedPermissions.includes(id),
      ),
      buttonIds: (config.buttonIds || []).filter((id) =>
        selectedPermissions.includes(id),
      ),
      color: getTemplateColor(selectedTemplate),
    });
    onCancel();
  };

  return (
    <Modal
      open={open}
      title={
        <Space>
          <ThunderboltOutlined />
          选择权限模板
        </Space>
      }
      onCancel={() => {
        onCancel();
        setSelectedTemplate(null);
        setPartialApply(false);
        setSelectedPermissions([]);
      }}
      footer={null}
      width={900}
    >
      <Tabs
        items={[
          {
            key: "select",
            label: "选择模板",
            children: (
              <Space
                direction="vertical"
                style={{ width: "100%" }}
                size="middle"
              >
                <Space style={{ width: "100%" }}>
                  <Search
                    placeholder="搜索模板名称或描述"
                    allowClear
                    prefix={<SearchOutlined />}
                    style={{ width: 300 }}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                  <Select
                    placeholder="选择分类"
                    allowClear
                    style={{ width: 200 }}
                    onChange={setSelectedCategory}
                    options={categories.map((cat) => ({
                      label: cat,
                      value: cat,
                    }))}
                  />
                  <Checkbox
                    checked={partialApply}
                    onChange={(e) => setPartialApply(e.target.checked)}
                  >
                    部分套用
                  </Checkbox>
                </Space>

                {isLoading ? (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <Spin />
                  </div>
                ) : templates.length === 0 ? (
                  <Empty description="暂无模板" />
                ) : (
                  <List
                    grid={{ gutter: 16, column: 2 }}
                    dataSource={templates}
                    style={{ maxHeight: 500, overflow: "auto" }}
                    renderItem={(template) => (
                      <List.Item>
                        <Card
                          hoverable
                          onClick={() => handleSelectTemplate(template)}
                          style={{
                            borderColor:
                              selectedTemplate?.id === template.id
                                ? "#1890ff"
                                : undefined,
                          }}
                        >
                          <Space direction="vertical" style={{ width: "100%" }}>
                            <Space>
                              <Tag color={getTemplateColor(template)}>
                                {template.template_name}
                              </Tag>
                              {template.is_default === 1 && (
                                <Tag color="gold">系统默认</Tag>
                              )}
                              {selectedTemplate?.id === template.id && (
                                <CheckCircleOutlined
                                  style={{ color: "#52c41a" }}
                                />
                              )}
                            </Space>
                            <div style={{ fontSize: 12, color: "#666" }}>
                              {template.description || "暂无描述"}
                            </div>
                            <Space size="small">
                              <Tag color="blue">
                                {template.permission_config.type === "all"
                                  ? "全部"
                                  : template.permission_config.menuIds
                                      ?.length || 0}{" "}
                                菜单
                              </Tag>
                              <Tag color="green">
                                {template.permission_config.type === "all"
                                  ? "全部"
                                  : template.permission_config.buttonIds
                                      ?.length || 0}{" "}
                                按钮
                              </Tag>
                            </Space>
                          </Space>
                        </Card>
                      </List.Item>
                    )}
                  />
                )}
              </Space>
            ),
          },
          ...(partialApply && selectedTemplate
            ? [
                {
                  key: "partial",
                  label: "选择权限",
                  children: (
                    <Space
                      direction="vertical"
                      style={{ width: "100%" }}
                      size="middle"
                    >
                      <div>
                        <strong>模板：</strong>
                        {selectedTemplate.template_name}
                      </div>
                      <Card
                        size="small"
                        style={{ maxHeight: 400, overflow: "auto" }}
                      >
                        <Tree
                          checkable
                          checkedKeys={selectedPermissions}
                          onCheck={(checked: any) =>
                            setSelectedPermissions(checked)
                          }
                          treeData={buildPermissionTree()}
                        />
                      </Card>
                      <div style={{ textAlign: "right" }}>
                        <Space>
                          <span style={{ color: "#999" }}>
                            已选择 {selectedPermissions.length} 项权限
                          </span>
                          <button
                            className="ant-btn ant-btn-primary"
                            onClick={handleConfirmPartialApply}
                          >
                            确认应用
                          </button>
                        </Space>
                      </div>
                    </Space>
                  ),
                },
              ]
            : []),
        ]}
      />
    </Modal>
  );
};
