import React, { useRef, useState } from "react";
import { message, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import BaseTable from "@/components/table/BaseTable";
import {
  ColumnCustomizer,
  loadColumnConfig,
  type ColumnConfig,
} from "@/components/table/ColumnCustomizer";
import { attendanceApi } from "@/api/attendance";
import LeixiSearchFilter, {
  FilterField,
} from "@/components/common/LeixiSearchFilter";
import {
  defaultColumnConfig,
  getAttendanceColumns,
} from "./components/columns";
import { useDebounce } from "@/hooks/useDebounce";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { GlobalLoading } from "@/components/common/GlobalLoading";
import { resetColumnConfig } from "@/utils/ui-helpers";

const AttendanceRecords: React.FC = () => {
  const tableRef = useRef<any>();
  const searchInputRef = useRef<any>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>(() =>
    loadColumnConfig("attendance-records-columns", defaultColumnConfig),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [searchFilters, setSearchFilters] = useState<any>({});

  // 搜索防抖
  const debouncedFilters = useDebounce(searchFilters, 500);

  const filterFields: FilterField[] = [
    { name: "employeeName", label: "员工姓名", type: "text" },
    { name: "dateRange", label: "考勤日期", type: "range" },
    {
      name: "status",
      label: "状态",
      type: "select",
      options: [
        { label: "正常", value: 1 },
        { label: "迟到", value: 2 },
        { label: "早退", value: 3 },
        { label: "旷工", value: 4 },
        { label: "漏打卡", value: 5 },
      ],
    },
  ];

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+f": () => searchInputRef.current?.focus(),
    "Ctrl+r": () => {
      tableRef.current?.reload();
      message.success("已刷新");
    },
  });

  const handleSearch = (values: any) => {
    setSearchFilters(values);
  };

  // 使用防抖后的过滤条件
  React.useEffect(() => {
    if (Object.keys(debouncedFilters).length > 0) {
      tableRef.current?.reload(debouncedFilters);
    }
  }, [debouncedFilters]);

  // 重置列配置
  const handleResetColumns = () => {
    resetColumnConfig(
      "attendance-records-columns",
      defaultColumnConfig,
      setColumns,
    );
  };

  // 获取列配置
  const tableColumns = getAttendanceColumns(columns, {
    onReCalculate: async (id: string) => {
      const hide = message.loading("正在重新计算...", 0);
      try {
        await attendanceApi.reCalculate?.(id);
        hide();
        message.success("计算成功");
        tableRef.current?.reload();
      } catch (error) {
        hide();
        message.error("计算失败，请重试");
      }
    },
  });

  return (
    <div className="bg-slate-50 p-6 min-h-full">
      <div className="mb-4 flex justify-between items-center">
        <LeixiSearchFilter
          ref={searchInputRef}
          fields={filterFields}
          onSearch={handleSearch}
        />
        <div className="flex gap-2">
          <Button
            icon={<ReloadOutlined />}
            onClick={handleResetColumns}
            title="重置列配置"
          >
            重置列
          </Button>
          <ColumnCustomizer
            columns={columns}
            onChange={setColumns}
            storageKey="attendance-records-columns"
          />
        </div>
      </div>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <GlobalLoading loading={isLoading}>
          <BaseTable
            ref={tableRef}
            columns={tableColumns}
            api={attendanceApi.listRecords}
            onLoadingChange={setIsLoading}
          />
        </GlobalLoading>
      </div>
    </div>
  );
};

export default AttendanceRecords;
