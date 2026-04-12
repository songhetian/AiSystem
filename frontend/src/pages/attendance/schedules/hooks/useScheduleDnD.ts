import { useState } from 'react';
import { message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { attendanceApi } from '@/api/attendance';

function parseDropTarget(id: string) {
  const matched = /^cell-(.+)-(\d{4}-\d{2}-\d{2})$/.exec(id);
  if (!matched) return null;
  return {
    employee_id: matched[1],
    schedule_date: matched[2],
  };
}

type DragShift = {
  id: string;
  name: string;
  on_duty_time?: string;
  off_duty_time?: string;
};

export const useScheduleDnD = () => {
  const [activeShift, setActiveShift] = useState<DragShift | null>(null);
  const [previewTarget, setPreviewTarget] = useState<{
    employee_id: string;
    schedule_date: string;
  } | null>(null);
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: attendanceApi.saveSchedule,
    onSuccess: async () => {
      message.success('排班已更新');
      await queryClient.invalidateQueries({ queryKey: ['attendance-schedules'] });
    },
    onError: () => {
      message.error('排班更新失败');
    },
  });

  const onDragStart = (event: DragStartEvent) => {
    setActiveShift((event.active.data.current?.shift as DragShift | undefined) ?? null);
  };

  const onDragOver = (event: DragOverEvent) => {
    setPreviewTarget(event.over ? parseDropTarget(String(event.over.id)) : null);
  };

  const resetDragState = () => {
    setActiveShift(null);
    setPreviewTarget(null);
  };

  const saveSchedule = async (payload: {
    shift_id?: string;
    items: Array<{ employee_id: string; schedule_date: string }>;
  }) => {
    await saveMutation.mutateAsync(payload);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const shift = active.data.current?.shift as DragShift | undefined;
    const target = over ? parseDropTarget(String(over.id)) : null;

    resetDragState();
    if (!shift || !target) return;

    await saveSchedule({
      shift_id: shift.id,
      items: [target],
    });
  };

  return {
    activeShift,
    previewTarget,
    onDragStart,
    onDragOver,
    onDragEnd,
    saving: saveMutation.isPending,
    saveSchedule,
  };
};
