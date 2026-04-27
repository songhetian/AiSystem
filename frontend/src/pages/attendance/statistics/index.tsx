/**
 * 考勤统计页面（优化版）
 * 使用新的组件库重构，提供更好的视觉效果和用户体验
 */

import React, { useRef, useState } from 'react';
import { message, Tabs, Space } from 'antd';
import {
  DownloadOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  BarChartOutlined,
  DashboardOutlined,
  ReloadOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { PageContainer, SectionCard } from '@/components/layout';
import { FilterBar, ActionBar, MetricsCard } from '@/components/business';
import { Table, Button, Card } from '@/components/ui';
import { useQuery } from '@tanstack/react-query';
import { attendanceApi } from '@/api/attendance';
import { systemApi } from '@/api/system';
import dayjs from 'dayjs';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatDate, formatNumber, formatPercent } from '@/utils/format';
import { useAttendanceStats } from './hooks/useAttendanceStats';
import AiScheduleAnalysis from './components/AiScheduleAnalysis';

/**
 * 考勤统计数据类型
 */
interface AttendanceStatistics {
  employee_id: string;
  employee_name: string;
  employee_no?: string;
  department_name?: string;
  total_days: number;
  work_days: number;
  normal_days: number;
  late_days: number;
  early_days: number;
  absent_days: number;
  missing_punch_days: number;
  total_work_hours: number;
  total_overtime_hours: number;
  normal_rate: number;
  late_rate: number;
  absent_rate: number;
}

