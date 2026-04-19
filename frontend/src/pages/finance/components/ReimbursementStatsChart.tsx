import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Empty, Skeleton, Statistic, Row, Col, Space } from 'antd';
// @ts-ignore
import { Column, Pie, Line } from '@ant-design/plots';
import { financeApi } from '@/api/finance';

interface ReimbursementStatsChartProps {
  platformId: string;
  startDate?: string;
  endDate?: string;
  deptId?: string;
}

export function ReimbursementStatsChart({ platformId, startDate, endDate, deptId }: ReimbursementStatsChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['finance-reimbursement-stats', platformId, startDate, endDate, deptId],
    queryFn: () => financeApi.getReimbursementStats({ platform_id: platformId, start_date: startDate, end_date: endDate, dept_id: deptId }),
    enabled: !!platformId
  });

  const expenseTypeData = useMemo(() => {
    if (!data?.by_expense_type) return [];
    return data.by_expense_type.map((item: any) => ({
      type: item.expense_type_id,
      amount: item.amount,
      count: item.count,
      label: `￥${item.amount.toLocaleString()}`
    })).sort((a: any, b: any) => b.amount - a.amount);
  }, [data]);

  const departmentData = useMemo(() => {
    if (!data?.by_department) return [];
    return data.by_department.map((item: any) => ({
      dept: item.dept_id,
      amount: item.amount,
      count: item.count,
      label: `￥${item.amount.toLocaleString()}`
    })).sort((a: any, b: any) => b.amount - a.amount);
  }, [data]);

  const trendData = useMemo(() => {
    if (!data?.by_date) return [];
    return data.by_date.map((item: any) => ({
      date: item.date,
      amount: item.amount,
      count: item.count
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card title="报销统计分析" size="small">
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  if (!data) {
    return (
      <Card title="报销统计分析" size="small">
        <Empty description="暂无数据" />
      </Card>
    );
  }

  const expenseTypeConfig = {
    data: expenseTypeData,
    xField: 'type',
    yField: 'amount',
    label: {
      text: 'label',
      position: 'top' as const,
      style: {
        fill: '#334155',
        fontSize: 12,
        fontWeight: 600
      }
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
        text: '费用类型',
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
        text: '报销金额（元）',
        style: {
          fill: '#475569',
          fontSize: 13
        }
      }
    },
    columnStyle: {
      radius: [8, 8, 0, 0],
      fill: 'l(90) 0:#3b82f6 1:#60a5fa'
    },
    tooltip: {
      title: '费用类型',
      items: [
        {
          field: 'amount',
          name: '报销金额',
          valueFormatter: (value: number) => `￥${value.toLocaleString()}`
        },
        {
          field: 'count',
          name: '报销笔数',
          valueFormatter: (value: number) => `${value}笔`
        }
      ]
    },
    height: 300
  };

  const departmentPieConfig = {
    data: departmentData,
    angleField: 'amount',
    colorField: 'dept',
    label: {
      text: 'dept',
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
      title: '部门',
      items: [
        {
          field: 'amount',
          name: '报销金额',
          valueFormatter: (value: number) => `￥${value.toLocaleString()}`
        },
        {
          field: 'count',
          name: '报销笔数',
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
    point: {
      size: 5,
      shape: 'circle',
      style: {
        fill: '#3b82f6',
        stroke: '#fff',
        lineWidth: 2
      }
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
        text: '报销金额（元）',
        style: {
          fill: '#475569',
          fontSize: 13
        }
      }
    },
    style: {
      stroke: '#3b82f6',
      lineWidth: 3
    },
    tooltip: {
      title: '日期',
      items: [
        {
          field: 'amount',
          name: '报销金额',
          valueFormatter: (value: number) => `￥${value.toLocaleString()}`
        },
        {
          field: 'count',
          name: '报销笔数',
          valueFormatter: (value: number) => `${value}笔`
        }
      ]
    },
    height: 300
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      {/* 统计汇总 */}
      <Card title="报销统计汇总" size="small">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="总报销笔数" value={data.summary.total_count} suffix="笔" />
          </Col>
          <Col span={6}>
            <Statistic title="总报销金额" value={data.summary.total_amount} prefix="￥" precision={2} />
          </Col>
          <Col span={6}>
            <Statistic title="平均报销金额" value={data.summary.average_amount} prefix="￥" precision={2} />
          </Col>
          <Col span={6}>
            <Statistic title="通过率" value={data.summary.pass_rate} suffix="%" />
          </Col>
        </Row>
      </Card>

      {/* 按费用类型统计 */}
      <Card title="按费用类型统计" size="small">
        {expenseTypeData.length > 0 ? (
          <Column {...expenseTypeConfig} />
        ) : (
          <Empty description="暂无数据" />
        )}
      </Card>

      {/* 按部门统计 */}
      <Card title="按部门统计" size="small">
        {departmentData.length > 0 ? (
          <Pie {...departmentPieConfig} />
        ) : (
          <Empty description="暂无数据" />
        )}
      </Card>

      {/* 时间趋势 */}
      <Card title="报销时间趋势" size="small">
        {trendData.length > 0 ? (
          <Line {...trendConfig} />
        ) : (
          <Empty description="暂无数据" />
        )}
      </Card>
    </Space>
  );
}
