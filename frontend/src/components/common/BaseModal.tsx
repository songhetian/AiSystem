import type { ReactNode } from 'react';
import { Modal } from 'antd';

interface BaseModalProps {
  open: boolean;
  title: string;
  onOk: () => void;
  onCancel: () => void;
  children: ReactNode;
  confirmLoading?: boolean;
  width?: number;
}

export function BaseModal({ open, title, onOk, onCancel, children, confirmLoading, width = 640 }: BaseModalProps) {
  return (
    <Modal open={open} title={title} onOk={onOk} onCancel={onCancel} confirmLoading={confirmLoading} width={width}>
      {children}
    </Modal>
  );
}
