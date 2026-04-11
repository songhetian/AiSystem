import { Form, Input, Select, type FormInstance } from "antd";
import { BaseModal } from "@/components/common/BaseModal";

interface UserModalProps {
  open: boolean;
  editing: any;
  form: FormInstance;
  onCancel: () => void;
  onOk: () => void;
}

export const UserModal = ({ open, editing, form, onCancel, onOk }: UserModalProps) => (
  <BaseModal open={open} title={editing ? "编辑用户" : "新增用户"} onCancel={onCancel} onOk={onOk}>
    <Form form={form} layout="vertical" onFinish={onOk}>
      <Form.Item label="用户名" name="username" rules={[{ required: !editing }]}>
        <Input disabled={!!editing} />
      </Form.Item>
      <Form.Item label="姓名" name="name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item label="手机号" name="phone"><Input /></Form.Item>
      <Form.Item label="邮箱" name="email"><Input /></Form.Item>
      {!editing && (
        <Form.Item label="密码" name="password" rules={[{ required: true, min: 6 }]}>
          <Input.Password />
        </Form.Item>
      )}
      <Form.Item label="状态" name="status" initialValue={1}>
        <Select options={[{ label: "启用", value: 1 }, { label: "禁用", value: 0 }]} />
      </Form.Item>
    </Form>
  </BaseModal>
);
