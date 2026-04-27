/**
 * Timeline组件 - 时间轴
 * 用于展示时间流信息
 */

import React from 'react';
import { Timeline as AntTimeline } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import classNames from 'classnames';
import { TimelineProps } from './types';
import styles from './index.module.less';

export const Timeline: React.FC<TimelineProps> = ({
  items,
  glass = false,
  reverse = false,
  mode = 'left',
  className,
  style,
}) => {
  const timelineClass = classNames(
    styles.timeline,
    {
      [styles.glass]: glass,
    },
    className
  );

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined className={styles.iconSuccess} />;
      case 'processing':
        return <ClockCircleOutlined className={styles.iconProcessing} />;
      case 'error':
        return <CloseCircleOutlined className={styles.iconError} />;
      case 'warning':
        return <ExclamationCircleOutlined className={styles.iconWarning} />;
      default:
        return null;
    }
  };

  const timelineItems = items.map((item) => ({
    key: item.key,
    dot: item.icon || getStatusIcon(item.status),
    children: (
      <div className={styles.timelineItem}>
        <div className={styles.itemHeader}>
          <div className={styles.itemTime}>{item.time}</div>
          {item.extra && <div className={styles.itemExtra}>{item.extra}</div>}
        </div>
        <div className={styles.itemTitle}>{item.title}</div>
        {item.description && (
          <div className={styles.itemDescription}>{item.description}</div>
        )}
      </div>
    ),
  }));

  return (
    <div className={timelineClass} style={style}>
      <AntTimeline
        items={timelineItems}
        reverse={reverse}
        mode={mode}
      />
    </div>
  );
};

export default Timeline;
