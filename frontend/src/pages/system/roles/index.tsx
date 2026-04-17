import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Form, Space, message } from "antd";
import { systemApi } from "@/api/system";
import { Permission } from "@/components/permission/Permission";
import { BaseTable } from "@/components/table/BaseTable";
import { useSystemCrud } from "../users/hooks/useSystemCrud";
import { getRoleColumns } from "./components/columns";
import { RoleModal } from "./components/RoleModal";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { GlobalLoading } from "@/components/common/GlobalLoading";

export default function SystemRolesPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  // 表单草稿保存
  const { clearDraft } = useFormDraft(form, "system-role-form", 30000);

  const { data = [], isLoading } = useQuery({
    queryKey: ["system-roles"],
    queryFn: systemApi.listRoles,
  });

  const crud = useSystemCrud(["system-roles"], {
    create: systemApi.createRole,
    update: systemApi.updateRole,
    delete: systemApi.deleteRole,
  });

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+n": () => {
      setEditing(null);
      form.resetFields();
      setOpen(true);
    },
    "Ctrl+r": () => {
      crud.refresh();
      message.success("已刷新");
    },
    Escape: () => setOpen(false),
  });

  return (
    <Card
      title="角色管理"
      extra={
        <Permission code="system:role:create">
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              setOpen(true);
            }}
          >
            新增角色
          </Button>
        </Permission>
      }
    >
      <GlobalLoading loading={isLoading}>
        <BaseTable
          rowKey="id"
          columns={getRoleColumns((rec) => {
            setEditing(rec);
            form.setFieldsValue(rec);
            setOpen(true);
          }, crud.remove)}
          dataSource={data}
          loading={isLoading}
        />
      </GlobalLoading>

      <RoleModal
        open={open}
        editing={editing}
        form={form}
        onCancel={() => {
          setOpen(false);
          clearDraft();
        }}
        onOk={() => form.submit()}
      />
    </Card>
  );
}
