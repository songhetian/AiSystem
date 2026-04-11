import { Button, Input, Select, Space, DatePicker } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";

const { RangePicker } = DatePicker;

interface RequestFilterBarProps {
  onSearch: (keyword: string) => void;
  onRefresh: () => void;
}

export const RequestFilterBar = ({ onSearch, onRefresh }: RequestFilterBarProps) => {
  return (
    <div className="flex justify-between items-center mb-4 p-4 bg-white shadow-sm rounded-lg">
      <Space>
        <Input 
          placeholder="搜索关键字..." 
          prefix={<SearchOutlined />} 
          style={{ width: 240, height: 44 }} 
          onChange={(e) => onSearch(e.target.value)}
        />
        <Select placeholder="审批状态" style={{ width: 150, height: 44 }}>
          <Select.Option value={0}>待审批</Select.Option>
          <Select.Option value={1}>已通过</Select.Option>
          <Select.Option value={2}>已拒绝</Select.Option>
        </Select>
        <RangePicker style={{ height: 44 }} />
      </Space>
      <Button icon={<ReloadOutlined />} onClick={onRefresh} style={{ height: 44 }}>刷新</Button>
    </div>
  );
};
