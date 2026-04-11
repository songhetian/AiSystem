import { Button, DatePicker, Select, Space } from 'antd';
import { useState } from 'react';

const { RangePicker } = DatePicker;

interface FinanceFilterBarProps {
  platforms: any[];
}

export const FinanceFilterBar = ({ platforms }: FinanceFilterBarProps) => {
  return (
    <div className="flex flex-wrap items-center gap-4 w-full">
      <div className="flex-grow min-w-[200px]">
        <Select
          placeholder="选择统计平台"
          className="w-full h-[44px]"
          options={platforms.map(p => ({ label: p.name, value: p.id }))}
          onChange={(val) => {
            // 实现全局 scope 的更新或页面刷新
            window.location.search = `?platform_id=${val}`;
          }}
        />
      </div>

      <div className="flex items-center h-[44px]">
        <Space.Compact className="h-full">
          {['今天', '近7天', '本月', '本年'].map((label) => (
            <Button 
              key={label}
              className="h-full border-slate-500 font-bold text-slate-900 px-4 hover:bg-slate-100 bg-white"
            >
              {label}
            </Button>
          ))}
          <RangePicker 
            className="h-full border-slate-500 border-l-0" 
            style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, width: 280 }} 
          />
        </Space.Compact>
      </div>

      <Button type="primary" className="h-[44px] px-8 font-black text-lg">
        立即分析
      </Button>
    </div>
  );
};
