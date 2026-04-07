import React, { useRef, useState, useEffect } from 'react';
import { Card, DatePicker, Row, Col, Statistic, Space, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import BaseTable from '@/components/table/BaseTable';
import { attendanceApi } from '@/api/attendance';
import dayjs from 'dayjs';

const AttendanceStatistics: React.FC = () => {
  const tableRef = useRef<any>();
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [summary, setSummary] = useState({
    total_employees: 0,
    avg_normal_rate: 0,
    total_exceptions: 0
  });

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
      title: '出勤天数',
      dataIndex: 'total_records',
      key: 'total_records',
      className: 'text-slate-900 font-medium',
    },
    {
      title: '正常天数',
      dataIndex: 'normal_days',
      key: 'normal_days',
      render: (val: number) => <span className="text-emerald-600 font-bold">{val}</span>,
    },
    {
      title: '迟到次数',
      dataIndex: 'late_count',
      key: 'late_count',
      render: (val: number) => <span className={val > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}>{val}</span>,
    },
    {
      title: '早退次数',
      dataIndex: 'early_count',
      key: 'early_count',
      render: (val: number) => <span className={val > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}>{val}</span>,
    },
    {
      title: '旷工天数',
      dataIndex: 'absent_days',
      key: 'absent_days',
      render: (val: number) => <span className={val > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>{val}</span>,
    },
    {
      title: '漏打卡次数',
      dataIndex: 'miss_count',
      key: 'miss_count',
      render: (val: number) => <span className={val > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>{val}</span>,
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* 搜索筛选区域：单行全铺满、自适应比例 */}
      <Card bodyStyle={{ padding: '12px 24px' }}>
        <div className="flex items-center w-full space-x-4">
          <div className="flex-none font-bold text-slate-900 mr-2">统计月份:</div>
          <div className="flex-none">
            <DatePicker 
              picker="month" 
              defaultValue={dayjs()} 
              onChange={(date, dateString) => {
                setMonth(dateString as string);
                tableRef.current?.reload();
              }}
              className="w-48"
            />
          </div>
          
          {/* 快捷日期按钮组：高度统一为 44px，边框锁定为 1px slate-500 */}
          <div className="flex-none flex items-center h-[44px] border border-slate-500 rounded overflow-hidden">
            <button 
              className="px-4 h-full bg-white hover:bg-slate-100 text-slate-900 font-bold border-r border-slate-500 transition-colors"
              onClick={() => { setMonth(dayjs().format('YYYY-MM')); tableRef.current?.reload(); }}
            >
              本月
            </button>
            <button 
              className="px-4 h-full bg-white hover:bg-slate-100 text-slate-900 font-bold transition-colors"
              onClick={() => { setMonth(dayjs().subtract(1, 'month').format('YYYY-MM')); tableRef.current?.reload(); }}
            >
              上月
            </button>
          </div>

          <div className="flex-grow"></div>
          
          <div className="flex-none">
            <Button icon={<DownloadOutlined />} type="primary">导出月报表</Button>
          </div>
        </div>
      </Card>

      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic 
              title={<span className="text-slate-600 font-bold">本月统计人数</span>} 
              value={summary.total_employees} 
              valueStyle={{ color: '#0f172a', fontWeight: 900 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic 
              title={<span className="text-slate-600 font-bold">平均正常出勤率</span>} 
              value={summary.avg_normal_rate} 
              precision={2}
              suffix="%" 
              valueStyle={{ color: '#059669', fontWeight: 900 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic 
              title={<span className="text-slate-600 font-bold">累计异常人次</span>} 
              value={summary.total_exceptions} 
              valueStyle={{ color: '#e11d48', fontWeight: 900 }}
            />
          </Card>
        </Col>
      </Row>

      <BaseTable
        ref={tableRef}
        columns={columns}
        request={async (params) => {
          const res = await attendanceApi.getStatistics({ month });
          
          // 更新汇总数据
          const total = res.length;
          const normalSum = res.reduce((acc: number, curr: any) => acc + (curr.normal_days / (curr.total_records || 1)), 0);
          const exceptionSum = res.reduce((acc: number, curr: any) => acc + curr.late_count + curr.early_count + curr.absent_days + curr.miss_count, 0);
          
          setSummary({
            total_employees: total,
            avg_normal_rate: total > 0 ? (normalSum / total) * 100 : 0,
            total_exceptions: exceptionSum
          });

          return {
            data: res,
            success: true,
          };
        }}
        pagination={false}
        search={false}
      />
    </div>
  );
};

export default AttendanceStatistics;
