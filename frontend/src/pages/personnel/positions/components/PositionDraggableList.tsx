import React, { useState, useEffect } from "react";
import { Card, Space, Button, message, Tag } from "antd";
import { SaveOutlined, UndoOutlined, MenuOutlined } from "@ant-design/icons";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BaseDrag } from "@/components/common/BaseDrag";
import { personnelApi } from "@/api/personnel";

interface Position {
  id: string;
  name: string;
  code: string;
  department_name?: string;
  status: number;
  sort: number;
}

interface PositionDraggableListProps {
  positions: Position[];
  departmentId?: string;
  onUpdate: () => void;
}

interface SortablePositionItemProps {
  position: Position;
}

const SortablePositionItem: React.FC<SortablePositionItemProps> = ({
  position,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: position.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg mb-2 hover:border-blue-400 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-4 flex-1">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <MenuOutlined className="text-lg" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{position.name}</span>
            <Tag color="blue">{position.code}</Tag>
            {position.status === 0 && <Tag color="red">禁用</Tag>}
          </div>
          {position.department_name && (
            <div className="text-sm text-gray-500 mt-1">
              所属部门：{position.department_name}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * PositionDraggableList - 岗位拖拽排序组件
 *
 * 支持按部门分组拖拽排序岗位
 */
export const PositionDraggableList: React.FC<PositionDraggableListProps> = ({
  positions: initialPositions,
  departmentId,
  onUpdate,
}) => {
  const [positions, setPositions] = useState<Position[]>(initialPositions);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPositions(initialPositions);
    setHasChanges(false);
  }, [initialPositions]);

  const handleDragEnd = (newPositions: Position[]) => {
    setPositions(newPositions);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 构建排序数据
      const sortData = positions.map((position, index) => ({
        id: position.id,
        sort: index,
      }));

      // 调用API保存（需要后端实现）
      await personnelApi.updatePositionSort(sortData);

      message.success("岗位排序已保存");
      setHasChanges(false);
      onUpdate();
    } catch (error) {
      message.error("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPositions(initialPositions);
    setHasChanges(false);
    message.info("已重置为原始顺序");
  };

  return (
    <Card
      title={departmentId ? "部门岗位排序" : "岗位排序"}
      extra={
        <Space>
          {hasChanges && (
            <>
              <Button icon={<UndoOutlined />} onClick={handleReset}>
                重置
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSave}
              >
                保存排序
              </Button>
            </>
          )}
        </Space>
      }
    >
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          background: "#f5f5f5",
          borderRadius: 4,
        }}
      >
        <Space direction="vertical" size="small">
          <div style={{ fontWeight: 500 }}>拖拽说明：</div>
          <div style={{ fontSize: 12, color: "#666" }}>
            • 拖拽岗位可调整显示顺序
            <br />
            • 拖拽后点击"保存排序"按钮生效
            <br />• 点击"重置"可恢复到拖拽前的状态
          </div>
        </Space>
      </div>

      {positions.length > 0 ? (
        <BaseDrag
          items={positions}
          getItemId={(position) => position.id}
          onDragEnd={handleDragEnd}
          renderItem={(position) => (
            <SortablePositionItem position={position} />
          )}
          direction="vertical"
        />
      ) : (
        <div className="text-center py-8 text-gray-400">
          {departmentId ? "该部门暂无岗位" : "暂无岗位数据"}
        </div>
      )}

      {hasChanges && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "#fff7e6",
            border: "1px solid #ffd591",
            borderRadius: 4,
            color: "#d46b08",
          }}
        >
          ⚠️ 您有未保存的更改，请点击"保存排序"按钮保存
        </div>
      )}
    </Card>
  );
};
