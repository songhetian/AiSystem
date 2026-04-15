import { useState } from "react";
import {
  Card,
  Tabs,
  Button,
  Space,
  Descriptions,
  Tag,
  message,
  Statistic,
  Row,
  Col,
} from "antd";
import {
  ArrowLeftOutlined,
  TeamOutlined,
  UserOutlined,
  SettingOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { MemberSortList, AgentGroupMember } from "./components/MemberSortList";

export default function AgentGroupDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("members");

  // 模拟坐席组数据
  const group = {
    id: id || "1",
    group_name: "售前咨询组",
    group_code: "PRE_SALES",
    description: "负责售前咨询和产品介绍",
    status: 1,
    member_count: 8,
  };

  // 模拟成员数据
  const [members] = useState<AgentGroupMember[]>([
    {
      id: "1",
      group_id: id || "1",
      agent_id: "agent_001",
      agent_name: "张三",
      agent_phone: "13800138001",
      priority: 1,
      sort: 0,
      status: 1,
    },
    {
      id: "2",
      group_id: id || "1",
      agent_id: "agent_002",
      agent_name: "李四",
      agent_phone: "13800138002",
      priority: 1,
      sort: 1,
      status: 1,
    },
    {
      id: "3",
      group_id: id || "1",
      agent_id: "agent_003",
      agent_name: "王五",
      agent_phone: "13800138003",
      priority: 1,
      sort: 2,
      status: 1,
    },
    {
      id: "4",
      group_id: id || "1",
      agent_id: "agent_004",
      agent_name: "赵六",
      agent_phone: "13800138004",
      priority: 2,
      sort: 3,
      status: 1,
    },
    {
      id: "5",
      group_id: id || "1",
      agent_id: "agent_005",
      agent_name: "钱七",
      agent_phone: "13800138005",
      priority: 2,
      sort: 4,
      status: 1,
    },
    {
      id: "6",
      group_id: id || "1",
      agent_id: "agent_006",
      agent_name: "孙八",
      agent_phone: "13800138006",
      priority: 3,
      sort: 5,
      status: 1,
    },
    {
      id: "7",
      group_id: id || "1",
      agent_id: "agent_007",
      agent_name: "周九",
      agent_phone: "13800138007",
      priority: 3,
      sort: 6,
      status: 1,
    },
    {
      id: "8",
      group_id: id || "1",
      agent_id: "agent_008",
      agent_name: "吴十",
      agent_phone: "13800138008",
      priority: 3,
      sort: 7,
      status: 1,
    },
  ]);

  const handleSaveSort = async (sortedMembers: AgentGroupMember[]) => {
    setLoading(true);
    try {
      // TODO: 调用API保存排序
      // await agentGroupApi.updateMemberSort(id, sortedMembers);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      message.success("成员排序已保存");
    } catch (error) {
      message.error("保存失败，请重试");
      console.error("Save sort error:", error);
    } finally {
      setLoading(false);
    }
  };

  // 统计数据
  const highPriorityCount = members.filter((m) => m.priority === 1).length;
  const mediumPriorityCount = members.filter((m) => m.priority === 2).length;
  const lowPriorityCount = members.filter((m) => m.priority === 3).length;

  return (
    <div className="agent-group-detail">
      <Card
        title={
          <Space>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/service/agent-groups")}
            >
              返回
            </Button>
            <TeamOutlined style={{ fontSize: 20, color: "#4facfe" }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>坐席组详情</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<SettingOutlined />}>
            编辑坐席组
          </Button>
        }
      >
        <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
          <Descriptions.Item label="坐席组名称">
            {group.group_name}
          </Descriptions.Item>
          <Descriptions.Item label="坐席组编码">
            <code
              style={{
                padding: "2px 8px",
                background: "#f5f5f5",
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              {group.group_code}
            </code>
          </Descriptions.Item>
          <Descriptions.Item label="成员数量">
            <Space>
              <UserOutlined style={{ color: "#1890ff" }} />
              <span>{group.member_count} 人</span>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={group.status === 1 ? "green" : "default"}>
              {group.status === 1 ? "启用" : "禁用"}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="描述" span={2}>
            {group.description || "-"}
          </Descriptions.Item>
        </Descriptions>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="高优先级成员"
                value={highPriorityCount}
                suffix="人"
                valueStyle={{ color: "#ff4d4f" }}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="中优先级成员"
                value={mediumPriorityCount}
                suffix="人"
                valueStyle={{ color: "#faad14" }}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="低优先级成员"
                value={lowPriorityCount}
                suffix="人"
                valueStyle={{ color: "#1890ff" }}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "members",
              label: (
                <span>
                  <UserOutlined />
                  成员排序
                </span>
              ),
              children: (
                <MemberSortList
                  members={members}
                  onSave={handleSaveSort}
                  loading={loading}
                />
              ),
            },
            {
              key: "stats",
              label: (
                <span>
                  <BarChartOutlined />
                  数据统计
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
                    <BarChartOutlined
                      style={{ fontSize: 48, marginBottom: 16 }}
                    />
                    <div>坐席组数据统计功能开发中...</div>
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
