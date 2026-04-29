import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

/**
 * 虚拟滚动 Hook
 * Task 16.1: 实现列表虚拟滚动
 * Requirements: 16.3, 23.3
 *
 * 用于优化大数据量列表渲染性能
 *
 * @param items 数据列表
 * @param estimateSize 预估每项高度（像素）
 * @param overscan 预渲染项数（默认 5）
 * @returns 虚拟滚动器实例
 *
 * @example
 * const parentRef = useRef<HTMLDivElement>(null);
 * const virtualizer = useVirtualScroll(dataSource, 50, 5, parentRef);
 *
 * return (
 *   <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
 *     <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
 *       {virtualizer.getVirtualItems().map((virtualItem) => (
 *         <div
 *           key={virtualItem.key}
 *           style={{
 *             position: 'absolute',
 *             top: 0,
 *             left: 0,
 *             width: '100%',
 *             height: `${virtualItem.size}px`,
 *             transform: `translateY(${virtualItem.start}px)`,
 *           }}
 *         >
 *           {dataSource[virtualItem.index]}
 *         </div>
 *       ))}
 *     </div>
 *   </div>
 * );
 */
export function useVirtualScroll<T>(
  items: T[],
  estimateSize: number = 50,
  overscan: number = 5,
  parentRef: React.RefObject<HTMLElement>
) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  return virtualizer;
}

/**
 * 表格虚拟滚动配置
 * 用于 Ant Design Pro Table 的虚拟滚动配置
 *
 * @param height 表格高度（像素）
 * @param rowHeight 行高（像素），默认 54
 * @returns 虚拟滚动配置对象
 *
 * @example
 * <ProTable
 *   scroll={getVirtualScrollConfig(600, 54)}
 *   virtual
 *   {...otherProps}
 * />
 */
export function getVirtualScrollConfig(height: number, rowHeight: number = 54) {
  return {
    y: height,
    x: 'max-content',
  };
}

/**
 * 计算虚拟滚动容器高度
 * 根据数据量和可视区域自动计算合适的容器高度
 *
 * @param itemCount 数据总数
 * @param rowHeight 行高（像素）
 * @param maxHeight 最大高度（像素），默认 600
 * @param minHeight 最小高度（像素），默认 300
 * @returns 计算后的容器高度
 */
export function calculateVirtualScrollHeight(
  itemCount: number,
  rowHeight: number = 54,
  maxHeight: number = 600,
  minHeight: number = 300
): number {
  const totalHeight = itemCount * rowHeight;
  return Math.max(minHeight, Math.min(totalHeight, maxHeight));
}
