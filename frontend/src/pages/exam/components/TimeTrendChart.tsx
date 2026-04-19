import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Empty, Skeleton } from 'antd';
// @ts-ignore
import { Line } from '@ant-design/plots';
import { examApi } from '@/api/exam';

interface TimeTrendChartProps {
  planId: string;
}

export function TimeTrendChart({ planId }: TimeTrendChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['exam-score-distribution', planId],
    queryFn: () => examApi.getPlanScoreDistribution(planId),
    enabled: !!planId
  });

  const chartData = useMemo(() => {
    if (!data?.time_trend) return [];

    return data.time_trend.map(item => ({
      date: item.date,
      count: item.count,
      label: `${item.count}人`
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card title="提交时间趋势" size="small">
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    );
  }

  if (!data || chartData.length === 0) {
    return (
      <Card title="提交时间趋势" size="small">
        <Empty description="暂无数据" />
      </Card>
    );
  }

  const config = {
    data: chartData,
    xField: 'date',
    yField: 'count',
    point: {
      size: 5,
      shape: 'circle',
      style: {
        fill: '#3b82f6',
        stroke: '#fff',
        lineWidth: 2
      }
    },
    label: {
      text: 'label',
      style: {
        fill: '#334155',
        fontSize: 12,
        fontWeight: 600
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
        text: '提交人数',
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
          field: 'count',
          name: '提交人数',
          valueFormatter: (value: number) => `${value}人`
        }
      ]
    },
    height: 300
  };

  return (
    <Card title="提交时间趋势" size="small">
      <Line {...config} />
    </Card>
  );
}
