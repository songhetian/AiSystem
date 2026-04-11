import React, { useState } from 'react';
import { Modal, Form, Button, Space, Spin } from 'antd';

interface LeixiModalFormProps {
  title: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onCancel?: () => void;
  onFinish: (values: any) => Promise<void>;
  initialValues?: any;
  children: React.ReactNode;
  width?: number | string;
  okText?: string;
}

const LeixiModalForm: React.FC<LeixiModalFormProps> = ({
  title,
  trigger,
  open: externalOpen,
  onCancel: externalCancel,
  onFinish,
  initialValues,
  children,
  width = 600,
  okText = '保存提交'
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;

  const handleCancel = () => {
    if (isControlled) {
      externalCancel?.();
    } else {
      setInternalOpen(false);
    }
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await onFinish(values);
      handleCancel();
    } catch (error) {
      console.error('Validate Failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {trigger && React.isValidElement(trigger) && 
        React.cloneElement(trigger as React.ReactElement, { 
          onClick: () => setInternalOpen(true) 
        })
      }
      
      <Modal
        title={<span className="text-xl font-black text-slate-900 tracking-tight">{title}</span>}
        open={open}
        onCancel={handleCancel}
        width={width}
        centered
        destroyOnClose
        className="leixi-modal"
        footer={[
          <div key="footer" className="px-6 pb-6 pt-2 flex justify-end space-x-4">
            <Button 
              onClick={handleCancel} 
              className="h-11 px-8 rounded-xl border-slate-200 font-bold text-slate-500"
            >
              取消返回
            </Button>
            <Button 
              type="primary" 
              loading={loading} 
              onClick={handleSubmit}
              className="h-11 px-10 rounded-xl bg-slate-900 border-none font-black shadow-lg shadow-slate-200"
            >
              {okText}
            </Button>
          </div>
        ]}
        styles={{
          mask: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(15, 23, 42, 0.3)' },
          content: { borderRadius: '32px', padding: 0, overflow: 'hidden' },
          header: { padding: '24px 24px 12px', marginBottom: 0, borderBottom: '1px solid #f1f5f9' },
          body: { padding: '24px' }
        }}
      >
        <Spin spinning={loading} tip="正在处理中...">
          <Form
            form={form}
            layout="vertical"
            initialValues={initialValues}
            requiredMark={false}
            className="leixi-form"
          >
            {children}
          </Form>
        </Spin>
      </Modal>
    </>
  );
};

export default LeixiModalForm;
