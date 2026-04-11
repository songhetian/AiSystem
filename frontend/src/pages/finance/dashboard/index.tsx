import { useQuery } from '@tanstack/react-query';
import { Card, Row, Col, Typography, Table, Tag } from 'antd';
import { AccountBookOutlined, PieChartOutlined, WalletOutlined } from '@ant-design/icons';
import { financeApi } from '@/api/finance';
import { systemApi } from '@/api/system';
import { useAppScope } from '@/hooks/useAppScope';
import { FinanceFilterBar } from './components/FinanceFilterBar';
import { StatisticCard } from './components/StatisticCard';
import type { CashRecord } from '@/api/finance';

const { Title, Text } = Typography;

export default function FinanceDashboardPage() {
  const { platformId } = useAppScope();
  
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
      <Card bordered={false} className="shadow-sm">
        <FinanceFilterBar platforms={platforms as any[]} />
      </Card>

      <Row gutter={16}>
        <Col span={6}><StatisticCard title="总报销额" value={stats?.overview?.reimbursement ?? 0} borderColor="border-l-blue-600" /></Col>
        <Col span={6}><StatisticCard title="总采购额" value={stats?.overview?.purchase ?? 0} borderColor="border-l-orange-600" /></Col>
        <Col span={6}>
            <StatisticCard 
                title="本月净收入" 
                value={(stats?.overview?.income || 0) - (stats?.overview?.expense || 0)} 
                borderColor="border-l-green-600" 
            />
        </Col>
        <Col span={6}><StatisticCard title="异常单据" value={2} prefix="" borderColor="border-l-red-600" /></Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card title={<Title level={5} className="m-0 font-black text-slate-900"><AccountBookOutlined className="mr-2" />收支趋势统计</Title>} bordered={false} className="shadow-sm min-h-[400px]">
            <div className="flex items-end justify-between h-64 px-4 mt-8">
              {[40, 60, 30, 80, 95, 45, 70, 55, 90, 65, 40, 85].map((h, i) => (
                <div key={i} className="flex flex-col items-center gap-2 w-full max-w-[40px]">
                  <div className="w-full bg-blue-100 rounded-t-sm" style={{ height: `${h}%` }} />
                  <Text className="text-[10px] text-slate-400 font-bold">{i + 1}月</Text>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title={<Title level={5} className="m-0 font-black text-slate-900"><PieChartOutlined className="mr-2" />费用结构分布</Title>} bordered={false} className="shadow-sm min-h-[400px]">
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

      <Card title={<Title level={5} className="m-0 font-black text-slate-900"><WalletOutlined className="mr-2" />实时财务流水</Title>} bordered={false} className="shadow-sm">
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
