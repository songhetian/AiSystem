/**
 * Badge组件 - 徽章
 * 支持数字、文本、小红点、多种颜色
 */

import React from 'react';
import classNames from 'classnames';
import { BadgeProps } from './types';
import styles from './index.module.less';

export const Badge: React.FC<BadgeProps> = ({
  color = 'danger',
  count,
  overflowCount = 99,
  dot = false,
  showZero = false,
  children,
  offset,
  className,
  style,
}) => {
  // 计算显示的内容
  const getDisplayCount = () => {
    if (dot) return null;
    if (typeof count === 'number') {
      if (count === 0 && !showZero) return null;
      if (count > overflowCount) return `${overflowCount}+`;
      return count;
    }
    return count;
  };

  const displayCount = getDisplayCount();
  const showBadge = dot || displayCount !== null;

  // 如果没有子元素，直接显示徽章
  if (!children) {
    if (!showBadge) return null;

    const badgeClass = classNames(
      styles.badge,
      styles[`badge-${color}`],
      {
        [styles.dot]: dot,
        [styles.standalone]: true,
      },
      className
    );

    return (
      <span className={badgeClass} style={style}>
        {!dot && displayCount}
      </span>
    );
  }

  // 有子元素时，徽章作为角标显示
  const badgeClass = classNames(
    styles.badge,
    styles[`badge-${color}`],
    {
      [styles.dot]: dot,
    }
  );

  const badgeStyle: React.CSSProperties = {
    ...style,
  };

  if (offset) {
    badgeStyle.transform = `translate(${offset[0]}px, ${offset[1]}px)`;
  }

  return (
    <span className={classNames(styles.badgeWrapper, className)}>
      {children}
      {showBadge && (
        <span className={badgeClass} style={badgeStyle}>
          {!dot && displayCount}
        </span>
      )}
    </span>
  );
};

export default Badge;
