/**
 * 考勤记录页面（优化版）
 * 使用新的组件库重构，提供更好的视觉效果和用户体验
 */

import React, { useRef, useState } from 'react';
import { message, Space } from 'antd';
import { ReloadOutlined, SettingOutlined, DownloadOutlined, CalculatorOutlined } from '@ant-design/icons';
import { PageContainer, SectionCard } from '@/components/layout';
import { FilterBar, ActionBar, StatusTag } from '@/components/business';
import { Table, Button, Modal } from '@/components/ui';
import { useQuery } from '@tanstack/react-query';
import { attendanceApi } from '@/api/attendance';
import { useDebounce } from '@/hooks/useDebounce';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatDate, formatTimeOnly } from '@/utils/format';

/**
 * 考勤记录数据类型
 */
interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_no?: string;
  department_name?: string;
  attendance_date: string;
  check_in_time?: string;
  check_out_time?: string;
  work_hours?: number;
  overtime_hours?: number;
  status: number;
  status_text: string;
  late_minutes?: number;
  early_minutes?: number;
  created_time: string;
  updated_time?: string;
}

const AttendanceRecordsPage: React.FC = () => {
  // 状态管理
  const [filters, setFilters] = useState<any>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reCalculateVisible, setReCalculateVisible] = useState(false);

  // 防抖搜索
  const debouncedFilters = useDebounce(filters, 500);

  // 快捷键支持
  useKeyboardShortcuts({
    'Ctrl+r': () => refetch(),
    'Ctrl+e': () => handleExport(),
  });

  // 查询考勤记录
  const { data: records = [], isLoading, refetch } = useQuery({
    queryKey: ['attendance-records', debouncedFilters],
    queryFn: () => attendanceApi.listRecords(debouncedFilters),
    staleTime: 2 * 60 * 1000,
  });

  // 表格列配置
  const columns = [
    {
      title: '员工信息',
      key: 'employee',
      width: 200,
      fixed: 'left' as const,
      render: (_: any, record: AttendanceRecord) => (
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
      title: '考勤日期',
      dataIndex: 'attendance_date',
      key: 'attendance_date',
      width: 120,
      render: (date: string) => formatDate(date, 'MM-DD'),
    },
    {
      title: '上班打卡',
      dataIndex: 'check_in_time',
      key: 'check_in_time',
      width: 100,
      render: (time: string) => time ? formatTimeOnly(time) : '-',
    },
    {
      title: '下班打卡',
      dataIndex: 'check_out_time',
      key: 'check_out_time',
      width: 100,
      render: (time: string) => time ? formatTimeOnly(time) : '-',
    },
    {
      title: '工作时长',
      dataIndex: 'work_hours',
      key: 'work_hours',
      width: 100,
      render: (hours: number) => hours ? `${hours.toFixed(1)}h` : '-',
    },
    {
      title: '加班时长',
      dataIndex: 'overtime_hours',
      key: 'overtime_hours',
      width: 100,
      render: (hours: number) => hours ? `${hours.toFixed(1)}h` : '-',
    },
    {
      title: '迟到/早退',
      key: 'late_early',
      width: 120,
      render: (_: any, record: AttendanceRecord) => (
        <Space direction="vertical" size={0}>
          {record.late_minutes ? (
            <span style={{ color: '#ff4d4f', fontSize: 12 }}>
              迟到 {record.late_minutes}分钟
            </span>
          ) : null}
          {record.early_minutes ? (
            <span style={{ color: '#ff4d4f', fontSize: 12 }}>
              早退 {record.early_minutes}分钟
            </span>
          ) : null}
          {!record.late_minutes && !record.early_minutes && '-'}
        </Space>
      ),
    },
    {
      title: '考勤状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number, record: AttendanceRecord) => {
        const statusMap = {
          1: { status: 'success', text: '正常' },
          2: { status: 'warning', text: '迟到' },
          3: { status: 'warning', text: '早退' },
          4: { status: 'error', text: '旷工' },
          5: { status: 'error', text: '漏打卡' },
        };
        const config = statusMap[status as keyof typeof statusMap] || { status: 'default', text: record.status_text };
        return <StatusTag status={config.status as any} text={config.text} />;
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updated_time',
      key: 'updated_time',
      width: 160,
      render: (date: string) => date ? formatDate(date) : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: AttendanceRecord) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<CalculatorOutlined />}
            onClick={() => handleReCalculate(record)}
          >
            重算
          </Button>
        </Space>
      ),
    },
  ];

  // 筛选处理
  const handleSearch = (values: any) => {
    setFilters(values);
  };

  // 重置筛选
  const handleReset = () => {
    setFilters({});
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
      await attendanceApi.exportRecords(filters);
      message.destroy();
      message.success('导出成功');
    } catch (error: any) {
      message.destroy();
      message.error(error?.response?.data?.message || '导出失败');
    }
  };

  // 重新计算考勤
  const handleReCalculate = (record: AttendanceRecord) => {
    Modal.confirm({
      title: '确认重新计算',
      content: `确定要重新计算 ${record.employee_name} 在 ${formatDate(record.attendance_date)} 的考勤数据吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          message.loading('正在重新计算...', 0);
          await attendanceApi.reCalculate(record.id);
          message.destroy();
          message.success('重新计算成功');
          refetch();
        } catch (error: any) {
          message.destroy();
          message.error(error?.response?.data?.message || '重新计算失败');
        }
      },
    });
  };

  // 批量重新计算
  const handleBatchReCalculate = async () => {
    if (selectedIds.length === 0) {
      message.warning('请先选择要重新计算的记录');
      return;
    }

    Modal.confirm({
      title: '确认批量重新计算',
      content: `确定要重新计算选中的 ${selectedIds.length} 条考勤记录吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          message.loading('正在批量重新计算...', 0);
          await attendanceApi.batchReCalculate({ ids: selectedIds });
          message.destroy();
          message.success('批量重新计算成功');
          setSelectedIds([]);
          refetch();
        } catch (error: any) {
          message.destroy();
          message.error(error?.response?.data?.message || '批量重新计算失败');
        }
      },
    });
  };

  // 过滤数据
  const filteredData = records.filter((record: AttendanceRecord) => {
    if (filters.employeeName && !record.employee_name.includes(filters.employeeName)) {
      return false;
    }
    if (filters.status !== undefined && record.status !== filters.status) {
      return false;
    }
    if (filters.dateRange && filters.dateRange.length === 2) {
      const recordDate = new Date(record.attendance_date);
      const startDate = new Date(filters.dateRange[0]);
      const endDate = new Date(filters.dateRange[1]);
      if (recordDate < startDate || recordDate > endDate) {
        return false;
      }
    }
    return true;
  });

  return (
    <PageContainer
      title="考勤记录"
      subTitle="查看和管理员工考勤打卡记录，支持重新计算和数据导出"
      breadcrumb={{
        items: [
          { title: '首页', path: '/' },
          { title: '考勤管理' },
          { title: '考勤记录' },
        ],
      }}
    >
      {/* 筛选区域 */}
      <SectionCard title="筛选条件" collapsible defaultCollapsed={false}>
        <FilterBar
          items={[
            {
              name: 'employeeName',
              label: '员工姓名',
              type: 'input',
              placeholder: '请输入员工姓名',
            },
            {
              name: 'dateRange',
              label: '考勤日期',
              type: 'dateRange',
              placeholder: ['开始日期', '结束日期'],
            },
            {
              name: 'status',
              label: '考勤状态',
              type: 'select',
              options: [
                { label: '全部状态', value: undefined },
                { label: '正常', value: 1 },
                { label: '迟到', value: 2 },
                { label: '早退', value: 3 },
                { label: '旷工', value: 4 },
                { label: '漏打卡', value: 5 },
              ],
            },
          ]}
          glass
          onSearch={handleSearch}
          onReset={handleReset}
        />
      </SectionCard>

      {/* 数据区域 */}
      <SectionCard>
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
              label: '导出数据',
              icon: <DownloadOutlined />,
              onClick: handleExport,
            },
            {
              key: 'batch-recalculate',
              label: `批量重算${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`,
              icon: <CalculatorOutlined />,
              disabled: selectedIds.length === 0,
              onClick: handleBatchReCalculate,
            },
          ]}
          extra={
            <Space>
              <span style={{ color: '#999', fontSize: 14 }}>
                共 {filteredData.length} 条记录
                {selectedIds.length > 0 && ` / 已选 ${selectedIds.length} 条`}
              </span>
            </Space>
          }
          align="space-between"
          glass
        />

        <Table
          columns={columns}
          dataSource={filteredData}
          loading={isLoading}
          glass
          density="compact"
          striped
          hoverable
          rowKey="id"
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: (keys: React.Key[]) => setSelectedIds(keys as string[]),
          }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1200 }}
        />
      </SectionCard>
    </PageContainer>
  );
};

export default AttendanceRecordsPage;
