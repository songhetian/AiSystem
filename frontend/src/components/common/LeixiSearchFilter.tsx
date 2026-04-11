import React from 'react';
import { Input, Select, DatePicker, Space, Button, Form } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export interface FilterField {
  name: string;
  label?: string;
  type: 'text' | 'select' | 'range' | 'date';
  placeholder?: string;
  options?: { label: string; value: any }[];
  initialValue?: any;
}

interface LeixiSearchFilterProps {
  fields: FilterField[];
  onSearch: (values: any) => void;
  onReset?: () => void;
  showQuickDate?: boolean;
}

const LeixiSearchFilter: React.FC<LeixiSearchFilterProps> = ({ fields, onSearch, onReset, showQuickDate = true }) => {
  const [form] = Form.useForm();

  const handleQuickDate = (days: number) => {
    const end = dayjs();
    const start = dayjs().subtract(days, 'day');
    form.setFieldsValue({ dateRange: [start, end] });
    onSearch(form.getFieldsValue());
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
      <Form form={form} layout="inline" className="flex flex-wrap items-center gap-y-4 w-full" onFinish={onSearch}>
        {fields.map((field) => (
          <Form.Item key={field.name} name={field.name} className="flex-grow min-w-[200px] !mr-4" initialValue={field.initialValue}>
            {field.type === 'text' && (
              <Input prefix={<SearchOutlined className="text-slate-400" />} placeholder={field.placeholder || `搜索${field.label || ''}`} className="h-11 rounded-xl border-slate-200 font-bold" />
            )}
            {field.type === 'select' && (
              <Select placeholder={field.placeholder || `选择${field.label || ''}`} options={field.options} className="h-11 rounded-xl font-bold" />
            )}
            {field.type === 'range' && (
              <RangePicker className="h-11 rounded-xl border-slate-200 font-bold w-full" />
            )}
          </Form.Item>
        ))}

        <Form.Item className="!mr-0">
          <Space size="middle">
            <Button type="primary" htmlType="submit" className="h-11 px-8 rounded-xl bg-slate-900 border-none font-black shadow-lg shadow-slate-200">
              查询
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => { form.resetFields(); onReset?.(); }} className="h-11 px-6 rounded-xl border-slate-200 font-bold text-slate-500" />
          </Space>
        </Form.Item>
      </Form>

      {showQuickDate && fields.some(f => f.type === 'range') && (
        <div className="flex items-center mt-4 pt-4 border-t border-slate-50">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">快捷筛选:</span>
          <div className="flex rounded-lg border border-slate-500 p-0.5 overflow-hidden">
            {[
              { label: '今天', val: 0 },
              { label: '近7天', val: 7 },
              { label: '近30天', val: 30 },
              { label: '本月', val: 'month' }
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={() => typeof btn.val === 'number' ? handleQuickDate(btn.val) : null}
                className="h-8 px-4 text-xs font-black text-slate-600 hover:bg-slate-100 transition-all border-r border-slate-200 last:border-none"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeixiSearchFilter;
