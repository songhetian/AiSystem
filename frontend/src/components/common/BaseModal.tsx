import type { ReactNode } from 'react';
import { Modal } from 'antd';

interface BaseModalProps {
  open: boolean;
  title: ReactNode;
  onOk: () => void;
  onCancel: () => void;
  children: ReactNode;
  confirmLoading?: boolean;
  width?: number | string;
}

export function BaseModal({ open, title, onOk, onCancel, children, confirmLoading, width = 640 }: BaseModalProps) {
  return (
    <Modal open={open} title={title} onOk={onOk} onCancel={onCancel} confirmLoading={confirmLoading} width={width}>
      {children}
    </Modal>
  );
}

export default BaseModal;