const AttendanceStatisticsPage: React.FC = () => {
  // 状态管理
  const [activeTab, setActiveTab] = useState('attendance');
  const [filters, setFilters] = useState<any>({
    month: [dayjs().startOf('month'), dayjs()],
    dept_id: undefined,
  });
  const [data, setData] = useState<AttendanceStatistics[]>([]);

  // 快捷键支持
  useKeyboardShortcuts({
    'Ctrl+r': () => refetch(),
    'Ctrl+e': () => handleExport(),
  });

  // 查询部门列表
  const { data: departments = [] } = useQuery({
    queryKey: ['system-departments'],
    queryFn: systemApi.listDepartments,
    staleTime: 5 * 60 * 1000,
  });

  // 查询考勤统计数据
  const { data: statisticsData, isLoading, refetch } = useQuery({
    queryKey: ['attendance-statistics', filters],
    queryFn: () => attendanceApi.getStatistics({
      month: filters.month?.[0]?.format('YYYY-MM') || dayjs().format('YYYY-MM'),
      dept_id: filters.dept_id,
    }),
    onSuccess: (data) => setData(data || []),
    staleTime: 2 * 60 * 1000,
  });

  // 统计数据
  const stats = useAttendanceStats(data);

  // 部门选项
  const departmentOptions = [
    { label: '全部部门', value: undefined },
    ...departments.map((item: { id: string; name: string }) => ({
      label: item.name,
      value: item.id,
    })),
  ];

  // 表格列配置
  const columns = [
    {
      title: '员工信息',
      key: 'employee',
      width: 200,
      fixed: 'left' as const,
      render: (_: any, record: AttendanceStatistics) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.employee_name}</div>
          {record.employee_no && (
            <div style={{ fontSize: 12, color: '#999' }}>
              工号：{record.employee_no}
            </div>
          )}
          {record.department_name && (
            <div style={{ fontSize: 12, color: '#999' }}>
              {record.department_name}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '应出勤',
      dataIndex: 'total_days',
      key: 'total_days',
      width: 80,
      align: 'center' as const,
      render: (days: number) => `${days}天`,
    },
    {
      title: '实出勤',
      dataIndex: 'work_days',
      key: 'work_days',
      width: 80,
      align: 'center' as const,
      render: (days: number) => `${days}天`,
    },
    {
      title: '正常',
      dataIndex: 'normal_days',
      key: 'normal_days',
      width: 70,
      align: 'center' as const,
      render: (days: number) => (
        <span style={{ color: '#52c41a' }}>{days}</span>
      ),
    },
    {
      title: '迟到',
      dataIndex: 'late_days',
      key: 'late_days',
      width: 70,
      align: 'center' as const,
      render: (days: number) => (
        <span style={{ color: days > 0 ? '#faad14' : '#999' }}>{days}</span>
      ),
    },
    {
      title: '早退',
      dataIndex: 'early_days',
      key: 'early_days',
      width: 70,
      align: 'center' as const,
      render: (days: number) => (
        <span style={{ color: days > 0 ? '#faad14' : '#999' }}>{days}</span>
      ),
    },
    {
      title: '旷工',
      dataIndex: 'absent_days',
      key: 'absent_days',
      width: 70,
      align: 'center' as const,
      render: (days: number) => (
        <span style={{ color: days > 0 ? '#ff4d4f' : '#999' }}>{days}</span>
      ),
    },
    {
      title: '漏打卡',
      dataIndex: 'missing_punch_days',
      key: 'missing_punch_days',
      width: 80,
      align: 'center' as const,
      render: (days: number) => (
        <span style={{ color: days > 0 ? '#ff4d4f' : '#999' }}>{days}</span>
      ),
    },
    {
      title: '工作时长',
      dataIndex: 'total_work_hours',
      key: 'total_work_hours',
      width: 100,
      align: 'center' as const,
      render: (hours: number) => `${hours.toFixed(1)}h`,
    },
    {
      title: '加班时长',
      dataIndex: 'total_overtime_hours',
      key: 'total_overtime_hours',
      width: 100,
      align: 'center' as const,
      render: (hours: number) => `${hours.toFixed(1)}h`,
    },
    {
      title: '出勤率',
      dataIndex: 'normal_rate',
      key: 'normal_rate',
      width: 100,
      align: 'center' as const,
      render: (rate: number) => (
        <span style={{
          color: rate >= 95 ? '#52c41a' : rate >= 85 ? '#faad14' : '#ff4d4f',
          fontWeight: 500,
        }}>
          {formatPercent(rate)}
        </span>
      ),
    },
  ];

  // 筛选处理
  const handleSearch = (values: any) => {
    setFilters(values);
  };

  // 重置筛选
  const handleReset = () => {
    setFilters({
      month: [dayjs().startOf('month'), dayjs()],
      dept_id: undefined,
    });
  };

  // 刷新数据
  const handleRefresh = () => {
    refetch();
    message.success('数据已刷新');
  };

  // 导出数据
  const handleExport = async () => {
    try {
      message.loading('正在导出...', 0);
      await attendanceApi.exportStatistics(filters);
      message.destroy();
      message.success('导出成功');
    } catch (error: any) {
      message.destroy();
      message.error(error?.response?.data?.message || '导出失败');
    }
  };

  return (
    <PageContainer
      title="考勤统计"
      subTitle="多维度考勤数据统计分析，支持AI排班效能洞察"
      breadcrumb={{
        items: [
          { title: '首页', path: '/' },
          { title: '考勤管理' },
          { title: '考勤统计' },
        ],
      }}
    >
      {/* 筛选区域 */}
      <SectionCard title="筛选条件" collapsible defaultCollapsed={false}>
        <FilterBar
          items={[
            {
              name: 'month',
              label: '统计周期',
              type: 'dateRange',
              placeholder: ['开始日期', '结束日期'],
            },
            {
              name: 'dept_id',
              label: '分析部门',
              type: 'select',
              placeholder: '请选择部门',
              options: departmentOptions,
            },
          ]}
          glass
          onSearch={handleSearch}
          onReset={handleReset}
        />
      </SectionCard>

      {/* 统计指标 */}
      <SectionCard title="统计概览">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <MetricsCard
            title="本月统计人数"
            value={stats.total_employees}
            unit="人"
            icon={<TeamOutlined />}
            iconColor="#0f172a"
            glass
          />
          <MetricsCard
            title="平均出勤率"
            value={stats.avg_normal_rate.toFixed(1)}
            unit="%"
            icon={<CheckCircleOutlined />}
            iconColor="#10b981"
            trend="up"
            trendValue="2.4%"
            glass
          />
          <MetricsCard
            title="累计异常人次"
            value={stats.total_exceptions}
            unit="次"
            icon={<WarningOutlined />}
            iconColor="#f43f5e"
            trend="down"
            trendValue="12%"
            glass
          />
        </div>
      </SectionCard>

      {/* 数据区域 */}
      <SectionCard>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'attendance',
              label: (
                <Space>
                  <BarChartOutlined />
                  考勤执行概览
                </Space>
              ),
              children: (
                <div>
                  <ActionBar
                    actions={[
                      {
                        key: 'refresh',
                        label: '刷新数据',
                        icon: <ReloadOutlined />,
                        onClick: handleRefresh,
                      },
                      {
                        key: 'export',
                        label: '导出报表',
                        icon: <DownloadOutlined />,
                        type: 'primary',
                        onClick: handleExport,
                      },
                    ]}
                    extra={
                      <Space>
                        <span style={{ color: '#999', fontSize: 14 }}>
                          共 {data.length} 名员工
                        </span>
                      </Space>
                    }
                    align="space-between"
                    glass
                  />

                  <Table
                    columns={columns}
                    dataSource={data}
                    loading={isLoading}
                    glass
                    density="compact"
                    striped
                    hoverable
                    rowKey="employee_id"
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `共 ${total} 条`,
                    }}
                    scroll={{ x: 1000 }}
                  />
                </div>
              ),
            },
            {
              key: 'scheduling',
              label: (
                <Space>
                  <DashboardOutlined />
                  AI排班效能洞察
                </Space>
              ),
              children: (
                <AiScheduleAnalysis
                  deptId={filters.dept_id}
                  dateRange={filters.month}
                />
              ),
            },
          ]}
        />
      </SectionCard>
    </PageContainer>
  );
};

export default AttendanceStatisticsPage;
