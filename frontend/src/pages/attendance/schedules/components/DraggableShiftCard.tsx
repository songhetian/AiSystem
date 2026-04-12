import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card, Tag, Typography } from 'antd';
import type { AttendanceScheduleShift } from '@/api/attendance/types';

const { Text } = Typography;

const SHIFT_COLORS = [
  '#FF4D4F',
  '#FF7A45',
  '#FFC107',
  '#52C41A',
  '#1890FF',
  '#722ED1',
  '#F5222D',
  '#FF0080',
  '#00B42A',
  '#13C2C2',
];

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace('#', '');
  const normalized = value.length === 3 ? value.split('').map((item) => item + item).join('') : value;
  const num = Number.parseInt(normalized, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const getShiftTheme = (shiftId: string) => {
  const seed = shiftId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const base = SHIFT_COLORS[seed % SHIFT_COLORS.length];
  return {
    color: base,
    softColor: hexToRgba(base, 0.16),
  };
};

export const DraggableShiftCard = ({
  shift,
  selected = false,
  disabled = false,
  onSelect,
}: {
  shift: AttendanceScheduleShift;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: (shift: AttendanceScheduleShift) => void;
}) => {
  const theme = getShiftTheme(shift.id);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `shift-${shift.id}`,
    disabled,
    data: { type: 'shift', shift },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.65 : disabled ? 1 : 1,
    cursor: disabled ? 'pointer' : 'grab',
    borderColor: selected ? theme.color : '#e2e8f0',
    background: selected ? theme.softColor : '#fff',
    boxShadow: selected ? `0 10px 24px ${hexToRgba(theme.color, 0.22)}` : undefined,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="mb-3 overflow-hidden border transition-all"
      bodyStyle={{ padding: '10px 12px' }}
      onClick={() => onSelect?.(shift)}
      {...listeners}
      {...attributes}
    >
      <div
        className="mb-2 h-1.5 rounded-full"
        style={{ background: `linear-gradient(90deg, ${theme.color}, ${theme.softColor})` }}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <Text strong className="block text-slate-900">
            {shift.name}
          </Text>
          <Text type="secondary" className="text-xs">
            {shift.on_duty_time} - {shift.off_duty_time}
          </Text>
        </div>
        {selected ? <Tag color="processing">已激活</Tag> : null}
      </div>
    </Card>
  );
};
