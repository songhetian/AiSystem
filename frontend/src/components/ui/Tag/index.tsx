/**
 * Tag组件 - 标签
 * 支持多种颜色、尺寸、图标、可关闭
 */

import React from 'react';
import classNames from 'classnames';
import { CloseOutlined } from '@ant-design/icons';
import { TagProps } from './types';
import styles from './index.module.less';

export const Tag: React.FC<TagProps> = ({
  color = 'default',
  size = 'base',
  icon,
  children,
  closable = false,
  onClose,
  className,
  style,
  onClick,
}) => {
  const tagClass = classNames(
    styles.tag,
    styles[`tag-${color}`],
    styles[`tag-${size}`],
    {
      [styles.clickable]: onClick,
    },
    className
  );

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose?.();
  };

  return (
    <span className={tagClass} style={style} onClick={onClick}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.content}>{children}</span>
      {closable && (
        <span className={styles.closeIcon} onClick={handleClose}>
          <CloseOutlined />
        </span>
      )}
    </span>
  );
};

export default Tag;
