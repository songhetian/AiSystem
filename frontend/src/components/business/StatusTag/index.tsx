/**
 * StatusTag组件 - 状态标签
 * 用于显示各种业务状态，支持预定义状态和自定义状态
 */

import React from 'react';
import classNames from 'classnames';
import { StatusTagProps, STATUS_CONFIG } from './types';
import styles from './index.module.less';

export const StatusTag: React.FC<StatusTagProps> = ({
  status,
  text,
  showDot = true,
  size = 'default',
  className,
  style,
}) => {
  const config = STATUS_CONFIG[status];
  const displayText = text || config.text;
  const colorClass = config.color;

  const tagClass = classNames(
    styles.statusTag,
    styles[`color-${colorClass}`],
    styles[`size-${size}`],
    {
      [styles.withDot]: showDot,
    },
    className
  );

  return (
    <span className={tagClass} style={style}>
      {showDot && <span className={styles.dot} />}
      <span className={styles.text}>{displayText}</span>
    </span>
  );
};

export default StatusTag;
