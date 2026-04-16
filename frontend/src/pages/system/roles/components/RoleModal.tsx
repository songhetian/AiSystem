import { useState, useEffect, useMemo } from "react";
import {
  Form,
  Input,
  Select,
  Tabs,
  Space,
  Button,
  Tree,
  Input as AntInput,
  Tag,
  type FormInstance,
  Card,
} from "antd";
import type { DataNode } from "antd/es/tree";
import { useQuery } from "@tanstack/react-query";
import {
  CheckOutlined,
  CloseOutlined,
  ThunderboltOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { BaseModal } from "@/components/common/BaseModal";
import { systemApi } from "@/api/system";
import { PermissionTemplateModal } from "./PermissionTemplates";
import { PermissionDragAssign } from "./PermissionDragAssign";

const { Search } = AntInput;

interface RoleModalProps {
  open: boolean;
  editing: any;
  form: FormInstance;
  onCancel: () => void;
  onOk: (data: any) => void;
}

// 菜单分组配置
const MENU_GROUPS: Record<string, { label: string; color: string }> = {
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
  const [expandedMenuKeys, setExpandedMenuKeys] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [autoExpandParent, setAutoExpandParent] = useState(true);

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

  // 构建菜单树
  const buildMenuTree = (menus: any[]): DataNode[] => {
    const menuMap = new Map<string, any>();
    menus.forEach((menu) => {
      const module = menu.menu_code?.split(":")[0] || "other";
      const moduleConfig = MENU_GROUPS[module] || {
        label: "其他",
        color: "default",
      };

      menuMap.set(menu.id, {
        key: menu.id,
        title: (
          <Space>
            <span>{menu.menu_name}</span>
            <Tag color={moduleConfig.color}>{menu.menu_code}</Tag>
          </Space>
        ),
        children: [],
        ...menu,
      });
    });

    const tree: DataNode[] = [];
    menus.forEach((menu) => {
      const node = menuMap.get(menu.id);
      if (menu.parent_id && menuMap.has(menu.parent_id)) {
        const parent = menuMap.get(menu.parent_id);
        parent.children.push(node);
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

  const menuTreeData = useMemo(() => buildMenuTree(menus), [menus]);
  const groupedButtons = groupButtonsByMenu(buttons);

  // 获取所有菜单ID（用于全选）
  const getAllMenuKeys = (treeData: DataNode[]): string[] => {
    const keys: string[] = [];
    const traverse = (nodes: DataNode[]) => {
      nodes.forEach((node) => {
        keys.push(node.key as string);
        if (node.children) traverse(node.children);
      });
    };
    traverse(treeData);
    return keys;
  };

  // 搜索过滤
  const getParentKey = (key: string, tree: DataNode[]): string | undefined => {
    let parentKey: string | undefined;
    for (let i = 0; i < tree.length; i++) {
      const node = tree[i];
      if (node.children) {
        if (node.children.some((item) => item.key === key)) {
          parentKey = node.key as string;
        } else {
          const result = getParentKey(key, node.children);
          if (result) {
            parentKey = result;
          }
        }
      }
    }
    return parentKey;
  };

  // 搜索时自动展开
  useEffect(() => {
    if (searchValue) {
      const expandedKeys: string[] = [];
      const traverse = (nodes: DataNode[]) => {
        nodes.forEach((node) => {
          const menu = menus.find((m: any) => m.id === node.key);
          if (
            menu &&
            (menu.menu_name
              ?.toLowerCase()
              .includes(searchValue.toLowerCase()) ||
              menu.menu_code?.toLowerCase().includes(searchValue.toLowerCase()))
          ) {
            const parentKey = getParentKey(node.key as string, menuTreeData);
            if (parentKey) expandedKeys.push(parentKey);
          }
          if (node.children) traverse(node.children);
        });
      };
      traverse(menuTreeData);
      setExpandedMenuKeys(expandedKeys);
      setAutoExpandParent(true);
    } else {
      setExpandedMenuKeys([]);
      setAutoExpandParent(false);
    }
  }, [searchValue, menuTreeData, menus]);

  // 批量操作
  const handleSelectAll = () => {
    const allMenuKeys = getAllMenuKeys(menuTreeData);
    setCheckedMenuKeys(allMenuKeys);
    setCheckedButtonKeys(buttons.map((b: any) => b.id));
  };

  const handleClearAll = () => {
    setCheckedMenuKeys([]);
    setCheckedButtonKeys([]);
  };

  // 应用权限模板
  const handleApplyTemplate = (template: any) => {
    setCheckedMenuKeys(template.menuIds || []);
    setCheckedButtonKeys(template.buttonIds || []);
    message.success(`已应用模板：${template.name}`);
  };

  // 菜单勾选变化
  const handleMenuCheck = (
    checked: { checked: string[]; halfChecked: string[] } | string[],
  ) => {
    const checkedKeys = Array.isArray(checked) ? checked : checked.checked;
    setCheckedMenuKeys(checkedKeys);

    // 自动勾选对应的按钮
    const relatedButtonIds = buttons
      .filter((b: any) => checkedKeys.includes(b.menu_id))
      .map((b: any) => b.id);
    setCheckedButtonKeys(relatedButtonIds);
  };

  // 按钮树数据
  const buildButtonTree = (): DataNode[] => {
    return menus
      .filter((m: any) => groupedButtons[m.id]?.length > 0)
      .map((menu: any) => ({
        key: menu.id,
        title: (
          <Space>
            <span>{menu.menu_name}</span>
            <Tag>
              {
                groupedButtons[menu.id].filter((b: any) =>
                  checkedButtonKeys.includes(b.id),
                ).length
              }
              /{groupedButtons[menu.id].length}
            </Tag>
          </Space>
        ),
        selectable: false,
        children: groupedButtons[menu.id].map((button: any) => ({
          key: button.id,
          title: (
            <Space>
              <span>{button.button_name}</span>
              <Tag color="default">{button.button_code}</Tag>
            </Space>
          ),
        })),
      }));
  };

  const buttonTreeData = useMemo(
    () => buildButtonTree(),
    [menus, buttons, checkedButtonKeys],
  );

  const handleSubmit = async (values: any) => {
    const data = {
      ...values,
      menuIds: checkedMenuKeys,
      buttonIds: checkedButtonKeys,
    };
    await onOk(data);
  };

  return (
    <BaseModal
      open={open}
      title={editing ? "编辑角色" : "新增角色"}
      onCancel={onCancel}
      onOk={() => form.submit()}
      width={1000}
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
          tab={
            <span>
              菜单权限{" "}
              <Tag color="blue">
                {checkedMenuKeys.length}/{getAllMenuKeys(menuTreeData).length}
              </Tag>
            </span>
          }
          key="menus"
        >
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Card size="small">
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
                  prefix={<SearchOutlined />}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
              </Space>
            </Card>

            <Card
              size="small"
              style={{ maxHeight: 500, overflow: "auto" }}
              bodyStyle={{ padding: 12 }}
            >
              <Tree
                checkable
                selectable={false}
                checkedKeys={checkedMenuKeys}
                expandedKeys={expandedMenuKeys}
                autoExpandParent={autoExpandParent}
                onExpand={(keys) => {
                  setExpandedMenuKeys(keys as string[]);
                  setAutoExpandParent(false);
                }}
                onCheck={handleMenuCheck}
                treeData={menuTreeData}
                height={450}
                virtual
              />
            </Card>

            <Card size="small" type="inner">
              <Space direction="vertical" size="small">
                <Tag color="blue">提示</Tag>
                <div style={{ fontSize: 12, color: "#666" }}>
                  • 勾选菜单后，该菜单下的所有按钮权限将自动勾选
                  <br />
                  • 支持父子节点联动，勾选父节点将自动勾选所有子节点
                  <br />• 使用搜索功能可快速定位需要的菜单
                </div>
              </Space>
            </Card>
          </Space>
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={
            <span>
              按钮权限{" "}
              <Tag color="green">
                {checkedButtonKeys.length}/{buttons.length}
              </Tag>
            </span>
          }
          key="buttons"
        >
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Card size="small">
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
            </Card>

            <Card
              size="small"
              style={{ maxHeight: 500, overflow: "auto" }}
              bodyStyle={{ padding: 12 }}
            >
              <Tree
                checkable
                selectable={false}
                checkedKeys={checkedButtonKeys}
                onCheck={(checked) => {
                  const checkedKeys = Array.isArray(checked)
                    ? checked
                    : checked.checked;
                  setCheckedButtonKeys(checkedKeys);
                }}
                treeData={buttonTreeData}
                height={450}
                virtual
                defaultExpandAll
              />
            </Card>

            <Card size="small" type="inner">
              <Space direction="vertical" size="small">
                <Tag color="green">提示</Tag>
                <div style={{ fontSize: 12, color: "#666" }}>
                  • 按钮权限按菜单分组展示
                  <br />
                  • 勾选菜单权限时，对应的按钮权限会自动勾选
                  <br />• 您也可以单独调整某个菜单下的按钮权限
                </div>
              </Space>
            </Card>
          </Space>
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={
            <span>
              拖拽分配 <Tag color="purple">快捷</Tag>
            </span>
          }
          key="drag"
        >
          {editing?.id && (
            <PermissionDragAssign
              roleId={editing.id}
              onSave={async (permissionIds) => {
                // 保存权限分配
                await systemApi.assignRolePermissions({
                  roleId: editing.id,
                  menuIds: permissionIds.filter((id) =>
                    menus.some((m: any) => m.id === id),
                  ),
                  buttonIds: permissionIds.filter((id) =>
                    buttons.some((b: any) => b.id === id),
                  ),
                });
                // 刷新权限数据
                window.location.reload();
              }}
            />
          )}
          {!editing?.id && (
            <Card>
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 0",
                  color: "#999",
                }}
              >
                请先保存角色基本信息后，再使用拖拽分配功能
              </div>
            </Card>
          )}
        </Tabs.TabPane>
      </Tabs>

      <PermissionTemplateModal
        open={templateModalOpen}
        onCancel={() => setTemplateModalOpen(false)}
        onSelect={handleApplyTemplate}
        roleId={editing?.id}
      />
    </BaseModal>
  );
};
