import React, { useMemo, useState, useRef, useCallback } from 'react';

interface VirtualListProps<T> {
  data: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

/**
 * 虚拟滚动列表组件
 * 用于优化大数据量列表的渲染性能
 * 
 * @example
 * <VirtualList
 *   data={items}
 *   itemHeight={50}
 *   containerHeight={500}
 *   renderItem={(item, index) => <div>{item.name}</div>}
 * />
 */
export function VirtualList<T>({
  data,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算可见区域的项目
  const { startIndex, endIndex, visibleItems, offsetY, totalHeight } = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + overscan, data.length);
    const actualStart = Math.max(0, start - overscan);

    return {
      startIndex: actualStart,
      endIndex: end,
      visibleItems: data.slice(actualStart, end),
      offsetY: actualStart * itemHeight,
      totalHeight: data.length * itemHeight,
    };
  }, [data, scrollTop, itemHeight, containerHeight, overscan]);

  // 滚动事件处理
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VirtualList;
