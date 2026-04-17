import { useRef, useState } from "react";
import { Button, Tabs, Select, Space } from "antd";
import {
  DownloadOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  BarChartOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import BaseTable from "@/components/table/BaseTable";
import { attendanceApi } from "@/api/attendance";
import { systemApi } from "@/api/system";
import dayjs from "dayjs";
import LeixiSearchFilter, {
  FilterField,
} from "@/components/common/LeixiSearchFilter";
import LeixiStatGrid, { StatItem } from "@/components/common/LeixiStatGrid";
import { GlobalLoading } from "@/components/common/GlobalLoading";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { handleExportWithProgress } from "@/utils/ui-helpers";
import { useAttendanceStats } from "./hooks/useAttendanceStats";
import { getAttendanceColumns } from "./components/columns";
import AiScheduleAnalysis from "./components/AiScheduleAnalysis";
import { useQuery } from "@tanstack/react-query";

export default function AttendanceStatisticsPage() {
  const tableRef = useRef<any>();
  const [data, setData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("attendance");
  const [filters, setFilters] = useState<any>({
    month: [dayjs().startOf("month"), dayjs()],
    dept_id: "seed-department-customer-service",
  });

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+r": () => tableRef.current?.reload(),
    "Ctrl+e": () => handleExport(),
  });

  const { data: depts = [], isLoading } = useQuery({
    queryKey: ["system-depts"],
    queryFn: () => systemApi.listDepartments(),
    staleTime: 5 * 60 * 1000,
  });

  const stats = useAttendanceStats(data);

  const handleExport = async () => {
    await handleExportWithProgress(async () => {
      // TODO: 实现导出逻辑
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });
  };

  const filterFields: FilterField[] = [
    {
      name: "month",
      label: "统计周期",
      type: "range",
      initialValue: filters.month,
    },
    {
      name: "dept_id",
      label: "分析部门",
      type: "select",
      initialValue: filters.dept_id,
      options: depts.map((d: any) => ({ label: d.name, value: d.id })),
    },
  ];

  const statItems: StatItem[] = [
    {
      key: "total",
      title: "本月统计人数",
      value: stats.total_employees,
      suffix: "人",
      prefix: <TeamOutlined />,
      color: "#0f172a",
    },
    {
      key: "rate",
      title: "平均出勤率",
      value: stats.avg_normal_rate.toFixed(1),
      suffix: "%",
      prefix: <CheckCircleOutlined />,
      color: "#10b981",
      trend: "up",
      trendValue: "2.4%",
    },
    {
      key: "exceptions",
      title: "累计异常人次",
      value: stats.total_exceptions,
      suffix: "次",
      prefix: <WarningOutlined />,
      color: "#f43f5e",
      trend: "down",
      trendValue: "12%",
    },
  ];

  return (
    <GlobalLoading loading={isLoading}>
      <div className="bg-slate-50 p-6 min-h-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 mb-1">
              排班与考勤多维统计
            </h1>
            <p className="text-slate-500 font-bold text-sm">
              Real-time Personnel Statistics & AI Scheduling Insights
            </p>
          </div>
          <Button
            icon={<DownloadOutlined />}
            type="primary"
            size="large"
            className="h-11 rounded-xl bg-slate-900 border-none font-black shadow-lg"
            onClick={handleExport}
          >
            导出全局报表
          </Button>
        </div>

        <LeixiSearchFilter
          fields={filterFields}
          onSearch={(v) => {
            setFilters(v);
            tableRef.current?.reload(v);
          }}
        />

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          className="rhino-tabs mt-6"
          items={[
            {
              key: "attendance",
              label: (
                <span className="px-6 font-black">
                  <BarChartOutlined /> 考勤执行概览
                </span>
              ),
              children: (
                <div className="space-y-6 pt-4">
                  <LeixiStatGrid items={statItems} />
                  <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                    <BaseTable
                      ref={tableRef}
                      columns={getAttendanceColumns()}
                      request={async (params: any) => {
                        const res = await attendanceApi.getStatistics({
                          month:
                            params.month?.[0]?.format("YYYY-MM") ||
                            dayjs().format("YYYY-MM"),
                        });
                        setData(res);
                        return { data: res, success: true };
                      }}
                      pagination={{ pageSize: 10 }}
                      search={false}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: "scheduling",
              label: (
                <span className="px-6 font-black">
                  <DashboardOutlined /> AI 排班效能洞察
                </span>
              ),
              children: (
                <div className="pt-4">
                  <AiScheduleAnalysis
                    deptId={filters.dept_id}
                    dateRange={filters.month}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    </GlobalLoading>
  );
}
