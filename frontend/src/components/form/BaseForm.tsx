import type { ReactNode } from 'react';
import { Form } from 'antd';

interface BaseFormProps {
  children: ReactNode;
}

export function BaseForm({ children }: BaseFormProps) {
  return (
    <Form layout="vertical" labelCol={{ span: 24 }}>
      {children}
    </Form>
  );
}

export default BaseForm;
