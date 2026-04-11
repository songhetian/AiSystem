import { useRef, useState } from "react";
import { Button } from "antd";
import { DownloadOutlined, TeamOutlined, CheckCircleOutlined, WarningOutlined } from "@ant-design/icons";
import BaseTable from "@/components/table/BaseTable";
import { attendanceApi } from "@/api/attendance";
import dayjs from "dayjs";
import LeixiSearchFilter, { FilterField } from "@/components/common/LeixiSearchFilter";
import LeixiStatGrid, { StatItem } from "@/components/common/LeixiStatGrid";
import { useAttendanceStats } from "./hooks/useAttendanceStats";
import { getAttendanceColumns } from "./components/columns";

export default function AttendanceStatisticsPage() {
  const tableRef = useRef<any>();
  const [data, setData] = useState<any[]>([]);
  const stats = useAttendanceStats(data);

  const filterFields: FilterField[] = [
    { 
      name: 'month', 
      label: '统计月份', 
      type: 'range', 
      initialValue: [dayjs().startOf('month'), dayjs()]
    }
  ];

  const statItems: StatItem[] = [
    {
      key: 'total', title: '本月统计人数', value: stats.total_employees, suffix: '人', prefix: <TeamOutlined />, color: '#0f172a'
    },
    {
      key: 'rate', title: '平均出勤率', value: stats.avg_normal_rate.toFixed(1), suffix: '%', prefix: <CheckCircleOutlined />, color: '#10b981', trend: 'up', trendValue: '2.4%'
    },
    {
      key: 'exceptions', title: '累计异常人次', value: stats.total_exceptions, suffix: '次', prefix: <WarningOutlined />, color: '#f43f5e', trend: 'down', trendValue: '12%'
    }
  ];

  return (
    <div className="bg-slate-50 p-6 min-h-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black text-slate-900">考勤数据概览</h1>
        <Button icon={<DownloadOutlined />} type="primary" size="large" className="h-11 rounded-xl bg-slate-900 border-none font-black shadow-lg">
          导出报表
        </Button>
      </div>

      <LeixiSearchFilter fields={filterFields} onSearch={(v) => tableRef.current?.reload(v)} />
      
      <LeixiStatGrid items={statItems} />

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <BaseTable
          ref={tableRef}
          columns={getAttendanceColumns()}
          request={async (params: any) => {
            const res = await attendanceApi.getStatistics({ 
              month: params.month?.[0]?.format('YYYY-MM') || dayjs().format('YYYY-MM') 
            });
            setData(res);
            return { data: res, success: true };
          }}
          pagination={{ pageSize: 10 }}
          search={false}
        />
      </div>
    </div>
  );
}
