import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Form, Space, Popconfirm, Tabs, message } from "antd";
import { systemApi } from "@/api/system";
import { Permission } from "@/components/permission/Permission";
import { BaseTable } from "@/components/table/BaseTable";
import { useSystemCrud } from "../users/hooks/useSystemCrud";
import { useMenuTree } from "./hooks/useMenuTree";
import { MenuModal } from "./components/MenuModal";
import { MenuTreeDraggable } from "./components/MenuTreeDraggable";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { GlobalLoading } from "@/components/common/GlobalLoading";

export default function SystemMenusPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("list");

  // 表单草稿保存
  const { clearDraft } = useFormDraft(form, "system-menu-form", 30000);

  const {
    data = [],
    isLoading,
    refetch,
  } = useQuery({ queryKey: ["system-menus"], queryFn: systemApi.listMenus });
  const treeData = useMenuTree(data);

  const crud = useSystemCrud(["system-menus"], {
    create: systemApi.createMenu,
    update: systemApi.updateMenu,
    delete: systemApi.deleteMenu,
  });

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+n": () => {
      setEditing(null);
      form.resetFields();
      setOpen(true);
    },
    "Ctrl+r": () => {
      refetch();
      message.success("已刷新");
    },
    Escape: () => setOpen(false),
  });

  const columns = [
    { title: "菜单名称", dataIndex: "menu_name" },
    { title: "菜单编码", dataIndex: "menu_code" },
    { title: "路由地址", dataIndex: "route" },
    {
      title: "操作",
      render: (_: any, record: any) => (
        <Space>
          <Permission code="system:menu:update">
            <Button
              type="link"
              onClick={() => {
                setEditing(record);
                form.setFieldsValue(record);
                setOpen(true);
              }}
            >
              编辑
            </Button>
          </Permission>
          <Permission code="system:menu:delete">
            <Popconfirm
              title="确认删除？"
              onConfirm={() => crud.remove(record.id)}
            >
              <Button type="link" danger>
                删除
              </Button>
            </Popconfirm>
          </Permission>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="菜单管理"
      extra={
        <Permission code="system:menu:create">
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              setOpen(true);
            }}
          >
            新增菜单
          </Button>
        </Permission>
      }
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab="菜单列表" key="list">
          <GlobalLoading loading={isLoading}>
            <BaseTable
              rowKey="id"
              columns={columns}
              dataSource={treeData}
              loading={isLoading}
              pagination={false}
            />
          </GlobalLoading>
        </Tabs.TabPane>
        <Tabs.TabPane tab="菜单排序" key="sort">
          <MenuTreeDraggable menus={data} onUpdate={refetch} />
        </Tabs.TabPane>
      </Tabs>

      <MenuModal
        open={open}
        editing={editing}
        form={form}
        menuOptions={data}
        onCancel={() => {
          setOpen(false);
          clearDraft();
        }}
        onOk={() => form.submit()}
      />
    </Card>
  );
}
