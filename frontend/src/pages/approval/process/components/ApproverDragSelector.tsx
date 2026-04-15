import { useState } from "react";
import { Card, Input, Space, Tag, Typography, Empty, Avatar } from "antd";
import {
  SearchOutlined,
  UserOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { BaseDrag } from "@/components/common/BaseDrag";
import type { ApprovalPerson } from "@/api/approval";

const { Text } = Typography;

interface ApproverDragSelectorProps {
  availablePeople: ApprovalPerson[];
  selectedPeople: ApprovalPerson[];
  onChange: (people: ApprovalPerson[]) => void;
  title?: string;
  placeholder?: string;
}

export const ApproverDragSelector = ({
  availablePeople,
  selectedPeople,
  onChange,
  title = "审批人",
  placeholder = "从左侧拖拽或点击添加审批人",
}: ApproverDragSelectorProps) => {
  const [searchKeyword, setSearchKeyword] = useState("");

  // 过滤可用人员（排除已选择的）
  const filteredAvailablePeople = availablePeople.filter((person) => {
    const isSelected = selectedPeople.some((p) => p.id === person.id);
    if (isSelected) return false;

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      return (
        person.name.toLowerCase().includes(keyword) ||
        person.department?.toLowerCase().includes(keyword) ||
        person.position?.toLowerCase().includes(keyword)
      );
    }
    return true;
  });

  const handleAddPerson = (person: ApprovalPerson) => {
    if (!selectedPeople.some((p) => p.id === person.id)) {
      onChange([...selectedPeople, person]);
    }
  };

  const handleRemovePerson = (personId: string) => {
    onChange(selectedPeople.filter((p) => p.id !== personId));
  };

  const handleReorder = (newOrder: ApprovalPerson[]) => {
    onChange(newOrder);
  };

  const renderPersonCard = (
    person: ApprovalPerson,
    isAvailable: boolean = false,
  ) => (
    <Card
      className={`mb-2 ${isAvailable ? "cursor-pointer hover:shadow-md hover:border-blue-400" : "cursor-move hover:shadow-md"} transition-all`}
      bodyStyle={{ padding: "12px" }}
      onClick={isAvailable ? () => handleAddPerson(person) : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <Avatar size={40} icon={<UserOutlined />} className="bg-blue-500" />
          <div className="flex-1">
            <Text strong className="block text-slate-900">
              {person.name}
            </Text>
            <Space size={4} className="mt-1">
              {person.department && (
                <Tag className="text-xs" color="blue">
                  {person.department}
                </Tag>
              )}
              {person.position && (
                <Tag className="text-xs" color="green">
                  {person.position}
                </Tag>
              )}
            </Space>
          </div>
        </div>
        {!isAvailable && (
          <CloseCircleOutlined
            className="text-red-500 text-lg cursor-pointer hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              handleRemovePerson(person.id);
            }}
          />
        )}
      </div>
    </Card>
  );

  const renderSelectedPerson = (person: ApprovalPerson, index: number) => (
    <Card
      className="mb-2 cursor-move hover:shadow-md transition-all"
      bodyStyle={{ padding: "12px" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-50 rounded-full">
            <Text className="text-sm font-bold text-blue-600">{index + 1}</Text>
          </div>
          <Avatar size={40} icon={<UserOutlined />} className="bg-blue-500" />
          <div className="flex-1">
            <Text strong className="block text-slate-900">
              {person.name}
            </Text>
            <Space size={4} className="mt-1">
              {person.department && (
                <Tag className="text-xs" color="blue">
                  {person.department}
                </Tag>
              )}
              {person.position && (
                <Tag className="text-xs" color="green">
                  {person.position}
                </Tag>
              )}
            </Space>
          </div>
        </div>
        <CloseCircleOutlined
          className="text-red-500 text-lg cursor-pointer hover:text-red-600"
          onClick={() => handleRemovePerson(person.id)}
        />
      </div>
    </Card>
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 左侧：可用人员列表 */}
      <Card
        title={
          <div>
            <Text strong className="text-base">
              可选人员
            </Text>
            <Text className="text-xs text-slate-500 ml-2">
              ({filteredAvailablePeople.length}人)
            </Text>
          </div>
        }
        className="shadow-sm"
        bodyStyle={{ padding: "16px", maxHeight: "500px", overflowY: "auto" }}
      >
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索姓名、部门、岗位"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="mb-3"
          allowClear
        />

        {filteredAvailablePeople.length > 0 ? (
          <div>
            {filteredAvailablePeople.map((person) => (
              <div key={person.id}>{renderPersonCard(person, true)}</div>
            ))}
          </div>
        ) : (
          <Empty
            description={searchKeyword ? "未找到匹配的人员" : "暂无可选人员"}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>

      {/* 右侧：已选审批人列表（支持拖拽排序） */}
      <Card
        title={
          <div>
            <Text strong className="text-base">
              {title}
            </Text>
            <Text className="text-xs text-slate-500 ml-2">
              ({selectedPeople.length}人)
            </Text>
          </div>
        }
        className="shadow-sm"
        bodyStyle={{ padding: "16px", maxHeight: "500px", overflowY: "auto" }}
      >
        {selectedPeople.length > 0 ? (
          <>
            <div className="mb-3 p-2 bg-blue-50 rounded-lg">
              <Text className="text-xs text-blue-800">
                💡 拖拽卡片可调整审批顺序
              </Text>
            </div>
            <BaseDrag
              items={selectedPeople}
              getItemId={(item) => item.id}
              onDragEnd={handleReorder}
              renderItem={renderSelectedPerson}
              direction="vertical"
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <Empty
              description={placeholder}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        )}
      </Card>
    </div>
  );
};
