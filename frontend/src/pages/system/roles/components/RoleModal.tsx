import { Form, Input, Select, type FormInstance } from "antd";
import { BaseModal } from "@/components/common/BaseModal";

interface RoleModalProps {
  open: boolean;
  editing: any;
  form: FormInstance;
  onCancel: () => void;
  onOk: () => void;
}

export const RoleModal = ({ open, editing, form, onCancel, onOk }: RoleModalProps) => (
  <BaseModal open={open} title={editing ? "编辑角色" : "新增角色"} onCancel={onCancel} onOk={onOk}>
    <Form form={form} layout="vertical" onFinish={onOk}>
      <Form.Item label="角色名称" name="role_name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item label="角色编码" name="role_code" rules={[{ required: true }]}>
        <Input disabled={!!editing} />
      </Form.Item>
      <Form.Item label="描述" name="description">
        <Input.TextArea />
      </Form.Item>
      <Form.Item label="状态" name="status" initialValue={1}>
        <Select options={[{ label: "启用", value: 1 }, { label: "禁用", value: 0 }]} />
      </Form.Item>
    </Form>
  </BaseModal>
);
