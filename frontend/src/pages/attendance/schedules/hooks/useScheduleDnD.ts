import { useState } from "react";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";

export const useScheduleDnD = () => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    // TODO: 调用后端排班更新逻辑
    console.log("Move shift:", active.id, "to", over.id);
  };

  return {
    activeId,
    onDragStart,
    onDragEnd,
  };
};
