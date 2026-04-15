import { useState, useEffect } from "react";
import { Button, Card, Space, Tag, message, Empty, Tooltip } from "antd";
import {
  ThunderboltOutlined,
  GiftOutlined,
  PercentageOutlined,
} from "@ant-design/icons";
import { BaseDrag } from "@/components/common/BaseDrag";
import "./ActivityRuleSortList.less";

export interface ActivityRule {
  id: string;
  activity_id: string;
  rule_name: string;
  rule_type: string; // discount/fullcut/gift
  rule_config: {
    discount?: number;
    threshold?: number;
    gift?: string;
  };
  priority: number;
  sort: number;
  status: number;
}

interface ActivityRuleSortListProps {
  rules: ActivityRule[];
  onSave: (rules: ActivityRule[]) => void;
  loading?: boolean;
}

export function ActivityRuleSortList({
  rules,
  onSave,
  loading,
}: ActivityRuleSortListProps) {
  const [sortedRules, setSortedRules] = useState<ActivityRule[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (rules.length > 0) {
      const sorted = [...rules].sort((a, b) => (a.sort || 0) - (b.sort || 0));
      setSortedRules(sorted);
      setHasChanges(false);
    } else {
      setSortedRules([]);
    }
  }, [rules]);

  const handleDragEnd = (newItems: ActivityRule[]) => {
    setSortedRules(newItems);
    setHasChanges(true);
  };

  const handleSave = () => {
    const items = sortedRules.map((rule, index) => ({
      ...rule,
      sort: index,
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

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case "discount":
        return <PercentageOutlined />;
      case "fullcut":
        return <ThunderboltOutlined />;
      case "gift":
        return <GiftOutlined />;
      default:
        return <ThunderboltOutlined />;
    }
  };

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case "discount":
        return "折扣";
      case "fullcut":
        return "满减";
      case "gift":
        return "赠品";
      default:
        return type;
    }
  };

  const getRuleConfigDisplay = (rule: ActivityRule) => {
    const { rule_type, rule_config } = rule;
    if (rule_type === "discount" && rule_config.discount) {
      return `${rule_config.discount}折`;
    }
    if (rule_type === "fullcut" && rule_config.threshold) {
      return `满${rule_config.threshold}减`;
    }
    if (rule_type === "gift" && rule_config.gift) {
      return `赠送${rule_config.gift}`;
    }
    return "未配置";
  };

  if (sortedRules.length === 0) {
    return (
      <Empty
        description="暂无活动规则"
        style={{ padding: "60px 0" }}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <Card
      title={
        <Space>
          <ThunderboltOutlined />
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
      <div className="activity-rule-sort-container">
        <div className="sort-tip">
          <ThunderboltOutlined />{" "}
          拖拽调整活动规则的执行顺序，排序越靠前优先级越高
        </div>

        <BaseDrag
          items={sortedRules}
          getItemId={(rule) => rule.id}
          onDragEnd={handleDragEnd}
          renderItem={(rule, index) => {
            const calculatedPriority = index < 3 ? 1 : index < 6 ? 2 : 3;

            return (
              <div className="activity-rule-sort-item">
                <span className="drag-handle">⋮⋮</span>
                <span className="sort-number">{index + 1}</span>

                <div className="rule-info">
                  <div className="rule-header">
                    <Space size={8} wrap>
                      <Tooltip title={rule.rule_name}>
                        <span className="rule-name">
                          {getRuleTypeIcon(rule.rule_type)} {rule.rule_name}
                        </span>
                      </Tooltip>

                      <Tag color="blue">{getRuleTypeLabel(rule.rule_type)}</Tag>

                      <Tag
                        color={
                          calculatedPriority === 1
                            ? "red"
                            : calculatedPriority === 2
                              ? "orange"
                              : "default"
                        }
                      >
                        {calculatedPriority === 1
                          ? "高"
                          : calculatedPriority === 2
                            ? "中"
                            : "低"}
                        优先级
                      </Tag>

                      {rule.status === 0 && <Tag color="default">已禁用</Tag>}
                    </Space>
                  </div>

                  <div className="rule-config">
                    <Space size={4}>
                      <span className="config-label">规则配置：</span>
                      <Tag color="green" className="config-tag">
                        {getRuleConfigDisplay(rule)}
                      </Tag>
                    </Space>
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
