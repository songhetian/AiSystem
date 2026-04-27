/**
 * MetricsCard组件 - 指标卡片
 * 用于展示关键业务指标，支持趋势显示
 */

import React from 'react';
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import { MetricsCardProps } from './types';
import styles from './index.module.less';

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  unit,
  trend,
  trendValue,
  trendText,
  icon,
  iconColor = 'primary',
  extra,
  glass = false,
  clickable = false,
  onClick,
  className,
  style,
}) => {
  const cardClass = classNames(
    styles.metricsCard,
    {
      [styles.glass]: glass,
      [styles.clickable]: clickable || onClick,
    },
    className
  );

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <ArrowUpOutlined />;
      case 'down':
        return <ArrowDownOutlined />;
      case 'flat':
        return <MinusOutlined />;
      default:
        return null;
    }
  };

  const getTrendClass = () => {
    switch (trend) {
      case 'up':
        return styles.trendUp;
      case 'down':
        return styles.trendDown;
      case 'flat':
        return styles.trendFlat;
      default:
        return '';
    }
  };

  return (
    <div className={cardClass} style={style} onClick={onClick}>
      <div className={styles.cardHeader}>
        <div className={styles.title}>{title}</div>
        {extra && <div className={styles.extra}>{extra}</div>}
      </div>

      <div className={styles.cardBody}>
        {icon && (
          <div className={classNames(styles.icon, styles[`icon-${iconColor}`])}>
            {icon}
          </div>
        )}

        <div className={styles.content}>
          <div className={styles.valueWrapper}>
            <span className={styles.value}>{value}</span>
            {unit && <span className={styles.unit}>{unit}</span>}
          </div>

          {(trend || trendValue !== undefined || trendText) && (
            <div className={classNames(styles.trend, getTrendClass())}>
              {trend && <span className={styles.trendIcon}>{getTrendIcon()}</span>}
              {trendValue !== undefined && (
                <span className={styles.trendValue}>{trendValue}%</span>
              )}
              {trendText && <span className={styles.trendText}>{trendText}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricsCard;
