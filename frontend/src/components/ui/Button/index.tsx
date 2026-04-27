/**
 * Button组件 - 企业级按钮
 * 支持多种类型、尺寸、形状、加载状态
 */

import React from 'react';
import classNames from 'classnames';
import { LoadingOutlined } from '@ant-design/icons';
import { ButtonProps } from './types';
import styles from './index.module.less';

export const Button: React.FC<ButtonProps> = ({
  type = 'primary',
  size = 'base',
  shape = 'default',
  icon,
  children,
  disabled = false,
  loading = false,
  block = false,
  danger = false,
  htmlType = 'button',
  className,
  style,
  onClick,
}) => {
  const buttonClass = classNames(
    styles.button,
    styles[`button-${type}`],
    styles[`button-${size}`],
    styles[`button-${shape}`],
    {
      [styles.disabled]: disabled,
      [styles.loading]: loading,
      [styles.block]: block,
      [styles.danger]: danger,
      [styles.iconOnly]: icon && !children,
    },
    className
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      type={htmlType}
      className={buttonClass}
      style={style}
      disabled={disabled || loading}
      onClick={handleClick}
    >
      {loading && (
        <span className={styles.loadingIcon}>
          <LoadingOutlined spin />
        </span>
      )}
      {!loading && icon && <span className={styles.icon}>{icon}</span>}
      {children && <span className={styles.content}>{children}</span>}
    </button>
  );
};

export default Button;
