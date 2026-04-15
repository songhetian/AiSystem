import React, { useState } from "react";
import { Button, Drawer, Space, Switch, Typography, message } from "antd";
import { SettingOutlined, MenuOutlined } from "@ant-design/icons";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BaseDrag } from "../common/BaseDrag";

const { Text } = Typography;

export interface ColumnConfig {
  key: string;
  title: string;
  visible: boolean;
  fixed?: boolean; // 是否固定列（固定列不可隐藏）
}

interface ColumnCustomizerProps {
  columns: ColumnConfig[];
  onChange: (columns: ColumnConfig[]) => void;
  storageKey?: string; // 本地存储key，用于持久化配置
}

interface SortableColumnItemProps {
  column: ColumnConfig;
  onToggle: (key: string) => void;
}

const SortableColumnItem: React.FC<SortableColumnItemProps> = ({
  column,
  onToggle,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.key,
    disabled: column.fixed,
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
      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded mb-2 hover:border-blue-400 transition-colors"
    >
      <div className="flex items-center gap-3 flex-1">
        {!column.fixed && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          >
            <MenuOutlined />
          </div>
        )}
        <Text className={column.fixed ? "ml-6" : ""}>{column.title}</Text>
        {column.fixed && (
          <Text type="secondary" className="text-xs">
            (固定)
          </Text>
        )}
      </div>
      <Switch
        checked={column.visible}
        disabled={column.fixed}
        onChange={() => onToggle(column.key)}
        size="small"
      />
    </div>
  );
};

/**
 * ColumnCustomizer - 表格列自定义组件
 *
 * 支持拖拽调整列顺序、显示/隐藏列
 * 配置自动保存到 localStorage
 *
 * @example
 * ```tsx
 * const [columns, setColumns] = useState(defaultColumns);
 *
 * <ColumnCustomizer
 *   columns={columns}
 *   onChange={setColumns}
 *   storageKey="my-table-columns"
 * />
 * ```
 */
export const ColumnCustomizer: React.FC<ColumnCustomizerProps> = ({
  columns,
  onChange,
  storageKey,
}) => {
  const [open, setOpen] = useState(false);

  const handleDragEnd = (newColumns: ColumnConfig[]) => {
    onChange(newColumns);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(newColumns));
    }
    message.success("列顺序已更新");
  };

  const handleToggle = (key: string) => {
    const newColumns = columns.map((col) =>
      col.key === key ? { ...col, visible: !col.visible } : col,
    );
    onChange(newColumns);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(newColumns));
    }
  };

  const handleReset = () => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    message.success("已恢复默认配置");
    setOpen(false);
  };

  return (
    <>
      <Button
        icon={<SettingOutlined />}
        onClick={() => setOpen(true)}
        title="自定义列"
      >
        列设置
      </Button>

      <Drawer
        title="自定义表格列"
        placement="right"
        width={400}
        open={open}
        onClose={() => setOpen(false)}
        extra={
          <Button size="small" onClick={handleReset}>
            恢复默认
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <div className="bg-blue-50 p-3 rounded">
            <Text type="secondary" className="text-xs">
              💡 提示：拖拽调整列顺序，开关控制显示/隐藏
            </Text>
          </div>

          <BaseDrag
            items={columns}
            getItemId={(col) => col.key}
            onDragEnd={handleDragEnd}
            renderItem={(column) => (
              <SortableColumnItem column={column} onToggle={handleToggle} />
            )}
          />
        </Space>
      </Drawer>
    </>
  );
};

/**
 * 从 localStorage 加载列配置
 */
export const loadColumnConfig = (
  storageKey: string,
  defaultColumns: ColumnConfig[],
): ColumnConfig[] => {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const savedColumns = JSON.parse(saved) as ColumnConfig[];
      // 合并保存的配置和默认配置（处理新增列的情况）
      const savedKeys = new Set(savedColumns.map((c) => c.key));
      const newColumns = defaultColumns.filter((c) => !savedKeys.has(c.key));
      return [...savedColumns, ...newColumns];
    }
  } catch (error) {
    console.error("Failed to load column config:", error);
  }
  return defaultColumns;
};
