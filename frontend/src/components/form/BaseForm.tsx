import type { ReactNode } from "react";
import { Form, Input, Select, TimePicker, InputNumber } from "antd";
import type { FormInstance } from "antd";

interface FormItemConfig {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: any }>;
  defaultValue?: any;
  props?: Record<string, any>;
}

interface BaseFormProps {
  children?: ReactNode;
  form?: FormInstance;
  layout?: "horizontal" | "vertical" | "inline";
  items?: FormItemConfig[];
}

export function BaseForm({
  children,
  form,
  layout = "vertical",
  items,
}: BaseFormProps) {
  // 如果提供了 items 配置，则自动渲染表单项
  if (items && items.length > 0) {
    return (
      <Form form={form} layout={layout} labelCol={{ span: 24 }}>
        {items.map((item) => {
          const {
            name,
            label,
            type,
            required,
            placeholder,
            options,
            defaultValue,
            props = {},
          } = item;

          let component: ReactNode;
          switch (type) {
            case "input":
              component = (
                <Input
                  placeholder={placeholder || `请输入${label}`}
                  {...props}
                />
              );
              break;
            case "select":
              component = (
                <Select
                  placeholder={placeholder || `请选择${label}`}
                  options={options}
                  {...props}
                >
                  {options?.map((opt) => (
                    <Select.Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Option>
                  ))}
                </Select>
              );
              break;
            case "time":
              component = <TimePicker format="HH:mm" {...props} />;
              break;
            case "number":
              component = <InputNumber {...props} />;
              break;
            default:
              component = (
                <Input
                  placeholder={placeholder || `请输入${label}`}
                  {...props}
                />
              );
          }

          return (
            <Form.Item
              key={name}
              name={name}
              label={label}
              rules={
                required ? [{ required: true, message: `请输入${label}` }] : []
              }
              initialValue={defaultValue}
            >
              {component}
            </Form.Item>
          );
        })}
      </Form>
    );
  }

  // 否则使用 children
  return (
    <Form form={form} layout={layout} labelCol={{ span: 24 }}>
      {children}
    </Form>
  );
}

export default BaseForm;
