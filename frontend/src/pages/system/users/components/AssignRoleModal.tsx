import { Form, Select, type FormInstance } from "antd";
import { BaseModal } from "@/components/common/BaseModal";

interface AssignRoleModalProps {
  open: boolean;
  form: FormInstance;
  roles: any[];
  onCancel: () => void;
  onOk: () => void;
}

export const AssignRoleModal = ({ open, form, roles, onCancel, onOk }: AssignRoleModalProps) => (
  <BaseModal open={open} title="分配角色" onCancel={onCancel} onOk={onOk}>
    <Form form={form} layout="vertical" onFinish={onOk}>
      <Form.Item label="角色" name="role_ids">
        <Select
          mode="multiple"
          options={roles.map((item) => ({ label: item.role_name, value: item.id }))}
        />
      </Form.Item>
    </Form>
  </BaseModal>
);
