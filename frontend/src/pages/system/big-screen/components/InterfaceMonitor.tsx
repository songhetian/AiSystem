import React from 'react';
import { Card, Space, Typography, Tag, Progress, Badge } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, SyncOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface InterfaceStat {
  id: string;
  time: string;
  avgResponseTime: number;
  successRate: number;
  failCount: number;
  totalCount: number;
  status: 'normal' | 'abnormal';
}

interface Props {
  data: InterfaceStat[];
  loading?: boolean;
}

/**
 * 接口监控可视化组件 (Section 2.2.5)
 * 工业化设计：高对比度、呼吸灯预警、极简指标
 */
export const InterfaceMonitor: React.FC<Props> = ({ data, loading }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {data.map((item) => (
        <Card
          key={item.id}
          bordered={false}
          className={`relative overflow-hidden transition-all duration-300 shadow-sm border-l-4 ${
            item.status === 'abnormal' ? 'border-rose-500 bg-rose-50' : 'border-emerald-500 bg-white'
          }`}
        >
          {item.status === 'abnormal' && (
            <div className="absolute top-2 right-2 flex items-center gap-1 animate-pulse">
              <Badge status="error" />
              <Text className="text-rose-600 text-[10px] font-black tracking-tighter uppercase">Alert Critical</Text>
            </div>
          )}

          <div className="flex flex-col gap-3">
             <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${
                  item.status === 'abnormal' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {item.status === 'abnormal' ? <ExclamationCircleOutlined /> : <CheckCircleOutlined />}
                </div>
                <Title level={5} className="!m-0 text-slate-900 font-black tracking-tight">API 端点 {item.id.slice(0, 4)}</Title>
             </div>

             <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                <div className="flex flex-col">
                   <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest">Success Rate</Text>
                   <Title level={3} className="!m-0 text-slate-900 font-black">{item.successRate.toFixed(1)}%</Title>
                </div>
                <div className="w-16">
                   <Progress 
                     percent={item.successRate} 
                     showInfo={false} 
                     size="small" 
                     strokeColor={item.successRate < 90 ? '#f43f5e' : '#10b981'}
                     trailColor="#f1f5f9"
                   />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                   <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-none">Latency</Text>
                   <Text className={`text-sm font-black ${item.avgResponseTime > 500 ? 'text-amber-600' : 'text-slate-700'}`}>
                     {item.avgResponseTime}ms
                   </Text>
                </div>
                <div className="flex flex-col">
                   <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-none">Daily Fails</Text>
                   <Text className={`text-sm font-black ${item.failCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                     {item.failCount}
                   </Text>
                </div>
             </div>

             <div className="mt-1 flex items-center gap-1">
                <SyncOutlined spin={loading} className="text-slate-400 text-[10px]" />
                <Text className="text-slate-400 text-[10px] font-bold uppercase">Real-time Stats Sync</Text>
             </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
