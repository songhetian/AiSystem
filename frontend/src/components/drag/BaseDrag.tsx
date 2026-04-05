import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HolderOutlined } from '@ant-design/icons';
import { Card, Empty, Space, Typography } from 'antd';

export interface BaseDragItem {
  id: string;
}

export interface BaseDragContainer<T extends BaseDragItem> {
  id: string;
  title?: ReactNode;
  description?: ReactNode;
  items: T[];
  emptyText?: string;
}

interface DragHandleProps {
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown> | undefined;
}

interface BaseDragRenderContext<T extends BaseDragItem> {
  item: T;
  containerId: string;
  isDragging: boolean;
  isOverlay: boolean;
  dragHandle: DragHandleProps;
}

interface BaseDragBoardProps<T extends BaseDragItem> {
  containers: BaseDragContainer<T>[];
  renderItem: (context: BaseDragRenderContext<T>) => ReactNode;
  onChange?: (containers: BaseDragContainer<T>[]) => void | Promise<void>;
  overlayRender?: (item: T, containerId: string) => ReactNode;
  className?: string;
  style?: CSSProperties;
  containerStyle?: CSSProperties;
}

interface BaseDragLegacyProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

type BaseDragProps<T extends BaseDragItem> = BaseDragBoardProps<T> | BaseDragLegacyProps;

const BOARD_GAP = 16;
const ITEM_GAP = 12;

function isBoardProps<T extends BaseDragItem>(props: BaseDragProps<T>): props is BaseDragBoardProps<T> {
  return 'containers' in props;
}

function cloneContainers<T extends BaseDragItem>(containers: BaseDragContainer<T>[]) {
  return containers.map((container) => ({
    ...container,
    items: [...container.items]
  }));
}

function createDragHandle(attributes: Record<string, unknown>, listeners: Record<string, unknown> | undefined): DragHandleProps {
  return { attributes, listeners };
}

function findContainerByItemId<T extends BaseDragItem>(containers: BaseDragContainer<T>[], itemId: string) {
  return containers.find((container) => container.items.some((item) => item.id === itemId));
}

function findItem<T extends BaseDragItem>(containers: BaseDragContainer<T>[], itemId: string) {
  for (const container of containers) {
    const item = container.items.find((current) => current.id === itemId);
    if (item) {
      return { item, containerId: container.id };
    }
  }
  return null;
}

function moveAcrossContainers<T extends BaseDragItem>(
  containers: BaseDragContainer<T>[],
  activeId: string,
  overId: string,
  overContainerId: string
) {
  const next = cloneContainers(containers);
  const sourceContainer = findContainerByItemId(next, activeId);
  const destinationContainer = next.find((container) => container.id === overContainerId);

  if (!sourceContainer || !destinationContainer) {
    return next;
  }

  const sourceIndex = sourceContainer.items.findIndex((item) => item.id === activeId);
  if (sourceIndex === -1) {
    return next;
  }

  const [movedItem] = sourceContainer.items.splice(sourceIndex, 1);
  const overIndex = destinationContainer.items.findIndex((item) => item.id === overId);
  const targetIndex = overIndex >= 0 ? overIndex : destinationContainer.items.length;
  destinationContainer.items.splice(targetIndex, 0, movedItem);
  return next;
}

function SortableDragItem<T extends BaseDragItem>({
  item,
  containerId,
  renderItem
}: {
  item: T;
  containerId: string;
  renderItem: BaseDragBoardProps<T>['renderItem'];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1
  };

  return (
    <div ref={setNodeRef} style={style}>
      {renderItem({
        item,
        containerId,
        isDragging,
        isOverlay: false,
        dragHandle: createDragHandle(attributes, listeners)
      })}
    </div>
  );
}

function DroppableColumn({
  id,
  children,
  isOver,
  style
}: {
  id: string;
  children: ReactNode;
  isOver: boolean;
  style?: CSSProperties;
}) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: 140,
        padding: 12,
        borderRadius: 16,
        border: `1px dashed ${isOver ? '#1677ff' : '#d9d9d9'}`,
        background: isOver ? '#f0f7ff' : '#fafafa',
        transition: 'all 0.2s ease',
        ...style
      }}
    >
      {children}
    </div>
  );
}

