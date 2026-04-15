import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Empty, Skeleton } from 'antd';
import { Column } from '@ant-design/plots';
import { examApi } from '@/api/exam';

interface ScoreDistributionChartProps {
  planId: string;
}

export function ScoreDistributionChart({ planId }: ScoreDistributionChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['exam-score-distribution', planId],
    queryFn: () => examApi.getPlanScoreDistribution(planId),
    enabled: !!planId
  });

  const chartData = useMemo(() => {
    if (!data?.score_ranges) return [];
    
    return Object.entries(data.score_ranges).map(([range, count]) => ({
      range,
      count,
      label: `${count}人`
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card title="成绩分布" size="small">
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    );
  }

  if (!data || chartData.length === 0) {
    return (
      <Card title="成绩分布" size="small">
        <Empty description="暂无数据" />
      </Card>
    );
  }

  const config = {
    data: chartData,
    xField: 'range',
    yField: 'count',
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
        autoHide: false,
        autoRotate: false,
        style: {
          fill: '#64748b',
          fontSize: 12
        }
      },
      title: {
        text: '分数段',
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
        text: '人数',
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
      title: '分数段',
      items: [
        {
          field: 'count',
          name: '人数',
          valueFormatter: (value: number) => `${value}人`
        }
      ]
    },
    height: 300
  };

  return (
    <Card 
      title="成绩分布" 
      size="small"
      extra={
        <span className="text-slate-500 text-sm">
          已交卷 {data.total_submitted} 人 | 平均分 {data.average_score.toFixed(1)} | 合格率 {data.pass_rate.toFixed(1)}%
        </span>
      }
    >
      <Column {...config} />
    </Card>
  );
}
