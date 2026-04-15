import React, { useRef, useState } from "react";
import { message } from "antd";
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

const AttendanceRecords: React.FC = () => {
  const tableRef = useRef<any>();
  const [columns, setColumns] = useState<ColumnConfig[]>(() =>
    loadColumnConfig("attendance-records-columns", defaultColumnConfig),
  );

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

  const handleSearch = (values: any) => {
    tableRef.current?.reload(values);
  };

  // 获取列配置
  const tableColumns = getAttendanceColumns(columns, {
    onReCalculate: async (id: string) => {
      await attendanceApi.reCalculate?.(id);
      message.success("计算成功");
      tableRef.current?.reload();
    },
  });

  return (
    <div className="bg-slate-50 p-6 min-h-full">
      <div className="mb-4 flex justify-between items-center">
        <LeixiSearchFilter fields={filterFields} onSearch={handleSearch} />
        <ColumnCustomizer
          columns={columns}
          onChange={setColumns}
          storageKey="attendance-records-columns"
        />
      </div>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <BaseTable
          ref={tableRef}
          columns={tableColumns}
          api={attendanceApi.listRecords}
        />
      </div>
    </div>
  );
};

export default AttendanceRecords;
