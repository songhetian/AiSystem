/**
 * ActionBar组件 - 操作栏
 * 提供统一的操作按钮区域
 */

import React from 'react';
import { Button, Space } from 'antd';
import classNames from 'classnames';
import { ActionBarProps } from './types';
import styles from './index.module.less';

export const ActionBar: React.FC<ActionBarProps> = ({
  actions,
  extra,
  glass = false,
  align = 'left',
  className,
  style,
}) => {
  const actionBarClass = classNames(
    styles.actionBar,
    styles[`align-${align}`],
    {
      [styles.glass]: glass,
    },
    className
  );

  return (
    <div className={actionBarClass} style={style}>
      {extra && <div className={styles.extra}>{extra}</div>}

      <div className={styles.actions}>
        <Space>
          {actions.map((action) => (
            <Button
              key={action.key}
              type={action.type || 'default'}
              icon={action.icon}
              danger={action.danger}
              disabled={action.disabled}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </Space>
      </div>
    </div>
  );
};

export default ActionBar;