function BoardBaseDrag<T extends BaseDragItem>({
  containers,
  renderItem,
  onChange,
  overlayRender,
  className,
  style,
  containerStyle
}: BaseDragBoardProps<T>) {
  const [localContainers, setLocalContainers] = useState(() => cloneContainers(containers));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  useEffect(() => {
    setLocalContainers(cloneContainers(containers));
  }, [containers]);

  const activeMeta = useMemo(() => (activeId ? findItem(localContainers, activeId) : null), [activeId, localContainers]);

  const commitChange = async (next: BaseDragContainer<T>[], previous: BaseDragContainer<T>[]) => {
    setLocalContainers(next);
    if (!onChange) {
      return;
    }

    try {
      setIsSaving(true);
      await onChange(next);
    } catch (error) {
      setLocalContainers(previous);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) {
      return;
    }

    const activeContainer = findContainerByItemId(localContainers, String(active.id));
    const overContainer =
      localContainers.find((container) => container.id === String(over.id)) ?? findContainerByItemId(localContainers, String(over.id));

    if (!activeContainer || !overContainer || activeContainer.id === overContainer.id) {
      return;
    }

    setLocalContainers((current) => moveAcrossContainers(current, String(active.id), String(over.id), overContainer.id));
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveId(null);

    if (!over) {
      setLocalContainers(cloneContainers(containers));
      return;
    }

    const previous = cloneContainers(localContainers);
    const activeContainer = findContainerByItemId(previous, String(active.id));
    const overContainer =
      previous.find((container) => container.id === String(over.id)) ?? findContainerByItemId(previous, String(over.id));

    if (!activeContainer || !overContainer) {
      return;
    }

    let next = previous;
    if (activeContainer.id === overContainer.id) {
      const targetContainer = next.find((container) => container.id === activeContainer.id);
      if (!targetContainer) {
        return;
      }
      const oldIndex = targetContainer.items.findIndex((item) => item.id === String(active.id));
      const newIndex = targetContainer.items.findIndex((item) => item.id === String(over.id));
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        targetContainer.items = arrayMove(targetContainer.items, oldIndex, newIndex);
      }
    }

    await commitChange(cloneContainers(next), cloneContainers(containers));
  };

  return (
    <div className={className} style={style} data-drag-root>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={(event) => {
          void handleDragEnd(event);
        }}
        onDragCancel={() => {
          setActiveId(null);
          setLocalContainers(cloneContainers(containers));
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.max(localContainers.length, 1)}, minmax(0, 1fr))`,
            gap: BOARD_GAP
          }}
        >
          {localContainers.map((container) => {
            const itemIds = container.items.map((item) => item.id);
            const isOver = Boolean(activeId) && container.id === activeMeta?.containerId;

            return (
              <div key={container.id}>
                {(container.title || container.description) && (
                  <Space direction="vertical" size={2} style={{ marginBottom: 8, display: 'flex' }}>
                    {container.title ? <Typography.Text strong>{container.title}</Typography.Text> : null}
                    {container.description ? <Typography.Text type="secondary">{container.description}</Typography.Text> : null}
                  </Space>
                )}
                <DroppableColumn id={container.id} isOver={isOver} style={containerStyle}>
                  <SortableContext items={itemIds} strategy={rectSortingStrategy}>
                    <Space direction="vertical" size={ITEM_GAP} style={{ width: '100%' }}>
                      {container.items.map((item) => (
                        <SortableDragItem key={item.id} item={item} containerId={container.id} renderItem={renderItem} />
                      ))}
                      {container.items.length === 0 ? (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description={container.emptyText ?? '拖拽到这里'}
                          styles={{ image: { height: 40 }, description: { color: '#8c8c8c' } }}
                        />
                      ) : null}
                    </Space>
                  </SortableContext>
                </DroppableColumn>
              </div>
            );
          })}
        </div>
        <DragOverlay>
          {activeMeta
            ? overlayRender?.(activeMeta.item, activeMeta.containerId) ?? (
                <Card size="small" style={{ width: 280, boxShadow: '0 16px 40px rgba(0, 0, 0, 0.14)' }}>
                  {renderItem({
                    item: activeMeta.item,
                    containerId: activeMeta.containerId,
                    isDragging: true,
                    isOverlay: true,
                    dragHandle: createDragHandle({}, undefined)
                  })}
                </Card>
              )
            : null}
        </DragOverlay>
      </DndContext>
      {isSaving ? (
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
          正在自动保存拖拽结果...
        </Typography.Text>
      ) : null}
    </div>
  );
}

export function BaseDrag<T extends BaseDragItem>(props: BaseDragProps<T>) {
  if (!isBoardProps(props)) {
    return (
      <div className={props.className} style={props.style} data-drag-root>
        {props.children}
      </div>
    );
  }

  return <BoardBaseDrag {...props} />;
}

export function BaseDragHandle({ attributes, listeners }: DragHandleProps) {
  return (
    <span
      {...attributes}
      {...listeners}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: 8,
        background: '#f5f5f5',
        cursor: 'grab',
        color: '#595959',
        flexShrink: 0
      }}
    >
      <HolderOutlined />
    </span>
  );
}
