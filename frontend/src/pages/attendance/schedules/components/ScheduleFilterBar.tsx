import { Button, DatePicker, Select, Space, Tag, Typography } from 'antd';
import { LeftOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';

const { Text } = Typography;

interface OptionItem {
  label: string;
  value: string;
}

interface ScheduleFilterBarProps {
  month: Dayjs;
  scheduleMode: boolean;
  departments: OptionItem[];
  employees: OptionItem[];
  deptId?: string;
  employeeKeyword?: string;
  scopeLabel: string;
  onMonthChange: (value: Dayjs) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDepartmentChange: (value?: string) => void;
  onEmployeeChange: (value?: string) => void;
  onRefresh: () => void;
  onToggleScheduleMode: () => void;
}

export const ScheduleFilterBar = ({
  month,
  scheduleMode,
  departments,
  employees,
  deptId,
  employeeKeyword,
  scopeLabel,
  onMonthChange,
  onPrevMonth,
  onNextMonth,
  onDepartmentChange,
  onEmployeeChange,
  onRefresh,
  onToggleScheduleMode,
}: ScheduleFilterBarProps) => {
  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Space size={12} wrap>
          <Select
            allowClear
            placeholder="全部部门"
            value={deptId}
            options={departments}
            onChange={onDepartmentChange}
            style={{ width: 180 }}
            size="large"
            showSearch
            optionFilterProp="label"
          />
          <Select
            allowClear
            placeholder="全部员工"
            value={employeeKeyword}
            options={employees}
            onChange={onEmployeeChange}
            style={{ width: 220 }}
            size="large"
            showSearch
            optionFilterProp="label"
          />
          <Space.Compact size="large">
            <Button icon={<LeftOutlined />} onClick={onPrevMonth} />
            <DatePicker
              picker="month"
              allowClear={false}
              value={month}
              onChange={(value) => {
                if (value) onMonthChange(value);
              }}
            />
            <Button icon={<RightOutlined />} onClick={onNextMonth} />
          </Space.Compact>
        </Space>

        <Space size={12} wrap>
          <Button
            type={scheduleMode ? 'default' : 'primary'}
            danger={scheduleMode}
            size="large"
            onClick={onToggleScheduleMode}
          >
            {scheduleMode ? '退出排班' : '进入排班'}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={onRefresh} size="large">
            刷新
          </Button>
        </Space>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Tag color={scheduleMode ? 'processing' : 'default'}>
          {scheduleMode ? '当前处于排班模式' : '当前为只读模式'}
        </Tag>
        <Text type="secondary">
          {scheduleMode ? '请选择班次后点击日历单元格完成排班。' : '进入排班模式后可点击或覆盖排班。'}
        </Text>
        <Tag>{scopeLabel}</Tag>
      </div>
    </div>
  );
};
