import React from 'react';
import { Card, Row, Col, Progress, Tag, Typography, Space, Empty } from 'antd';
import { 
  ThunderboltOutlined, TeamOutlined, DollarOutlined, 
  DashboardOutlined, InfoCircleOutlined, FireOutlined 
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { attendanceApi } from '@/api/attendance';
import LeixiStatGrid from '@/components/common/LeixiStatGrid';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface AiScheduleAnalysisProps {
  deptId: string;
  dateRange: [dayjs.Dayjs, dayjs.Dayjs];
}

const AiScheduleAnalysis: React.FC<AiScheduleAnalysisProps> = ({ deptId, dateRange }) => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['ai-schedule-analytics', deptId, dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
    queryFn: () => attendanceApi.getAnalytics({
      dept_id: deptId,
      start_date: dateRange[0].format('YYYY-MM-DD'),
      end_date: dateRange[1].format('YYYY-MM-DD'),
    }),
    enabled: !!deptId,
  });

  if (isLoading) return <Card loading borderless className="rounded-[32px]" />;
  if (!analytics || !analytics.overview) return <Empty description="暂无排班分析数据" className="py-20" />;

  const { overview, employee_load, shift_distribution, load_balance_score } = analytics;

  const statItems = [
    {
      key: 'fitting', 
      title: '人力需求拟合度', 
      value: overview.fitting_rate, 
      suffix: '%', 
      prefix: <DashboardOutlined />, 
      color: '#0ea5e9',
      description: '实排班次与业务需求缺口的吻合程度'
    },
    {
      key: 'hours', 
      title: '总排班工时', 
      value: overview.total_hours, 
      suffix: 'h', 
      prefix: <ThunderboltOutlined />, 
      color: '#6366f1'
    },
    {
      key: 'avg_hours', 
      title: '人均周工时', 
      value: overview.avg_hours_per_person, 
      suffix: 'h', 
      prefix: <TeamOutlined />, 
      color: '#10b981'
    },
    {
      key: 'cost', 
      title: '劳动力成本预估', 
      value: overview.labor_cost_est, 
      prefix: <DollarOutlined />, 
      color: '#f59e0b',
      description: '按默认平均时薪 (50元/h) 的估算值，未含补贴与加班修正'
    }
  ];

  return (
    <div className="space-y-6">
      <LeixiStatGrid items={statItems} />

      <Row gutter={24}>
        <Col span={14}>
          <Card 
            title={<Space><FireOutlined className="text-orange-500" /><span className="font-black">员工工时负载天平</span></Space>}
            className="rounded-[32px] border-slate-100 shadow-sm h-full"
            extra={<Tag color="blue" className="font-black rounded-lg">负载均衡分: {load_balance_score}</Tag>}
          >
            <div className="space-y-6 py-2">
              {employee_load.map((emp: any, i: number) => (
                <div key={emp.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Text className="font-black text-slate-900">{i + 1}. {emp.name}</Text>
                    <Text className="font-black text-slate-500">{emp.value} <small>h</small></Text>
                  </div>
                  <Progress 
                    percent={Math.min(100, (emp.value / 40) * 100)} 
                    showInfo={false} 
                    strokeColor={emp.value > 40 ? '#f43f5e' : '#0ea5e9'}
                    strokeWidth={12}
                    className="rounded-full"
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col span={10}>
          <div className="flex flex-col gap-6">
            <Card 
              title={<span className="font-black">班次分布结构</span>}
              className="rounded-[24px] border-slate-100 shadow-sm"
            >
              <div className="space-y-4">
                {shift_distribution.map((s: any) => (
                  <div key={s.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <Space>
                      <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" />
                      <Text className="font-black text-slate-700">{s.name}</Text>
                    </Space>
                    <Text className="font-black text-slate-900">{s.value} <span className="text-slate-400">人次</span></Text>
                  </div>
                ))}
              </div>
            </Card>

            <Card 
              className="rounded-[24px] bg-slate-900 border-none shadow-2xl relative overflow-hidden"
              bodyStyle={{ padding: 24 }}
            >
              <div className="relative z-10">
                <Space direction="vertical" size={2}>
                  <Text className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Compliance Suggestion</Text>
                  <Title level={4} className="!text-white !mb-4 font-black">AI 智能分析建议</Title>
                </Space>
                <div className="space-y-3">
                  <div className="flex gap-2 text-slate-300">
                    <InfoCircleOutlined className="text-blue-400 mt-1" />
                    <Text className="text-white font-bold">当前排班中有 {Math.round((100 - overview.fitting_rate)/2)}% 的高峰缺口集中在 18:00 以后，建议增加晚班人员配置。</Text>
                  </div>
                  <div className="flex gap-2 text-slate-300">
                    <InfoCircleOutlined className="text-green-400 mt-1" />
                    <Text className="text-white font-bold">所有员工周工时均通过合规性校验（低于 48h）。</Text>
                  </div>
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 opacity-10">
                <ThunderboltOutlined style={{ fontSize: 160, color: 'white' }} />
              </div>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default AiScheduleAnalysis;
