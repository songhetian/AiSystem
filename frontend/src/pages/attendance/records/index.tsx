import React, { useRef } from "react";
import { message, Space, Button } from "antd";
import BaseTable from "@/components/table/BaseTable";
import { Permission } from "@/components/permission/Permission";
import StatusTag from "@/components/common/StatusTag";
import { attendanceApi } from "@/api/attendance";
import dayjs from "dayjs";
import LeixiSearchFilter, { FilterField } from "@/components/common/LeixiSearchFilter";

const AttendanceRecords: React.FC = () => {
  const tableRef = useRef<any>();

  const filterFields: FilterField[] = [
    { name: 'employeeName', label: '员工姓名', type: 'text' },
    { name: 'dateRange', label: '考勤日期', type: 'range' },
    { 
      name: 'status', 
      label: '状态', 
      type: 'select', 
      options: [
        { label: '正常', value: 1 },
        { label: '迟到', value: 2 },
        { label: '早退', value: 3 },
        { label: '旷工', value: 4 },
        { label: '漏打卡', value: 5 }
      ]
    }
  ];

  const handleSearch = (values: any) => {
    tableRef.current?.reload(values);
  };

  const getStatusType = (status: number) => {
    switch (status) {
      case 1: return "enabled";
      case 2:
      case 3: return "warning";
      case 4:
      case 5: return "error";
      default: return "default";
    }
  };

  const getStatusText = (status: number) => {
    const map: any = { 1: "正常", 2: "迟到", 3: "早退", 4: "旷工", 5: "漏打卡" };
    return map[status] || "未知";
  };

  const columns: any[] = [
    {
      title: "员工",
      dataIndex: "employee_name",
      key: "employee_name",
      className: "font-black text-slate-900",
    },
    {
      title: "工号",
      dataIndex: "employee_no",
      key: "employee_no",
      className: "font-bold text-slate-600",
    },
    {
      title: "日期",
      dataIndex: "attendance_date",
      key: "attendance_date",
      render: (val: string) => <span className="font-bold text-slate-900">{dayjs(val).format("YYYY-MM-DD")}</span>,
    },
    {
      title: "班次",
      dataIndex: "shift_name",
      key: "shift_name",
      render: (val: string) => val ? <StatusTag color="blue" text={val} /> : "--",
    },
    {
      title: "打卡详情",
      key: "clock_info",
      render: (_: any, record: any) => (
        <Space size="large">
          <Space direction="vertical" size={0}>
            <div className="text-[10px] text-slate-400 font-black uppercase">On Duty</div>
            <div className="text-slate-900 font-black">{record.actual_on_duty_time ? dayjs(record.actual_on_duty_time).format("HH:mm") : "未打卡"}</div>
            <StatusTag status={getStatusType(record.on_duty_status)} text={getStatusText(record.on_duty_status)} />
          </Space>
          <Space direction="vertical" size={0}>
            <div className="text-[10px] text-slate-400 font-black uppercase">Off Duty</div>
            <div className="text-slate-900 font-black">{record.actual_off_duty_time ? dayjs(record.actual_off_duty_time).format("HH:mm") : "未打卡"}</div>
            <StatusTag status={getStatusType(record.off_duty_status)} text={getStatusText(record.off_duty_status)} />
          </Space>
        </Space>
      )
    },
    {
      title: "异常说明",
      dataIndex: "exception_type",
      key: "exception_type",
      className: "text-rose-600 font-black",
    },
    {
      title: "操作",
      key: "action",
      fixed: "right",
      width: 120,
      render: (_: any, record: any) => (
        <Permission code="attendance:records:update">
          <Button
            type="link"
            size="small"
            onClick={async () => {
              await attendanceApi.reCalculate?.(record.id);
              message.success("计算成功");
              tableRef.current?.reload();
            }}
            className="font-black text-slate-900"
          >
            重新计算
          </Button>
        </Permission>
      ),
    },
  ];

  return (
    <div className="bg-slate-50 p-6 min-h-full">
      <LeixiSearchFilter fields={filterFields} onSearch={handleSearch} />
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <BaseTable 
          ref={tableRef}
          columns={columns}
          api={attendanceApi.listRecords}
        />
      </div>
    </div>
  );
};

export default AttendanceRecords;
