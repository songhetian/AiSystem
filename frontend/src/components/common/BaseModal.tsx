import type { ReactNode } from 'react';
import { Modal } from 'antd';

interface BaseModalProps {
  open: boolean;
  title: string;
  onOk: () => void;
  onCancel: () => void;
  children: ReactNode;
  confirmLoading?: boolean;
}

export function BaseModal({ open, title, onOk, onCancel, children, confirmLoading }: BaseModalProps) {
  return (
    <Modal open={open} title={title} onOk={onOk} onCancel={onCancel} confirmLoading={confirmLoading} width={640}>
      {children}
    </Modal>
  );
}
