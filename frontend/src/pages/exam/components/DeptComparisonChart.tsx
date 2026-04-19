import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Empty, Skeleton, Space, Tabs } from 'antd';
// @ts-ignore
import { Column, Pie } from '@ant-design/plots';
import { examApi } from '@/api/exam';
import { systemApi } from '@/api/system';

interface DeptComparisonChartProps {
  planId: string;
}

export function DeptComparisonChart({ planId }: DeptComparisonChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['exam-dept-comparison', planId],
    queryFn: () => examApi.getDeptComparison(planId),
    enabled: !!planId
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments-for-exam'],
    queryFn: systemApi.listDepartments
  });

  const deptMap = useMemo(() => {
    const map = new Map();
    departments.forEach((dept: any) => {
      map.set(dept.id, dept.name);
    });
    return map;
  }, [departments]);

  const avgScoreData = useMemo(() => {
    if (!data) return [];
    return data.map(item => ({
      dept_name: deptMap.get(item.dept_id) || '未知部门',
      value: Number(item.average_score.toFixed(1)),
      label: `${item.average_score.toFixed(1)}分`
    })).sort((a, b) => b.value - a.value);
  }, [data, deptMap]);

  const passRateData = useMemo(() => {
    if (!data) return [];
    return data.map(item => ({
      dept_name: deptMap.get(item.dept_id) || '未知部门',
      value: Number(item.pass_rate.toFixed(1)),
      label: `${item.pass_rate.toFixed(1)}%`
    })).sort((a, b) => b.value - a.value);
  }, [data, deptMap]);

  const absentRateData = useMemo(() => {
    if (!data) return [];
    return data
      .filter(item => item.absent_count > 0)
      .map(item => ({
        dept_name: deptMap.get(item.dept_id) || '未知部门',
        value: Number(item.absent_rate.toFixed(1)),
        count: item.absent_count
      }));
  }, [data, deptMap]);

  if (isLoading) {
    return (
      <Card title="部门成绩对比" size="small">
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card title="部门成绩对比" size="small">
        <Empty description="暂无数据" />
      </Card>
    );
  }

  const avgScoreConfig = {
    data: avgScoreData,
    xField: 'dept_name',
    yField: 'value',
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
        text: '平均分',
        style: {
          fill: '#475569',
          fontSize: 13
        }
      }
    },
    columnStyle: {
      radius: [8, 8, 0, 0],
      fill: 'l(90) 0:#10b981 1:#34d399'
    },
    tooltip: {
      title: '部门',
      items: [
        {
          field: 'value',
          name: '平均分',
          valueFormatter: (value: number) => `${value}分`
        }
      ]
    },
    height: 300
  };

  const passRateConfig = {
    data: passRateData,
    xField: 'dept_name',
    yField: 'value',
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
        text: '合格率 (%)',
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
      title: '部门',
      items: [
        {
          field: 'value',
          name: '合格率',
          valueFormatter: (value: number) => `${value}%`
        }
      ]
    },
    height: 300
  };

  const absentRateConfig = {
    data: absentRateData,
    angleField: 'value',
    colorField: 'dept_name',
    label: {
      text: 'dept_name',
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
          field: 'value',
          name: '缺考率',
          valueFormatter: (value: number) => `${value}%`
        },
        {
          field: 'count',
          name: '缺考人数',
          valueFormatter: (value: number) => `${value}人`
        }
      ]
    },
    height: 300
  };

  const items = [
    {
      key: 'avg-score',
      label: '平均分对比',
      children: <Column {...avgScoreConfig} />
    },
    {
      key: 'pass-rate',
      label: '合格率对比',
      children: <Column {...passRateConfig} />
    },
    {
      key: 'absent-rate',
      label: '缺考率分布',
      children: absentRateData.length > 0 ? (
        <Pie {...absentRateConfig} />
      ) : (
        <Empty description="无缺考数据" />
      )
    }
  ];

  return (
    <Card title="部门成绩对比" size="small">
      <Tabs items={items} />
    </Card>
  );
}
