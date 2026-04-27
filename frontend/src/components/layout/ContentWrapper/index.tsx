/**
 * ContentWrapper组件 - 内容包装器
 * 提供统一的内容区域样式
 */

import React from 'react';
import classNames from 'classnames';
import { ContentWrapperProps } from './types';
import styles from './index.module.less';

export const ContentWrapper: React.FC<ContentWrapperProps> = ({
  children,
  glass = false,
  padding = 'base',
  bordered = false,
  radius = 'lg',
  shadow = 'sm',
  className,
  style,
}) => {
  const wrapperClass = classNames(
    styles.contentWrapper,
    {
      [styles.glass]: glass,
      [styles[`padding-${padding}`]]: padding !== 'none',
      [styles.bordered]: bordered,
      [styles[`radius-${radius}`]]: radius !== 'none',
      [styles[`shadow-${shadow}`]]: shadow !== 'none',
    },
    className
  );

  return (
    <div className={wrapperClass} style={style}>
      {children}
    </div>
  );
};

export default ContentWrapper;
