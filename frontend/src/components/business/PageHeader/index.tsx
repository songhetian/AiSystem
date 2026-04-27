/**
 * PageHeader组件 - 页面头部
 * 提供统一的页面头部样式
 */

import React from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import { PageHeaderProps } from './types';
import styles from './index.module.less';

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subTitle,
  tags,
  extra,
  footer,
  showBack = false,
  onBack,
  glass = false,
  className,
  style,
}) => {
  const headerClass = classNames(
    styles.pageHeader,
    {
      [styles.glass]: glass,
    },
    className
  );

  return (
    <div className={headerClass} style={style}>
      <div className={styles.headerMain}>
        <div className={styles.headerLeft}>
          {showBack && (
            <div className={styles.backButton} onClick={onBack}>
              <ArrowLeftOutlined />
            </div>
          )}

          <div className={styles.headerContent}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{title}</h1>
              {tags && <div className={styles.tags}>{tags}</div>}
            </div>
            {subTitle && <div className={styles.subTitle}>{subTitle}</div>}
          </div>
        </div>

        {extra && <div className={styles.headerExtra}>{extra}</div>}
      </div>

      {footer && <div className={styles.headerFooter}>{footer}</div>}
    </div>
  );
};

export default PageHeader;
