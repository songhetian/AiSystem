import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Form, Space } from "antd";
import { systemApi } from "@/api/system";
import { Permission } from "@/components/permission/Permission";
import { BaseTable } from "@/components/table/BaseTable";
import { useSystemCrud } from "../users/hooks/useSystemCrud";
import { getRoleColumns } from "./components/columns";
import { RoleModal } from "./components/RoleModal";

export default function SystemRolesPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const { data = [], isLoading } = useQuery({ queryKey: ["system-roles"], queryFn: systemApi.listRoles });
  
  const crud = useSystemCrud(["system-roles"], {
    create: systemApi.createRole,
    update: systemApi.updateRole,
    delete: systemApi.deleteRole,
  });

  return (
    <Card title="角色管理" extra={
      <Permission code="system:role:create">
        <Button type="primary" onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>新增角色</Button>
      </Permission>
    }>
      <BaseTable rowKey="id" columns={getRoleColumns(
        (rec) => { setEditing(rec); form.setFieldsValue(rec); setOpen(true); },
        crud.remove
      )} dataSource={data} loading={isLoading} />
      
      <RoleModal open={open} editing={editing} form={form} onCancel={() => setOpen(false)} onOk={() => form.submit()} />
    </Card>
  );
}
