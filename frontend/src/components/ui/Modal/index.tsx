/**
 * Modal组件 - 模态框
 * 基于Ant Design Modal封装，支持毛玻璃效果
 */

import React from 'react';
import { Modal as AntModal } from 'antd';
import classNames from 'classnames';
import { ModalProps } from './types';
import styles from './index.module.less';

export const Modal: React.FC<ModalProps> = ({
  visible,
  title,
  children,
  glass = true,
  width = 520,
  closable = true,
  mask = true,
  maskClosable = true,
  centered = true,
  footer,
  okText = '确定',
  cancelText = '取消',
  okType = 'primary',
  confirmLoading = false,
  onCancel,
  onOk,
  className,
  style,
  bodyStyle,
  ...restProps
}) => {
  const modalClass = classNames(
    styles.modal,
    {
      [styles.glass]: glass,
    },
    className
  );

  return (
    <AntModal
      open={visible}
      title={title}
      width={width}
      closable={closable}
      mask={mask}
      maskClosable={maskClosable}
      centered={centered}
      footer={footer}
      okText={okText}
      cancelText={cancelText}
      okType={okType}
      confirmLoading={confirmLoading}
      onCancel={onCancel}
      onOk={onOk}
      className={modalClass}
      style={style}
      bodyStyle={bodyStyle}
      {...restProps}
    >
      {children}
    </AntModal>
  );
};

export default Modal;
