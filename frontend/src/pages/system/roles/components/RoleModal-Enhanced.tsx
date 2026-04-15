import { useState, useEffect } from "react";
import {
  Form,
  Input,
  Select,
  Tabs,
  Space,
  Button,
  Checkbox,
  Input as AntInput,
  Collapse,
  Tag,
  type FormInstance,
} from "antd";
import { useQuery } from "@tanstack/react-query";
import {
  CheckOutlined,
  CloseOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { BaseModal } from "@/components/common/BaseModal";
import { systemApi } from "@/api/system";
import { PermissionTemplateModal } from "./PermissionTemplates";

const { Search } = AntInput;
const { Panel } = Collapse;

interface RoleModalProps {
  open: boolean;
  editing: any;
  form: FormInstance;
  onCancel: () => void;
  onOk: (data: any) => void;
}

// 菜单分组配置
const MENU_GROUPS = {
  system: { label: "系统管理", color: "blue" },
  personnel: { label: "人事管理", color: "green" },
  attendance: { label: "考勤管理", color: "orange" },
  approval: { label: "审批管理", color: "purple" },
  service: { label: "客服质检", color: "cyan" },
  knowledge: { label: "知识库", color: "geekblue" },
  shop: { label: "商品管理", color: "magenta" },
  finance: { label: "财务管理", color: "red" },
};

export const RoleModal = ({
  open,
  editing,
  form,
  onCancel,
  onOk,
}: RoleModalProps) => {
  const [activeTab, setActiveTab] = useState("basic");
  const [checkedMenuKeys, setCheckedMenuKeys] = useState<string[]>([]);
  const [checkedButtonKeys, setCheckedButtonKeys] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  // 获取菜单和按钮数据
  const { data: menus = [] } = useQuery({
    queryKey: ["system-menus"],
    queryFn: systemApi.listMenus,
    enabled: open,
  });

  const { data: buttons = [] } = useQuery({
    queryKey: ["system-buttons"],
    queryFn: systemApi.listButtons,
    enabled: open,
  });

  // 获取角色已有权限
  const { data: rolePermissions } = useQuery({
    queryKey: ["role-permissions", editing?.id],
    queryFn: () => systemApi.getRolePermissions(editing.id),
    enabled: open && !!editing?.id,
  });

  useEffect(() => {
    if (rolePermissions) {
      setCheckedMenuKeys(rolePermissions.menuIds || []);
      setCheckedButtonKeys(rolePermissions.buttonIds || []);
    } else {
      setCheckedMenuKeys([]);
      setCheckedButtonKeys([]);
    }
  }, [rolePermissions]);

  // 按模块分组菜单
  const groupMenusByModule = (menus: any[]) => {
    const grouped: Record<string, any[]> = {};
    menus.forEach((menu) => {
      const module = menu.menu_code?.split(":")[0] || "other";
      if (!grouped[module]) grouped[module] = [];
      grouped[module].push(menu);
    });
    return grouped;
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

  const groupedMenus = groupMenusByModule(menus);
  const groupedButtons = groupButtonsByMenu(buttons);

  // 批量操作
  const handleSelectAll = () => {
    setCheckedMenuKeys(menus.map((m: any) => m.id));
    setCheckedButtonKeys(buttons.map((b: any) => b.id));
  };

  const handleClearAll = () => {
    setCheckedMenuKeys([]);
    setCheckedButtonKeys([]);
  };

  const handleSelectModule = (module: string) => {
    const moduleMenus = groupedMenus[module] || [];
    const moduleMenuIds = moduleMenus.map((m) => m.id);
    const moduleButtonIds = buttons
      .filter((b: any) => moduleMenuIds.includes(b.menu_id))
      .map((b: any) => b.id);

    setCheckedMenuKeys([...new Set([...checkedMenuKeys, ...moduleMenuIds])]);
    setCheckedButtonKeys([
      ...new Set([...checkedButtonKeys, ...moduleButtonIds]),
    ]);
  };

  const handleClearModule = (module: string) => {
    const moduleMenus = groupedMenus[module] || [];
    const moduleMenuIds = moduleMenus.map((m) => m.id);
    const moduleButtonIds = buttons
      .filter((b: any) => moduleMenuIds.includes(b.menu_id))
      .map((b: any) => b.id);

    setCheckedMenuKeys(
      checkedMenuKeys.filter((id) => !moduleMenuIds.includes(id)),
    );
    setCheckedButtonKeys(
      checkedButtonKeys.filter((id) => !moduleButtonIds.includes(id)),
    );
  };

  // 应用权限模板
  const handleApplyTemplate = (template: any) => {
    if (template.id === "super_admin") {
      // 超级管理员：选择所有权限
      setCheckedMenuKeys(menus.map((m: any) => m.id));
      setCheckedButtonKeys(buttons.map((b: any) => b.id));
    } else {
      setCheckedMenuKeys(template.menuIds);
      setCheckedButtonKeys(template.buttonIds);
    }
  };

  const handleSubmit = async (values: any) => {
    const data = {
      ...values,
      menuIds: checkedMenuKeys,
      buttonIds: checkedButtonKeys,
    };
    await onOk(data);
  };

  // 过滤菜单
  const filteredMenus = (moduleMenus: any[]) => {
    if (!searchValue) return moduleMenus;
    return moduleMenus.filter(
      (menu) =>
        menu.menu_name?.toLowerCase().includes(searchValue.toLowerCase()) ||
        menu.menu_code?.toLowerCase().includes(searchValue.toLowerCase()),
    );
  };

  return (
    <BaseModal
      open={open}
      title={editing ? "编辑角色" : "新增角色"}
      onCancel={onCancel}
      onOk={() => form.submit()}
      width={900}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab="基本信息" key="basic">
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              label="角色名称"
              name="role_name"
              rules={[{ required: true, message: "请输入角色名称" }]}
            >
              <Input placeholder="如：部门主管" />
            </Form.Item>
            <Form.Item
              label="角色编码"
              name="role_code"
              rules={[{ required: true, message: "请输入角色编码" }]}
            >
              <Input disabled={!!editing} placeholder="如：dept_manager" />
            </Form.Item>
            <Form.Item label="描述" name="description">
              <Input.TextArea
                rows={3}
                placeholder="描述该角色的职责和权限范围"
              />
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
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={`菜单权限 (${checkedMenuKeys.length}/${menus.length})`}
          key="menus"
        >
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Space wrap>
              <Button
                size="small"
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={() => setTemplateModalOpen(true)}
              >
                使用模板
              </Button>
              <Button
                size="small"
                icon={<CheckOutlined />}
                onClick={handleSelectAll}
              >
                全选
              </Button>
              <Button
                size="small"
                icon={<CloseOutlined />}
                onClick={handleClearAll}
              >
                清空
              </Button>
              <Search
                placeholder="搜索菜单名称或编码"
                allowClear
                style={{ width: 250 }}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </Space>

            <Collapse defaultActiveKey={Object.keys(MENU_GROUPS)}>
              {Object.entries(MENU_GROUPS).map(([key, config]) => {
                const moduleMenus = groupedMenus[key] || [];
                const displayMenus = filteredMenus(moduleMenus);
                const checkedCount = moduleMenus.filter((m) =>
                  checkedMenuKeys.includes(m.id),
                ).length;

                if (searchValue && displayMenus.length === 0) return null;

                return (
                  <Panel
                    key={key}
                    header={
                      <Space>
                        <Tag color={config.color}>{config.label}</Tag>
                        <span>
                          {checkedCount}/{moduleMenus.length}
                        </span>
                      </Space>
                    }
                    extra={
                      <Space onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="small"
                          type="link"
                          onClick={() => handleSelectModule(key)}
                        >
                          全选
                        </Button>
                        <Button
                          size="small"
                          type="link"
                          onClick={() => handleClearModule(key)}
                        >
                          清空
                        </Button>
                      </Space>
                    }
                  >
                    <Checkbox.Group
                      value={checkedMenuKeys}
                      onChange={setCheckedMenuKeys as any}
                      style={{ width: "100%" }}
                    >
                      <Space direction="vertical" style={{ width: "100%" }}>
                        {displayMenus.map((menu) => (
                          <Checkbox key={menu.id} value={menu.id}>
                            {menu.menu_name}{" "}
                            <Tag color="default">{menu.menu_code}</Tag>
                          </Checkbox>
                        ))}
                      </Space>
                    </Checkbox.Group>
                  </Panel>
                );
              })}
            </Collapse>
          </Space>
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={`按钮权限 (${checkedButtonKeys.length}/${buttons.length})`}
          key="buttons"
        >
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Space wrap>
              <Button
                size="small"
                icon={<CheckOutlined />}
                onClick={handleSelectAll}
              >
                全选
              </Button>
              <Button
                size="small"
                icon={<CloseOutlined />}
                onClick={handleClearAll}
              >
                清空
              </Button>
            </Space>

            <Collapse>
              {menus
                .filter((m: any) => groupedButtons[m.id]?.length > 0)
                .map((menu: any) => {
                  const menuButtons = groupedButtons[menu.id] || [];
                  const checkedCount = menuButtons.filter((b) =>
                    checkedButtonKeys.includes(b.id),
                  ).length;

                  return (
                    <Panel
                      key={menu.id}
                      header={
                        <Space>
                          <span>{menu.menu_name}</span>
                          <span>
                            ({checkedCount}/{menuButtons.length})
                          </span>
                        </Space>
                      }
                    >
                      <Checkbox.Group
                        value={checkedButtonKeys}
                        onChange={setCheckedButtonKeys as any}
                        style={{ width: "100%" }}
                      >
                        <Space direction="vertical" style={{ width: "100%" }}>
                          {menuButtons.map((button) => (
                            <Checkbox key={button.id} value={button.id}>
                              {button.button_name}{" "}
                              <Tag color="default">{button.button_code}</Tag>
                            </Checkbox>
                          ))}
                        </Space>
                      </Checkbox.Group>
                    </Panel>
                  );
                })}
            </Collapse>
          </Space>
        </Tabs.TabPane>
      </Tabs>

      <PermissionTemplateModal
        open={templateModalOpen}
        onCancel={() => setTemplateModalOpen(false)}
        onSelect={handleApplyTemplate}
      />
    </BaseModal>
  );
};
