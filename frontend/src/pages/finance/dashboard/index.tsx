import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Row, Col, Statistic, Typography, Space, Button, DatePicker, Select, Divider, Table, Tag, Badge as AntBadge } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, AccountBookOutlined, WalletOutlined, PieChartOutlined } from '@ant-design/icons';
import { financeApi } from '@/api/finance';
import { systemApi } from '@/api/system';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface CashRecord {
  id: string;
  source: string;
  amount: number;
  type: number;
  biz_type: string;
  create_time: string;
}

export default function FinanceDashboardPage() {
  const [platformId, setPlatformId] = useState<string>('');
  
  // 1. 数据查询
  const { data: platforms = [] } = useQuery({
    queryKey: ['system-platforms'],
    queryFn: systemApi.listPlatforms
  });

  const { data: stats } = useQuery({
    queryKey: ['finance-stats', platformId],
    queryFn: () => financeApi.getDashboardStats(platformId),
    enabled: !!platformId
  });

  const { data: cashRecords = [] } = useQuery<CashRecord[]>({
    queryKey: ['finance-cash-recent', platformId],
    queryFn: () => financeApi.listCashRecords({ platform_id: platformId }),
    enabled: !!platformId
  });

  return (
    <div className="p-4 space-y-4 bg-slate-50 min-h-screen">
      {/* 核心筛选区 */}
      <Card bordered={false} className="shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-grow min-w-[200px]">
            <Select 
              placeholder="选择统计平台" 
              className="w-full h-[44px]"
              options={(platforms as any[]).map(p => ({ label: p.name, value: p.id }))}
              onChange={setPlatformId}
            />
          </div>
          
          <div className="flex items-center h-[44px]">
            <Space.Compact className="h-full">
              <Button className="h-full border-slate-500 font-bold text-slate-900 px-4 hover:bg-slate-100 bg-white">今日</Button>
              <Button className="h-full border-slate-500 border-l-0 font-bold text-slate-900 px-4 hover:bg-slate-100 bg-white">本周</Button>
              <Button className="h-full border-slate-500 border-l-0 font-bold text-slate-900 px-4 hover:bg-slate-100 bg-white">本月</Button>
              <Button className="h-full border-slate-500 border-l-0 font-bold text-slate-900 px-4 hover:bg-slate-100 bg-white">本年</Button>
              <RangePicker 
                className="h-full border-slate-500 border-l-0" 
                style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, width: 280 }} 
              />
            </Space.Compact>
          </div>

          <Button type="primary" className="h-[44px] px-8 font-black text-lg">立即分析</Button>
        </div>
      </Card>

      {/* 指标卡片 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card bordered={false} className="shadow-sm border-l-4 border-l-blue-600">
            <Statistic
              title={<Text className="font-bold text-slate-600">总报销额</Text>}
              value={stats?.overview?.reimbursement ?? 0}
              precision={2}
              prefix="￥"
              valueStyle={{ color: '#0f172a', fontWeight: 900, fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} className="shadow-sm border-l-4 border-l-orange-600">
            <Statistic
              title={<Text className="font-bold text-slate-600">总采购额</Text>}
              value={stats?.overview?.purchase ?? 0}
              precision={2}
              prefix="￥"
              valueStyle={{ color: '#0f172a', fontWeight: 900, fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} className="shadow-sm border-l-4 border-l-green-600">
            <Statistic
              title={<Text className="font-bold text-slate-600">本月净收入</Text>}
              value={(stats?.overview?.income || 0) - (stats?.overview?.expense || 0)}
              precision={2}
              prefix="￥"
              valueStyle={{ color: '#16a34a', fontWeight: 900, fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} className="shadow-sm border-l-4 border-l-red-600">
            <Statistic
              title={<Text className="font-bold text-slate-600">异常单据</Text>}
              value={2}
              valueStyle={{ color: '#dc2626', fontWeight: 900, fontSize: 28 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card 
            title={<Title level={5} className="m-0 font-black text-slate-900"><AccountBookOutlined className="mr-2" />收支趋势统计</Title>} 
            bordered={false} 
            className="shadow-sm min-h-[400px]"
          >
            <div className="flex items-end justify-between h-64 px-4 mt-8">
              {[40, 60, 30, 80, 95, 45, 70, 55, 90, 65, 40, 85].map((h, i) => (
                <div key={i} className="flex flex-col items-center gap-2 group w-full max-w-[40px]">
                  <div className="w-full bg-blue-100 rounded-t-sm" style={{ height: `${h}%` }} />
                  <Text className="text-[10px] text-slate-400 font-bold">{i + 1}月</Text>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card 
            title={<Title level={5} className="m-0 font-black text-slate-900"><PieChartOutlined className="mr-2" />费用结构分布</Title>} 
            bordered={false} 
            className="shadow-sm min-h-[400px]"
          >
            <div className="flex flex-col gap-4 mt-4">
              {[
                { label: '办公耗材', val: 45, color: '#2563eb' },
                { label: '差旅报销', val: 25, color: '#f97316' },
                { label: '人力外包', val: 20, color: '#16a34a' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <Text className="font-bold text-slate-700">{item.label}</Text>
                    <Text className="font-black text-slate-900">{item.val}%</Text>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div style={{ width: `${item.val}%`, backgroundColor: item.color, height: '100%' }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      <Card 
        title={<Title level={5} className="m-0 font-black text-slate-900"><WalletOutlined className="mr-2" />实时财务流水</Title>} 
        bordered={false} 
        className="shadow-sm"
      >
        <Table<CashRecord>
          size="middle"
          pagination={false}
          dataSource={cashRecords}
          rowKey="id"
          columns={[
            { title: '流水号', dataIndex: 'id', render: (t) => <Text className="font-bold text-slate-500 text-xs">#{t.slice(-8)}</Text> },
            { title: '事由/来源', dataIndex: 'source', render: (t) => <Text className="font-black text-slate-900">{t}</Text> },
            { 
              title: '金额', 
              dataIndex: 'amount', 
              render: (v, r) => (
                <Text className={`font-black text-lg ${r.type === 1 ? 'text-green-600' : 'text-red-600'}`}>
                  {r.type === 1 ? '+' : '-'}￥{Number(v).toFixed(2)}
                </Text>
              ) 
            },
            { 
              title: '业务关联', 
              dataIndex: 'biz_type', 
              render: (t) => <Tag className="font-bold border-slate-300">{t === 'reimbursement' ? '报销申请' : '采购申请'}</Tag> 
            },
            { title: '发生时间', dataIndex: 'create_time', className: 'text-slate-500 text-xs' }
          ]}
        />
      </Card>
    </div>
  );
}
