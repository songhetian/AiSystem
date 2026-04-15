import { useState, useEffect } from "react";
import { Button, Card, Space, Tag, message, Empty } from "antd";
import { BaseDrag } from "@/components/common/BaseDrag";
import "./LinkageRuleSortList.less";

export interface LinkageRule {
  id: string;
  event: string;
  event_label?: string;
  module?: string;
  template_id: string;
  template_name?: string;
  recipient_rules: string[];
  priority: number;
  enabled: boolean;
  sort: number;
}

interface LinkageRuleSortListProps {
  rules: LinkageRule[];
  onSave: (rules: LinkageRule[]) => void;
  loading?: boolean;
}

/**
 * 联动规则拖拽排序组件
 *
 * 功能特性：
 * - 拖拽调整规则执行顺序
 * - 实时更新排序值和优先级
 * - 保存/重置功能
 * - 未保存提示
 */
export function LinkageRuleSortList({
  rules,
  onSave,
  loading,
}: LinkageRuleSortListProps) {
  const [sortedRules, setSortedRules] = useState<LinkageRule[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (rules.length > 0) {
      // 按 sort 排序
      const sorted = [...rules].sort((a, b) => (a.sort || 0) - (b.sort || 0));
      setSortedRules(sorted);
      setHasChanges(false);
    } else {
      setSortedRules([]);
    }
  }, [rules]);

  const handleDragEnd = (newItems: LinkageRule[]) => {
    setSortedRules(newItems);
    setHasChanges(true);
  };

  const handleSave = () => {
    const items = sortedRules.map((rule, index) => ({
      ...rule,
      sort: index,
      // 根据排序自动调整优先级：前3个为高优先级，4-6为中优先级，其余为低优先级
      priority: index < 3 ? 1 : index < 6 ? 2 : 3,
    }));
    onSave(items);
    setHasChanges(false);
  };

  const handleReset = () => {
    const sorted = [...rules].sort((a, b) => (a.sort || 0) - (b.sort || 0));
    setSortedRules(sorted);
    setHasChanges(false);
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return "red";
      case 2:
        return "orange";
      default:
        return "default";
    }
  };

  const getPriorityText = (priority: number) => {
    switch (priority) {
      case 1:
        return "高";
      case 2:
        return "中";
      default:
        return "低";
    }
  };

  if (sortedRules.length === 0) {
    return <Empty description="暂无联动规则" style={{ padding: "60px 0" }} />;
  }

  return (
    <Card
      title={
        <Space>
          <span>规则排序</span>
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
      <div className="linkage-rule-sort-container">
        <div className="sort-tip">
          拖拽调整联动规则的执行顺序，排序越靠前优先级越高（前3个为高优先级，4-6为中优先级，其余为低优先级）
        </div>

        <BaseDrag
          items={sortedRules}
          getItemId={(rule) => rule.id}
          onDragEnd={handleDragEnd}
          renderItem={(rule, index) => {
            // 根据排序计算优先级
            const calculatedPriority = index < 3 ? 1 : index < 6 ? 2 : 3;

            return (
              <div className="linkage-rule-sort-item">
                <span className="drag-handle">⋮⋮</span>
                <span className="sort-number">{index + 1}</span>
                <div className="rule-info">
                  <div className="rule-header">
                    <Space size={8}>
                      <span className="rule-event">
                        {rule.event_label || rule.event}
                      </span>
                      <Tag color="blue" className="rule-module">
                        {rule.module || "未知模块"}
                      </Tag>
                      <Tag color={getPriorityColor(calculatedPriority)}>
                        {getPriorityText(calculatedPriority)}优先级
                      </Tag>
                      {!rule.enabled && <Tag color="default">已禁用</Tag>}
                    </Space>
                  </div>
                  <div className="rule-meta">
                    <span>模板: {rule.template_name || rule.template_id}</span>
                    {rule.recipient_rules &&
                      rule.recipient_rules.length > 0 && (
                        <span>接收人: {rule.recipient_rules.join(", ")}</span>
                      )}
                  </div>
                </div>
              </div>
            );
          }}
          direction="vertical"
        />
      </div>
    </Card>
  );
}
