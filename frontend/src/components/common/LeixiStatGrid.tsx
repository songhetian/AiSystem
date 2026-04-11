import React from 'react';
import { Card, Space, Statistic, Row, Col } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

export interface StatItem {
  key: string;
  title: string;
  value: string | number;
  prefix?: React.ReactNode;
  suffix?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  color?: string;
}

interface LeixiStatGridProps {
  items: StatItem[];
  loading?: boolean;
}

const LeixiStatGrid: React.FC<LeixiStatGridProps> = ({ items, loading }) => {
  return (
    <Row gutter={[24, 24]} className="mb-8">
      {items.map((item) => (
        <Col xs={24} sm={12} md={6} key={item.key}>
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
            {/* 左侧装饰色条 */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2" 
              style={{ backgroundColor: item.color || '#0f172a' }} 
            />
            
            <div className="flex flex-col space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {item.title}
              </span>
              
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-slate-900 tracking-tighter">
                  {loading ? '---' : item.value}
                </span>
                {item.suffix && (
                  <span className="text-xs font-black text-slate-400">{item.suffix}</span>
                )}
              </div>

              {item.trend && (
                <div className={`flex items-center space-x-1 text-[10px] font-black ${item.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {item.trend === 'up' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  <span>{item.trendValue}</span>
                  <span className="text-slate-300 ml-1">VS 上月</span>
                </div>
              )}
            </div>

            {/* 背景图标装饰 */}
            <div className="absolute right-[-10px] bottom-[-10px] text-slate-50 opacity-50 group-hover:opacity-100 transition-all">
              {item.prefix && React.cloneElement(item.prefix as React.ReactElement, { 
                style: { fontSize: '64px' } 
              })}
            </div>
          </div>
        </Col>
      ))}
    </Row>
  );
};

export default LeixiStatGrid;
