import React, { ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import {
  restrictToVerticalAxis,
  restrictToHorizontalAxis,
} from "@dnd-kit/modifiers";

export interface BaseDragProps<T = any> {
  /** 数据源 */
  items: T[];
  /** 拖拽结束回调 */
  onDragEnd: (items: T[]) => void;
  /** 渲染每个项目 */
  renderItem: (item: T, index: number) => ReactNode;
  /** 获取项目唯一标识 */
  getItemId: (item: T) => string | number;
  /** 拖拽方向 */
  direction?: "vertical" | "horizontal" | "grid";
  /** 是否禁用拖拽 */
  disabled?: boolean;
  /** 容器样式 */
  containerStyle?: React.CSSProperties;
  /** 容器类名 */
  containerClassName?: string;
  /** 拖拽开始回调 */
  onDragStart?: (item: T) => void;
  /** 拖拽覆盖层渲染 */
  renderOverlay?: (item: T) => ReactNode;
}

/**
 * BaseDrag - 统一拖拽组件
 *
 * 基于 @dnd-kit 封装，提供统一的拖拽交互体验
 *
 * @example
 * ```tsx
 * <BaseDrag
 *   items={list}
 *   getItemId={(item) => item.id}
 *   onDragEnd={(newItems) => setList(newItems)}
 *   renderItem={(item, index) => (
 *     <div>{item.name}</div>
 *   )}
 * />
 * ```
 */
export function BaseDrag<T = any>({
  items,
  onDragEnd,
  renderItem,
  getItemId,
  direction = "vertical",
  disabled = false,
  containerStyle,
  containerClassName,
  onDragStart,
  renderOverlay,
}: BaseDragProps<T>) {
  const [activeItem, setActiveItem] = React.useState<T | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 移动8px后才触发拖拽，避免误触
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // 根据方向选择策略
  const strategy =
    direction === "horizontal"
      ? horizontalListSortingStrategy
      : direction === "grid"
        ? rectSortingStrategy
        : verticalListSortingStrategy;

  // 根据方向选择限制修饰符
  const modifiers =
    direction === "horizontal"
      ? [restrictToHorizontalAxis]
      : direction === "vertical"
        ? [restrictToVerticalAxis]
        : [];

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item = items.find((item) => getItemId(item) === active.id);
    if (item) {
      setActiveItem(item);
      onDragStart?.(item);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => getItemId(item) === active.id);
    const newIndex = items.findIndex((item) => getItemId(item) === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = arrayMove(items, oldIndex, newIndex);
      onDragEnd(newItems);
    }
  };

  const itemIds = items.map(getItemId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={modifiers}
    >
      <SortableContext items={itemIds} strategy={strategy} disabled={disabled}>
        <div style={containerStyle} className={containerClassName}>
          {items.map((item, index) => (
            <React.Fragment key={getItemId(item)}>
              {renderItem(item, index)}
            </React.Fragment>
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem && renderOverlay ? (
          renderOverlay(activeItem)
        ) : activeItem ? (
          <div style={{ opacity: 0.5 }}>
            {renderItem(activeItem, items.indexOf(activeItem))}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * 拖拽项包装器 Hook
 * 用于包装可拖拽的项目
 */
export { useSortable } from "@dnd-kit/sortable";
export { CSS } from "@dnd-kit/utilities";
