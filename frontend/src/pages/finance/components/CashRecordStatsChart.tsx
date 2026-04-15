import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Empty, Skeleton, Statistic, Row, Col, Space } from 'antd';
import { Column, Line, Pie } from '@ant-design/plots';
import { financeApi } from '@/api/finance';

interface CashRecordStatsChartProps {
  platformId: string;
  startDate?: string;
  endDate?: string;
  type?: string;
}

export function CashRecordStatsChart({ platformId, startDate, endDate, type }: CashRecordStatsChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['finance-cash-record-stats', platformId, startDate, endDate, type],
    queryFn: () => financeApi.getCashRecordStats({ platform_id: platformId, start_date: startDate, end_date: endDate, type }),
    enabled: !!platformId
  });

  const typeData = useMemo(() => {
    if (!data?.by_type) return [];
    return data.by_type.map((item: any) => ({
      type: item.type === 1 ? '收入' : '支出',
      amount: item.amount,
      count: item.count
    }));
  }, [data]);

  const trendData = useMemo(() => {
    if (!data?.by_date) return [];
    const result: any[] = [];
    data.by_date.forEach((item: any) => {
      result.push({
        date: item.date,
        type: '收入',
        amount: item.income
      });
      result.push({
        date: item.date,
        type: '支出',
        amount: item.expense
      });
      result.push({
        date: item.date,
        type: '净收支',
        amount: item.balance
      });
    });
    return result;
  }, [data]);

  if (isLoading) {
    return (
      <Card title="收支统计分析" size="small">
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  if (!data) {
    return (
      <Card title="收支统计分析" size="small">
        <Empty description="暂无数据" />
      </Card>
    );
  }

  const typeColumnConfig = {
    data: typeData,
    xField: 'type',
    yField: 'amount',
    label: {
      text: (d: any) => `￥${d.amount.toLocaleString()}`,
      position: 'top' as const,
      style: {
        fill: '#334155',
        fontSize: 12,
        fontWeight: 600
      }
    },
    xAxis: {
      label: {
        style: {
          fill: '#64748b',
          fontSize: 12
        }
      }
    },
    yAxis: {
      label: {
        style: {
          fill: '#64748b',
          fontSize: 12
        }
      },
      title: {
        text: '金额（元）',
        style: {
          fill: '#475569',
          fontSize: 13
        }
      }
    },
    columnStyle: (d: any) => ({
      radius: [8, 8, 0, 0],
      fill: d.type === '收入' ? 'l(90) 0:#10b981 1:#34d399' : 'l(90) 0:#ef4444 1:#f87171'
    }),
    tooltip: {
      title: '类型',
      items: [
        {
          field: 'amount',
          name: '金额',
          valueFormatter: (value: number) => `￥${value.toLocaleString()}`
        },
        {
          field: 'count',
          name: '笔数',
          valueFormatter: (value: number) => `${value}笔`
        }
      ]
    },
    height: 300
  };

  const typePieConfig = {
    data: typeData,
    angleField: 'amount',
    colorField: 'type',
    label: {
      text: 'type',
      style: {
        fontSize: 12,
        fontWeight: 600
      }
    },
    legend: {
      color: {
        title: false,
        position: 'right' as const,
        rowPadding: 5
      }
    },
    tooltip: {
      title: '类型',
      items: [
        {
          field: 'amount',
          name: '金额',
          valueFormatter: (value: number) => `￥${value.toLocaleString()}`
        },
        {
          field: 'count',
          name: '笔数',
          valueFormatter: (value: number) => `${value}笔`
        }
      ]
    },
    height: 300
  };

  const trendConfig = {
    data: trendData,
    xField: 'date',
    yField: 'amount',
    seriesField: 'type',
    point: {
      size: 5,
      shape: 'circle'
    },
    xAxis: {
      label: {
        autoHide: false,
        autoRotate: false,
        style: {
          fill: '#64748b',
          fontSize: 12
        }
      },
      title: {
        text: '日期',
        style: {
          fill: '#475569',
          fontSize: 13
        }
      }
    },
    yAxis: {
      label: {
        style: {
          fill: '#64748b',
          fontSize: 12
        }
      },
      title: {
        text: '金额（元）',
        style: {
          fill: '#475569',
          fontSize: 13
        }
      }
    },
    legend: {
      position: 'top' as const
    },
    tooltip: {
      title: '日期',
      items: [
        {
          field: 'amount',
          name: '金额',
          valueFormatter: (value: number) => `￥${value.toLocaleString()}`
        }
      ]
    },
    height: 300
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      {/* 统计汇总 */}
      <Card title="收支统计汇总" size="small">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic 
              title="总收入" 
              value={data.summary.total_income} 
              prefix="￥" 
              precision={2}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="总支出" 
              value={data.summary.total_expense} 
              prefix="￥" 
              precision={2}
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="净收支" 
              value={data.summary.balance} 
              prefix="￥" 
              precision={2}
              valueStyle={{ color: data.summary.balance >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="总笔数" 
              value={data.summary.income_count + data.summary.expense_count} 
              suffix="笔" 
            />
          </Col>
        </Row>
      </Card>

      {/* 收支对比柱状图 */}
      <Card title="收支对比" size="small">
        {typeData.length > 0 ? (
          <Column {...typeColumnConfig} />
        ) : (
          <Empty description="暂无数据" />
        )}
      </Card>

      {/* 收支占比饼图 */}
      <Card title="收支占比" size="small">
        {typeData.length > 0 ? (
          <Pie {...typePieConfig} />
        ) : (
          <Empty description="暂无数据" />
        )}
      </Card>

      {/* 时间趋势 */}
      <Card title="收支时间趋势" size="small">
        {trendData.length > 0 ? (
          <Line {...trendConfig} />
        ) : (
          <Empty description="暂无数据" />
        )}
      </Card>
    </Space>
  );
}
