import { useState, useEffect } from "react";
import {
  Button,
  Card,
  Space,
  Tag,
  Avatar,
  message,
  Empty,
  Tooltip,
} from "antd";
import { UserOutlined, PhoneOutlined, CrownOutlined } from "@ant-design/icons";
import { BaseDrag } from "@/components/common/BaseDrag";
import "./MemberSortList.less";

export interface AgentGroupMember {
  id: string;
  group_id: string;
  agent_id: string;
  agent_name: string;
  agent_phone?: string;
  priority: number;
  sort: number;
  status: number;
}

interface MemberSortListProps {
  members: AgentGroupMember[];
  onSave: (members: AgentGroupMember[]) => void;
  loading?: boolean;
}

export function MemberSortList({
  members,
  onSave,
  loading,
}: MemberSortListProps) {
  const [sortedMembers, setSortedMembers] = useState<AgentGroupMember[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (members.length > 0) {
      const sorted = [...members].sort((a, b) => (a.sort || 0) - (b.sort || 0));
      setSortedMembers(sorted);
      setHasChanges(false);
    } else {
      setSortedMembers([]);
    }
  }, [members]);

  const handleDragEnd = (newItems: AgentGroupMember[]) => {
    setSortedMembers(newItems);
    setHasChanges(true);
  };

  const handleSave = () => {
    const items = sortedMembers.map((member, index) => ({
      ...member,
      sort: index,
      priority: index < 3 ? 1 : index < 6 ? 2 : 3,
    }));
    onSave(items);
    setHasChanges(false);
  };

  const handleReset = () => {
    const sorted = [...members].sort((a, b) => (a.sort || 0) - (b.sort || 0));
    setSortedMembers(sorted);
    setHasChanges(false);
  };

  if (sortedMembers.length === 0) {
    return (
      <Empty
        description="暂无坐席组成员"
        style={{ padding: "60px 0" }}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <Card
      title={
        <Space>
          <UserOutlined />
          <span>成员排序</span>
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
      <div className="member-sort-container">
        <div className="sort-tip">
          <UserOutlined />{" "}
          拖拽调整坐席组成员的优先级，排序越靠前优先级越高（优先分配会话）
        </div>

        <BaseDrag
          items={sortedMembers}
          getItemId={(member) => member.id}
          onDragEnd={handleDragEnd}
          renderItem={(member, index) => {
            const calculatedPriority = index < 3 ? 1 : index < 6 ? 2 : 3;

            return (
              <div className="member-sort-item">
                <span className="drag-handle">⋮⋮</span>
                <span className="sort-number">{index + 1}</span>

                <Avatar
                  size={48}
                  icon={<UserOutlined />}
                  style={{
                    backgroundColor:
                      calculatedPriority === 1
                        ? "#ff4d4f"
                        : calculatedPriority === 2
                          ? "#faad14"
                          : "#1890ff",
                  }}
                />

                <div className="member-info">
                  <div className="member-header">
                    <Space size={8} wrap>
                      <Tooltip title={member.agent_name}>
                        <span className="member-name">{member.agent_name}</span>
                      </Tooltip>

                      {index === 0 && (
                        <Tag color="gold" icon={<CrownOutlined />}>
                          组长
                        </Tag>
                      )}

                      <Tag
                        color={
                          calculatedPriority === 1
                            ? "red"
                            : calculatedPriority === 2
                              ? "orange"
                              : "blue"
                        }
                      >
                        {calculatedPriority === 1
                          ? "高"
                          : calculatedPriority === 2
                            ? "中"
                            : "低"}
                        优先级
                      </Tag>

                      {member.status === 0 && <Tag color="default">已禁用</Tag>}
                    </Space>
                  </div>

                  {member.agent_phone && (
                    <div className="member-contact">
                      <Space size={4}>
                        <PhoneOutlined style={{ color: "#8c8c8c" }} />
                        <span className="phone-number">
                          {member.agent_phone}
                        </span>
                      </Space>
                    </div>
                  )}

                  <div className="member-tips">
                    <Space size={4} wrap>
                      {calculatedPriority === 1 && (
                        <Tag color="red-inverse" className="tip-tag">
                          优先接待客户
                        </Tag>
                      )}
                      {calculatedPriority === 2 && (
                        <Tag color="orange-inverse" className="tip-tag">
                          正常接待客户
                        </Tag>
                      )}
                      {calculatedPriority === 3 && (
                        <Tag color="blue-inverse" className="tip-tag">
                          备用接待客户
                        </Tag>
                      )}
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
