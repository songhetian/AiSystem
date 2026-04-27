import React from 'react';
import { Card, Table, Statistic, Badge, Space, Typography } from 'antd';
import type { TableProps, CardProps } from 'antd';
import { TrendingUpOutlined, TrendingDownOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * 工业级企业卡片 - 钉钉风格
 */
export const EnterpriseCard: React.FC<CardProps> = ({ children, className, ...props }) => (
  <Card 
    className={`dingtalk-card ${className || ''}`} 
    bordered={false}
    {...props}
  >
    {children}
  </Card>
);

/**
 * 指标趋势组件
 */
export const GrowthIndicator: React.FC<{ value: number; label: string }> = ({ value, label }) => {
  const isPositive = value > 0;
  const isNegative = value < 0;
  
  return (
    <div className="flex items-center gap-1 animate-data-flow">
      <span className="text-xs text-gray-400">{label}</span>
      {isPositive && <TrendingUpOutlined className="text-green-500" style={{ fontSize: 10 }} />}
      {isNegative && <TrendingDownOutlined className="text-red-500" style={{ fontSize: 10 }} />}
      <span className={`text-xs font-bold ${
        isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-gray-400'
      }`}>
        {value > 0 ? '+' : ''}{value}%
      </span>
    </div>
  );
};

/**
 * 工业级核心指标组件
 */
export const IndustrialStatistic: React.FC<{
  title: string;
  value: number | string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  growth?: number;
  precision?: number;
}> = ({ title, value, prefix, suffix, growth, precision = 0 }) => (
  <div className="p-1">
    <div className="text-xs text-gray-500 mb-1 font-medium">{title}</div>
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-black text-slate-900 tracking-tight animate-data-flow">
        {prefix && <span className="text-sm mr-1 opacity-50">{prefix}</span>}
        {value}
        {suffix && <span className="text-sm ml-1 opacity-50">{suffix}</span>}
      </span>
      {growth !== undefined && (
        <GrowthIndicator value={growth} label="环比" />
      )}
    </div>
  </div>
);

/**
 * 工业级表格 - 钉钉风格覆盖
 */
export function IndustrialTable<T extends object>(props: TableProps<T>) {
  return (
    <Table<T>
      className="enterprise-table"
      rowClassName="row-hover-effect"
      {...props}
    />
  );
}

/**
 * 实时同步状态标签
 */
export const SyncStatusTag: React.FC<{ connected: boolean; lastSync?: string }> = ({ connected, lastSync }) => (
  <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full">
    <Badge status={connected ? "processing" : "default"} />
    <span className="text-xs font-medium text-slate-600">
      {connected ? '实时连接中' : '连接已断开'}
    </span>
    {lastSync && (
      <span className="text-[10px] text-slate-400 border-l border-slate-200 pl-2 ml-1">
        同步于: {lastSync}
      </span>
    )}
  </div>
);
