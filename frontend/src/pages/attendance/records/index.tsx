import React, { useRef } from 'react';
import { Button, message, Space, DatePicker, Input } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import BaseTable from '@/components/table/BaseTable';
import ActionGroup from '@/components/common/ActionGroup';
import StatusTag from '@/components/common/StatusTag';
import Permission from '@/components/permission/Permission';
import { attendanceApi } from '@/api/attendance';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const AttendanceRecords: React.FC = () => {
  const tableRef = useRef<any>();

  const getStatusType = (status: number) => {
    switch (status) {
      case 1: return 'enabled'; // 正常
      case 2: return 'warning'; // 迟到
      case 3: return 'warning'; // 早退
      case 4: return 'error'; // 旷工
      case 5: return 'error'; // 漏打卡
      default: return 'default';
    }
  };

  const getStatusText = (status: number) => {
    const map: any = { 1: '正常', 2: '迟到', 3: '早退', 4: '旷工', 5: '漏打卡' };
    return map[status] || '未知';
  };

  const columns = [
    {
      title: '员工',
      dataIndex: 'employee_name',
      key: 'employee_name',
      className: 'font-bold text-slate-900',
    },
    {
      title: '工号',
      dataIndex: 'employee_no',
      key: 'employee_no',
      className: 'text-slate-600',
    },
    {
      title: '日期',
      dataIndex: 'attendance_date',
      key: 'attendance_date',
      render: (val: string) => <span className="text-slate-900">{dayjs(val).format('YYYY-MM-DD')}</span>,
    },
    {
      title: '班次',
      dataIndex: 'shift_name',
      key: 'shift_name',
      render: (val: string) => val ? <StatusTag color="blue" text={val} /> : '--',
    },
    {
      title: '上班打卡',
      key: 'on_duty',
      render: (_: any, record: any) => (
        <Space direction="vertical" size={0}>
          <div className="text-slate-900 font-medium">
            {record.actual_on_duty_time ? dayjs(record.actual_on_duty_time).format('HH:mm:ss') : '未打卡'}
          </div>
          <StatusTag 
            status={getStatusType(record.on_duty_status)} 
            text={`[上班] ${getStatusText(record.on_duty_status)}`} 
          />
        </Space>
      ),
    },
    {
      title: '下班打卡',
      key: 'off_duty',
      render: (_: any, record: any) => (
        <Space direction="vertical" size={0}>
          <div className="text-slate-900 font-medium">
            {record.actual_off_duty_time ? dayjs(record.actual_off_duty_time).format('HH:mm:ss') : '未打卡'}
          </div>
          <StatusTag 
            status={getStatusType(record.off_duty_status)} 
            text={`[下班] ${getStatusText(record.off_duty_status)}`} 
          />
        </Space>
      ),
    },
    {
      title: '异常说明',
      dataIndex: 'exception_type',
      key: 'exception_type',
      className: 'text-rose-600 font-medium',
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 120,
      render: (_: any, record: any) => (
        <ActionGroup
          actions={[
            {
              key: 'recalc',
              label: '重新计算',
              permission: 'attendance:records:update',
              onClick: async () => {
                try {
                  await attendanceApi.reCalculate?.(record.id);
                  message.success('计算成功');
                  tableRef.current?.reload();
                } catch (e) {
                  message.error('计算失败');
                }
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="leixi-page-container">
      <div className="flex items-center gap-4 mb-4 bg-white p-4 rounded shadow-sm">
        <div className="flex-grow">
          <RangePicker 
            key="range"
            style={{ width: '100%', height: '44px' }}
            className="leixi-filter-border"
            onChange={(dates, dateStrings) => {
              tableRef.current?.setParams({ dateRange: dateStrings });
              tableRef.current?.reload();
            }}
          />
        </div>
        <Input.Search 
          key="search"
          placeholder="搜索员工姓名/工号"
          onSearch={(val) => {
            tableRef.current?.setParams({ keyword: val });
            tableRef.current?.reload();
          }}
          style={{ width: 250, height: '44px' }}
          className="leixi-filter-border"
        />
      </div>

      <BaseTable
        ref={tableRef}
        columns={columns.map(col => ({
            ...col,
            className: col.className ? `${col.className} leixi-text-main` : 'leixi-text-main'
        }))}
        request={async (params: any) => {
          const res = await attendanceApi.listRecords({
            keyword: params.keyword,
            start_date: params.dateRange?.[0],
            end_date: params.dateRange?.[1],
            current: params.current,
            pageSize: params.pageSize
          });
          return {
            data: res.data,
            total: res.total,
            success: true,
          };
        }}
      />
    </div>
  );
};

export default AttendanceRecords;
