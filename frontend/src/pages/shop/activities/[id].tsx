import { useState } from "react";
import { Card, Tabs, Button, Space, Descriptions, Tag, message } from "antd";
import {
  ArrowLeftOutlined,
  ThunderboltOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import {
  ActivityRuleSortList,
  ActivityRule,
} from "./components/ActivityRuleSortList";

export default function ActivityDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("rules");

  // 模拟活动数据
  const activity = {
    id: id || "1",
    activity_name: "双十一大促",
    activity_type: "discount",
    start_time: "2026-11-01 00:00:00",
    end_time: "2026-11-11 23:59:59",
    status: 1,
    description: "全场8折优惠",
  };

  // 模拟规则数据
  const [rules] = useState<ActivityRule[]>([
    {
      id: "1",
      activity_id: id || "1",
      rule_name: "全场8折",
      rule_type: "discount",
      rule_config: { discount: 8 },
      priority: 1,
      sort: 0,
      status: 1,
    },
    {
      id: "2",
      activity_id: id || "1",
      rule_name: "满200减50",
      rule_type: "fullcut",
      rule_config: { threshold: 200 },
      priority: 2,
      sort: 1,
      status: 1,
    },
    {
      id: "3",
      activity_id: id || "1",
      rule_name: "赠送购物袋",
      rule_type: "gift",
      rule_config: { gift: "购物袋" },
      priority: 3,
      sort: 2,
      status: 1,
    },
    {
      id: "4",
      activity_id: id || "1",
      rule_name: "满500减150",
      rule_type: "fullcut",
      rule_config: { threshold: 500 },
      priority: 3,
      sort: 3,
      status: 1,
    },
  ]);

  const handleSaveSort = async (sortedRules: ActivityRule[]) => {
    setLoading(true);
    try {
      // TODO: 调用API保存排序
      // await activityApi.updateRuleSort(id, sortedRules);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      message.success("规则排序已保存");
    } catch (error) {
      message.error("保存失败，请重试");
      console.error("Save sort error:", error);
    } finally {
      setLoading(false);
    }
  };

  const activityTypeMap: Record<string, { label: string; color: string }> = {
    discount: { label: "折扣", color: "blue" },
    fullcut: { label: "满减", color: "green" },
    gift: { label: "赠品", color: "orange" },
  };

  const typeConfig = activityTypeMap[activity.activity_type] || {
    label: activity.activity_type,
    color: "default",
  };

  return (
    <div className="activity-detail">
      <Card
        title={
          <Space>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/shop/activities")}
            >
              返回
            </Button>
            <ThunderboltOutlined style={{ fontSize: 20, color: "#f093fb" }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>活动详情</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<SettingOutlined />}>
            编辑活动
          </Button>
        }
      >
        <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
          <Descriptions.Item label="活动名称">
            {activity.activity_name}
          </Descriptions.Item>
          <Descriptions.Item label="活动类型">
            <Tag color={typeConfig.color}>{typeConfig.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">
            {activity.start_time}
          </Descriptions.Item>
          <Descriptions.Item label="结束时间">
            {activity.end_time}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={activity.status === 1 ? "green" : "default"}>
              {activity.status === 1 ? "启用" : "禁用"}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="活动描述" span={2}>
            {activity.description || "-"}
          </Descriptions.Item>
        </Descriptions>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "rules",
              label: (
                <span>
                  <ThunderboltOutlined />
                  活动规则
                </span>
              ),
              children: (
                <ActivityRuleSortList
                  rules={rules}
                  onSave={handleSaveSort}
                  loading={loading}
                />
              ),
            },
            {
              key: "data",
              label: (
                <span>
                  <SettingOutlined />
                  活动数据
                </span>
              ),
              children: (
                <Card>
                  <div
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "#8c8c8c",
                    }}
                  >
                    活动数据统计功能开发中...
                  </div>
                </Card>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
