import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Space, Tag, message } from "antd";
import { BaseDrag } from "@/components/common/BaseDrag";
import { serviceApi, type ServiceQualityRule } from "@/api/service";
import "./QualityRuleSortList.less";

export function QualityRuleSortList() {
  const queryClient = useQueryClient();
  const [sortedRules, setSortedRules] = useState<ServiceQualityRule[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { data = [], isLoading } = useQuery<ServiceQualityRule[]>({
    queryKey: ["service-quality-rules"],
    queryFn: serviceApi.listQualityRules,
  });

  useEffect(() => {
    if (data.length > 0) {
      // 按 sort 排序
      const sorted = [...data].sort((a, b) => a.sort - b.sort);
      setSortedRules(sorted);
      setHasChanges(false);
    }
  }, [data]);

  const sortMutation = useMutation({
    mutationFn: serviceApi.updateQualityRuleSort,
    onSuccess: async () => {
      message.success("排序已保存");
      setHasChanges(false);
      await queryClient.invalidateQueries({
        queryKey: ["service-quality-rules"],
      });
    },
    onError: () => {
      message.error("排序保存失败");
    },
  });

  const handleDragEnd = (newItems: ServiceQualityRule[]) => {
    setSortedRules(newItems);
    setHasChanges(true);
  };

  const handleSave = () => {
    const items = sortedRules.map((rule, index) => ({
      id: rule.id,
      sort: index,
    }));
    sortMutation.mutate(items);
  };

  const handleReset = () => {
    const sorted = [...data].sort((a, b) => a.sort - b.sort);
    setSortedRules(sorted);
    setHasChanges(false);
  };

  const ruleTypeMap: Record<string, string> = {
    response_timeout: "响应超时",
    forbidden_phrase: "违规话术",
    service_attitude: "服务态度",
    business_skill: "业务熟练度",
  };

  if (isLoading) {
    return <Card loading />;
  }

  if (sortedRules.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>
          暂无质检规则，请先创建规则
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <span>质检规则排序</span>
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
            loading={sortMutation.isPending}
            disabled={!hasChanges}
          >
            保存排序
          </Button>
        </Space>
      }
    >
      <div className="quality-rule-sort-container">
        <div className="sort-tip">
          拖拽调整质检规则的执行优先级，排序越靠前优先级越高
        </div>

        <BaseDrag
          items={sortedRules}
          getItemId={(rule) => rule.id}
          onDragEnd={handleDragEnd}
          renderItem={(rule, index) => (
            <div className="quality-rule-sort-item">
              <span className="drag-handle">⋮⋮</span>
              <span className="sort-number">{index + 1}</span>
              <div className="rule-info">
                <div className="rule-header">
                  <span className="rule-name">{rule.rule_name}</span>
                  <Space size={8}>
                    <Tag color="blue">
                      {ruleTypeMap[rule.rule_type] || rule.rule_type}
                    </Tag>
                    <Tag color={rule.enabled ? "success" : "default"}>
                      {rule.enabled ? "启用" : "停用"}
                    </Tag>
                  </Space>
                </div>
                <div className="rule-meta">
                  <span>扣分: {rule.deduct_score}</span>
                  <span>阈值: {rule.pass_threshold}</span>
                  {rule.rule_type === "response_timeout" &&
                    rule.response_timeout_sec && (
                      <span>超时: {rule.response_timeout_sec}秒</span>
                    )}
                  {rule.trigger_keywords &&
                    rule.trigger_keywords.length > 0 && (
                      <span>
                        关键词: {rule.trigger_keywords.slice(0, 3).join("、")}
                        {rule.trigger_keywords.length > 3 && "..."}
                      </span>
                    )}
                </div>
              </div>
            </div>
          )}
          direction="vertical"
        />
      </div>
    </Card>
  );
}
