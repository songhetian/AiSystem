import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MetricCard } from './MetricCard';

interface Props {
  id: string;
  title: string;
  value: string | number;
  suffix?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: React.ReactNode;
  color?: string;
  status?: 'normal' | 'abnormal';
  isDraggingEnabled?: boolean;
}

/**
 * 可拖拽指标卡片包装器 (Section 2.6)
 * 集成 @dnd-kit/sortable 实现自由布局
 */
export const DraggableMetricCard: React.FC<Props> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id, disabled: !props.isDraggingEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
    cursor: props.isDraggingEnabled ? 'grab' : 'default',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <MetricCard {...props} />
    </div>
  );
};
