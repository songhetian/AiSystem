/**
 * PageContainer组件 - 页面容器
 * 提供统一的页面布局，包含标题、面包屑、标签页等
 */

import React from 'react';
import { Breadcrumb, Tabs } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import { PageContainerProps } from './types';
import styles from './index.module.less';

export const PageContainer: React.FC<PageContainerProps> = ({
  title,
  subTitle,
  extra,
  breadcrumb,
  tabs,
  children,
  glass = false,
  showBack = false,
  onBack,
  className,
  style,
  contentStyle,
}) => {
  const containerClass = classNames(
    styles.pageContainer,
    {
      [styles.glass]: glass,
    },
    className
  );

  const hasHeader = title || subTitle || extra || breadcrumb || showBack;

  return (
    <div className={containerClass} style={style}>
      {hasHeader && (
        <div className={styles.pageHeader}>
          {breadcrumb && (
            <div className={styles.breadcrumb}>
              <Breadcrumb>
                {breadcrumb.items.map((item, index) => (
                  <Breadcrumb.Item key={index}>
                    {item.path ? <a href={item.path}>{item.title}</a> : item.title}
                  </Breadcrumb.Item>
                ))}
              </Breadcrumb>
            </div>
          )}

          <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              {showBack && (
                <div className={styles.backButton} onClick={onBack}>
                  <ArrowLeftOutlined />
                </div>
              )}
              <div className={styles.headerTitle}>
                {title && <h1 className={styles.title}>{title}</h1>}
                {subTitle && <div className={styles.subTitle}>{subTitle}</div>}
              </div>
            </div>
            {extra && <div className={styles.headerExtra}>{extra}</div>}
          </div>

          {tabs && (
            <div className={styles.tabs}>
              <Tabs
                activeKey={tabs.activeKey}
                items={tabs.items}
                onChange={tabs.onChange}
              />
            </div>
          )}
        </div>
      )}

      <div className={styles.pageContent} style={contentStyle}>
        {children}
      </div>
    </div>
  );
};

export default PageContainer;
