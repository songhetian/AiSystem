import { useState, useEffect } from "react";
import { Button, Card, Space, Tag, message, Empty } from "antd";
import { BaseDrag } from "@/components/common/BaseDrag";
import "./VariableSortList.less";

export interface TemplateVariable {
  id: string;
  label: string;
  value: string;
  description?: string;
  sort: number;
}

interface VariableSortListProps {
  variables: TemplateVariable[];
  onSave: (variables: TemplateVariable[]) => void;
  loading?: boolean;
}

/**
 * 消息模板变量拖拽排序组件
 *
 * 功能特性：
 * - 拖拽调整变量显示顺序
 * - 实时更新排序值
 * - 保存/重置功能
 * - 未保存提示
 */
export function VariableSortList({
  variables,
  onSave,
  loading,
}: VariableSortListProps) {
  const [sortedVariables, setSortedVariables] = useState<TemplateVariable[]>(
    [],
  );
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (variables.length > 0) {
      // 按 sort 排序
      const sorted = [...variables].sort(
        (a, b) => (a.sort || 0) - (b.sort || 0),
      );
      setSortedVariables(sorted);
      setHasChanges(false);
    } else {
      setSortedVariables([]);
    }
  }, [variables]);

  const handleDragEnd = (newItems: TemplateVariable[]) => {
    setSortedVariables(newItems);
    setHasChanges(true);
  };

  const handleSave = () => {
    const items = sortedVariables.map((variable, index) => ({
      ...variable,
      sort: index,
    }));
    onSave(items);
    setHasChanges(false);
  };

  const handleReset = () => {
    const sorted = [...variables].sort((a, b) => (a.sort || 0) - (b.sort || 0));
    setSortedVariables(sorted);
    setHasChanges(false);
  };

  if (sortedVariables.length === 0) {
    return <Empty description="暂无可用变量" style={{ padding: "60px 0" }} />;
  }

  return (
    <Card
      title={
        <Space>
          <span>变量排序</span>
          {hasChanges && <Tag color="warning">未保存</Tag>}
        </Space>
      }
      extra={
        <Space>
          <Button onClick={handleReset} disabled={!hasChanges}>
            重置
          </Button>
          <Button
            type="primary"
            onClick={handleSave}
            loading={loading}
            disabled={!hasChanges}
          >
            保存排序
          </Button>
        </Space>
      }
    >
      <div className="variable-sort-container">
        <div className="sort-tip">
          拖拽调整变量的显示顺序，排序越靠前在模板编辑时越优先展示
        </div>

        <BaseDrag
          items={sortedVariables}
          getItemId={(variable) => variable.id}
          onDragEnd={handleDragEnd}
          renderItem={(variable, index) => (
            <div className="variable-sort-item">
              <span className="drag-handle">⋮⋮</span>
              <span className="sort-number">{index + 1}</span>
              <div className="variable-info">
                <div className="variable-header">
                  <span className="variable-label">{variable.label}</span>
                  <Tag color="blue" className="variable-value">
                    {variable.value}
                  </Tag>
                </div>
                {variable.description && (
                  <div className="variable-description">
                    {variable.description}
                  </div>
                )}
              </div>
            </div>
          )}
          direction="vertical"
        />
      </div>
    </Card>
  );
}
