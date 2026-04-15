import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Empty, Skeleton, Statistic, Row, Col, Space } from 'antd';
import { Column, Line } from '@ant-design/plots';
import { financeApi } from '@/api/finance';

interface PurchaseStatsChartProps {
  platformId: string;
  startDate?: string;
  endDate?: string;
  deptId?: string;
}

export function PurchaseStatsChart({ platformId, startDate, endDate, deptId }: PurchaseStatsChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['finance-purchase-stats', platformId, startDate, endDate, deptId],
    queryFn: () => financeApi.getPurchaseStats({ platform_id: platformId, start_date: startDate, end_date: endDate, dept_id: deptId }),
    enabled: !!platformId
  });

  const departmentData = useMemo(() => {
    if (!data?.by_department) return [];
    return data.by_department.map((item: any) => ({
      dept: item.dept_id,
      planned: item.planned_amount,
      actual: item.actual_amount,
      count: item.count
    })).sort((a, b) => b.actual - a.actual);
  }, [data]);

  const trendData = useMemo(() => {
    if (!data?.by_date) return [];
    const result: any[] = [];
    data.by_date.forEach((item: any) => {
      result.push({
        date: item.date,
        type: '预算金额',
        amount: item.planned_amount
      });
      result.push({
        date: item.date,
        type: '实际金额',
        amount: item.actual_amount
      });
    });
    return result;
  }, [data]);

  if (isLoading) {
    return (
      <Card title="采购统计分析" size="small">
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  if (!data) {
    return (
      <Card title="采购统计分析" size="small">
        <Empty description="暂无数据" />
      </Card>
    );
  }

  const departmentConfig = {
    data: departmentData.flatMap(item => [
      { dept: item.dept, type: '预算金额', amount: item.planned },
      { dept: item.dept, type: '实际金额', amount: item.actual }
    ]),
    xField: 'dept',
    yField: 'amount',
    seriesField: 'type',
    isGroup: true,
    columnStyle: {
      radius: [8, 8, 0, 0]
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
        style: {
          fill: '#64748b',
          fontSize: 12
        }
      },
      title: {
        text: '部门',
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
        text: '采购金额（元）',
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
      title: '部门',
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
        text: '采购金额（元）',
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
      <Card title="采购统计汇总" size="small">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="总采购笔数" value={data.summary.total_count} suffix="笔" />
          </Col>
          <Col span={6}>
            <Statistic title="预算金额" value={data.summary.planned_amount} prefix="￥" precision={2} />
          </Col>
          <Col span={6}>
            <Statistic title="实际金额" value={data.summary.actual_amount} prefix="￥" precision={2} />
          </Col>
          <Col span={6}>
            <Statistic 
              title="预算差异" 
              value={data.summary.variance} 
              prefix="￥" 
              precision={2}
              valueStyle={{ color: data.summary.variance > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Col>
        </Row>
      </Card>

      {/* 按部门统计 */}
      <Card title="按部门统计（预算vs实际）" size="small">
        {departmentData.length > 0 ? (
          <Column {...departmentConfig} />
        ) : (
          <Empty description="暂无数据" />
        )}
      </Card>

      {/* 时间趋势 */}
      <Card title="采购时间趋势（预算vs实际）" size="small">
        {trendData.length > 0 ? (
          <Line {...trendConfig} />
        ) : (
          <Empty description="暂无数据" />
        )}
      </Card>
    </Space>
  );
}
