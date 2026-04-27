/**
 * SectionCard组件 - 区块卡片
 * 用于页面内容分区，支持折叠功能
 */

import React, { useState } from 'react';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import { SectionCardProps } from './types';
import styles from './index.module.less';

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  description,
  extra,
  children,
  glass = false,
  collapsible = false,
  defaultCollapsed = false,
  divider = true,
  padding = 'base',
  className,
  style,
  headerStyle,
  bodyStyle,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const sectionClass = classNames(
    styles.sectionCard,
    {
      [styles.glass]: glass,
      [styles.collapsible]: collapsible,
      [styles.collapsed]: collapsed,
      [styles[`padding-${padding}`]]: padding !== 'none',
    },
    className
  );

  const hasHeader = title || description || extra;

  const handleToggle = () => {
    if (collapsible) {
      setCollapsed(!collapsed);
    }
  };

  return (
    <div className={sectionClass} style={style}>
      {hasHeader && (
        <div
          className={classNames(styles.sectionHeader, {
            [styles.divider]: divider && !collapsed,
          })}
          style={headerStyle}
          onClick={handleToggle}
        >
          <div className={styles.headerLeft}>
            <div className={styles.headerTitle}>
              {title && <h3 className={styles.title}>{title}</h3>}
              {description && <div className={styles.description}>{description}</div>}
            </div>
          </div>
          <div className={styles.headerRight}>
            {extra && <div className={styles.extra}>{extra}</div>}
            {collapsible && (
              <div className={styles.collapseIcon}>
                {collapsed ? <DownOutlined /> : <UpOutlined />}
              </div>
            )}
          </div>
        </div>
      )}

      {!collapsed && (
        <div className={styles.sectionBody} style={bodyStyle}>
          {children}
        </div>
      )}
    </div>
  );
};

export default SectionCard;
