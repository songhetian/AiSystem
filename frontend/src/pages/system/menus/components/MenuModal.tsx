import { Form, Input, Select, InputNumber, type FormInstance } from "antd";
import { BaseModal } from "@/components/common/BaseModal";

interface MenuModalProps {
  open: boolean;
  editing: any;
  form: FormInstance;
  menuOptions: any[];
  onCancel: () => void;
  onOk: () => void;
}

export const MenuModal = ({ open, editing, form, menuOptions, onCancel, onOk }: MenuModalProps) => (
  <BaseModal open={open} title={editing ? "编辑菜单" : "新增菜单"} onCancel={onCancel} onOk={onOk}>
    <Form form={form} layout="vertical" onFinish={onOk}>
      <Form.Item label="菜单名称" name="menu_name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item label="菜单编码" name="menu_code" rules={[{ required: true }]}>
        <Input disabled={!!editing} />
      </Form.Item>
      <Form.Item label="父级菜单" name="parent_id">
        <Select 
          allowClear 
          placeholder="顶级菜单" 
          options={menuOptions.map(m => ({ label: m.menu_name, value: m.id }))} 
        />
      </Form.Item>
      <Form.Item label="路由地址" name="route">
        <Input />
      </Form.Item>
      <Form.Item label="类型" name="type" initialValue={1}>
        <Select options={[{ label: "菜单", value: 1 }, { label: "目录", value: 2 }]} />
      </Form.Item>
      <Form.Item label="排序" name="sort" initialValue={0}>
        <InputNumber className="w-full" />
      </Form.Item>
    </Form>
  </BaseModal>
);
