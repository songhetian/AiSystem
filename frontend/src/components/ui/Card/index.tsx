/**
 * Card组件 - 毛玻璃卡片
 * 支持毛玻璃效果、多种阴影、圆角、悬停效果
 */

import React from 'react';
import classNames from 'classnames';
import { CardProps } from './types';
import styles from './index.module.less';

export const Card: React.FC<CardProps> = ({
  title,
  extra,
  children,
  glass = false,
  shadow = 'md',
  radius = 'lg',
  padding = 'base',
  bordered = false,
  hoverable = false,
  className,
  style,
  onClick,
  headerStyle,
  bodyStyle,
}) => {
  const cardClass = classNames(
    styles.card,
    {
      [styles.glass]: glass,
      [styles[`shadow-${shadow}`]]: shadow !== 'none',
      [styles[`radius-${radius}`]]: radius !== 'none',
      [styles[`padding-${padding}`]]: padding !== 'none',
      [styles.bordered]: bordered,
      [styles.hoverable]: hoverable,
      [styles.clickable]: onClick,
    },
    className
  );

  const hasHeader = title || extra;

  return (
    <div className={cardClass} style={style} onClick={onClick}>
      {hasHeader && (
        <div className={styles.cardHeader} style={headerStyle}>
          {title && <div className={styles.cardTitle}>{title}</div>}
          {extra && <div className={styles.cardExtra}>{extra}</div>}
        </div>
      )}
      <div className={styles.cardBody} style={bodyStyle}>
        {children}
      </div>
    </div>
  );
};

export default Card;
