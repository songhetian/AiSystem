import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Statistic, Row, Col, Space, Typography, Badge } from 'antd';
import { BulbOutlined, AlertOutlined, SafetyCertificateOutlined, MessageOutlined } from '@ant-design/icons';
import { serviceApi } from '@/api/service';

const { Title, Text } = Typography;

export default function ServiceDashboard() {
  const { data: metrics } = useQuery({
    queryKey: ['service.dashboardMetrics'],
    queryFn: () => serviceApi.getDashboardMetrics(),
  });

  return (
    <div className="p-6 h-full flex flex-col gap-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <Title level={4} className="!m-0 text-slate-900 font-black tracking-tight">智能质检总览数据</Title>
        <Space>
           <Text className="text-slate-500 font-bold">数据刷新时间: {new Date().toLocaleString()}</Text>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        <Col span={6}>
          <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow">
            <Statistic
              title={<Text className="text-slate-600 font-bold">总会话数</Text>}
              value={metrics?.totalSessions || 0}
              prefix={<MessageOutlined className="text-slate-500" />}
              valueStyle={{ color: '#0f172a', fontWeight: 900 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow">
             <Statistic
              title={<Text className="text-slate-600 font-bold">高危流失会话</Text>}
              value={metrics?.lossSessionCount || 0}
              prefix={<AlertOutlined className="text-rose-500" />}
              valueStyle={{ color: '#e11d48', fontWeight: 900 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow">
            <Statistic
              title={<Text className="text-slate-600 font-bold">质检合格率</Text>}
              value={metrics?.qualityPassRate || 0}
              suffix="%"
              prefix={<SafetyCertificateOutlined className="text-emerald-500" />}
              valueStyle={{ color: '#059669', fontWeight: 900 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow">
            <Statistic
              title={<Text className="text-slate-600 font-bold">敏感词拦截</Text>}
              value={metrics?.sensitiveHitCount || 0}
              prefix={<BulbOutlined className="text-amber-500" />}
              valueStyle={{ color: '#b45309', fontWeight: 900 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} className="flex-1">
        <Col span={12}>
           <Card title={<span className="text-slate-900 font-black">流失风险分布</span>} bordered={false} className="h-full shadow-sm">
             {/* 当前仓库未接入图表组件，这里保留数据面板展示，避免引入未安装依赖 */}
             <div className="flex flex-col gap-4 mt-4">
                 <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                   <Text className="text-slate-600 font-bold"><Badge status="error" text="高风险" /></Text>
                   <Text className="text-slate-900 font-black">{metrics?.riskBuckets?.high || 0}</Text>
                 </div>
                 <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                   <Text className="text-slate-600 font-bold"><Badge status="warning" text="中等风险" /></Text>
                   <Text className="text-slate-900 font-black">{metrics?.riskBuckets?.medium || 0}</Text>
                 </div>
                 <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                   <Text className="text-slate-600 font-bold"><Badge status="success" text="低风险" /></Text>
                   <Text className="text-slate-900 font-black">{metrics?.riskBuckets?.low || 0}</Text>
                 </div>
             </div>
           </Card>
        </Col>
        <Col span={12}>
           <Card title={<span className="text-slate-900 font-black">当期 TOP 高频问题</span>} bordered={false} className="h-full shadow-sm">
              <div className="flex flex-col gap-3">
                 {metrics?.topFaqs?.map((faq: any, index: number) => (
                    <div key={index} className="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-100">
                       <Text className="text-slate-900 font-bold truncate max-w-[80%]">{index + 1}. {faq.question}</Text>
                       <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs font-black">{faq.count} 次</span>
                    </div>
                 )) || <Text className="text-slate-500 font-bold">暂无高频问题数据</Text>}
              </div>
           </Card>
        </Col>
      </Row>
    </div>
  );
}
