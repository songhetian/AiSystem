import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card, Typography } from "antd";

const { Text } = Typography;

interface ShiftRecord {
  id: string;
  name: string;
  on_duty_time: string;
  off_duty_time: string;
}

export const DraggableShiftCard = ({ shift }: { shift: ShiftRecord }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `shift-${shift.id}`,
    data: { type: "shift", shift },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="mb-2 shadow-sm border-l-4 border-l-blue-500"
      bodyStyle={{ padding: "8px 12px" }}
    >
      <Text strong className="block">{shift.name}</Text>
      <Text type="secondary" className="text-xs">
        {shift.on_duty_time} - {shift.off_duty_time}
      </Text>
    </Card>
  );
};
