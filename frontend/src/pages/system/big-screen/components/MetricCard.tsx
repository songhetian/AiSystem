import React from 'react';
import { Card, Typography, Space } from 'antd';
import { RiseOutlined, FallOutlined, MinusOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface Props {
  title: string;
  value: string | number;
  suffix?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: React.ReactNode;
  color?: string;
  status?: 'normal' | 'abnormal';
}

/**
 * 工业级核心指标卡片 (Section 2.2.1)
 * 特点：slate-900 超粗体、极致间距控制
 */
export const MetricCard: React.FC<Props> = ({ 
  title, value, suffix, trend, trendValue, icon, color = '#0f172a', status = 'normal' 
}) => {
  const isAbnormal = status === 'abnormal';

  return (
    <Card 
      bordered={false} 
      className={`shadow-sm hover:shadow-md transition-all duration-300 border rounded-xl bg-white group ${
        isAbnormal ? 'border-rose-300 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'border-slate-100'
      }`}
    >
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center mb-1">
          <Text className="text-slate-500 text-xs font-black uppercase tracking-widest">{title}</Text>
          <div className="text-slate-400 group-hover:text-slate-900 transition-colors">
            {icon}
          </div>
        </div>

        <div className="flex items-baseline gap-1">
          <Title level={2} className="!m-0 text-slate-900 font-black tracking-tighter" style={{ color }}>
            {value}
          </Title>
          {suffix && (
            <Text className="text-slate-400 text-sm font-bold lowercase">{suffix}</Text>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between">
           <div className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${
             trend === 'up' ? 'bg-emerald-50 text-emerald-600' :
             trend === 'down' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'
           }`}>
             {trend === 'up' && <RiseOutlined className="text-[10px]" />}
             {trend === 'down' && <FallOutlined className="text-[10px]" />}
             {trend === 'stable' && <MinusOutlined className="text-[10px]" />}
             <Text className="text-[10px] font-black">{trendValue || 'Stable'}</Text>
           </div>
           
           <div className="h-1 w-12 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-slate-200" 
                style={{ width: '60%', transition: 'width 1s ease-in-out' }} 
              />
           </div>
        </div>
      </div>
    </Card>
  );
};
