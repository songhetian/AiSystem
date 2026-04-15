import { useState } from 'react';
import { Card, DatePicker, Select, Space, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { ReimbursementStatsChart } from '../components/ReimbursementStatsChart';
import { useAppScope } from '@/hooks/useAppScope';
import { useQuery } from '@tanstack/react-query';
import { systemApi } from '@/api/system';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export default function ReimbursementStatsPage() {
  const { platformId } = useAppScope();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [deptId, setDeptId] = useState<string>();

  const { data: departments = [] } = useQuery({
    queryKey: ['system-departments'],
    queryFn: systemApi.listDepartments
  });

  const startDate = dateRange?.[0]?.format('YYYY-MM-DD');
  const endDate = dateRange?.[1]?.format('YYYY-MM-DD');

  const handleQuickDate = (days: number) => {
    const end = dayjs();
    const start = end.subtract(days, 'day');
    setDateRange([start, end]);
  };

  return (
    <div className="leixi-page-container">
      <div className="mb-4">
        <h1 className="leixi-text-main text-2xl mb-2">报销统计分析</h1>
        <p className="leixi-text-secondary">多维度统计报销数据，生成可视化图表，为管理决策提供数据支撑。</p>
      </div>

      <Card className="shadow-sm mb-4" bodyStyle={{ padding: '20px' }}>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="leixi-text-secondary font-bold">时间范围:</span>
            <RangePicker 
              style={{ height: '44px' }} 
              value={dateRange}
              onChange={(dates) => setDateRange(dates as any)}
            />
          </div>

          <div className="flex items-center">
            <Space.Compact>
              <Button 
                style={{ height: '44px', borderColor: '#64748b' }} 
                onClick={() => handleQuickDate(7)}
              >
                近7天
              </Button>
              <Button 
                style={{ height: '44px', borderColor: '#64748b' }} 
                onClick={() => handleQuickDate(30)}
              >
                近30天
              </Button>
              <Button 
                style={{ height: '44px', borderColor: '#64748b' }} 
                onClick={() => handleQuickDate(90)}
              >
                近90天
              </Button>
            </Space.Compact>
          </div>

          <div className="flex items-center gap-2">
            <span className="leixi-text-secondary font-bold">部门:</span>
            <Select
              allowClear
              style={{ width: 200, height: '44px' }}
              placeholder="选择部门"
              value={deptId}
              onChange={setDeptId}
              options={departments.map((dept: any) => ({
                label: dept.name,
                value: dept.id
              }))}
            />
          </div>

          <Button 
            icon={<DownloadOutlined />} 
            style={{ height: '44px', borderColor: '#64748b' }} 
            className="font-bold text-slate-900 border-2"
          >
            导出报表
          </Button>
        </div>
      </Card>

      <ReimbursementStatsChart 
        platformId={platformId} 
        startDate={startDate}
        endDate={endDate}
        deptId={deptId}
      />
    </div>
  );
}
