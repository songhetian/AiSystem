import { Button, DatePicker, Input, Space } from "antd";
import { SearchOutlined, ReloadOutlined, PlusOutlined } from "@ant-design/icons";

const { RangePicker } = DatePicker;

interface ScheduleFilterBarProps {
  onSearch: (keyword: string) => void;
  onRefresh: () => void;
  onImport: () => void;
}

export const ScheduleFilterBar = ({ onSearch, onRefresh, onImport }: ScheduleFilterBarProps) => {
  return (
    <div className="flex justify-between items-center mb-4 p-4 bg-white shadow-sm rounded-lg">
      <Space>
        <Input placeholder="搜索员工/工号" prefix={<SearchOutlined />} style={{ width: 240, height: 44 }} />
        <RangePicker style={{ height: 44 }} />
      </Space>
      <Space>
        <Button icon={<ReloadOutlined />} onClick={onRefresh} style={{ height: 44 }}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={onImport} style={{ height: 44 }}>导入排班</Button>
      </Space>
    </div>
  );
};
