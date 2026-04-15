import React from "react";
import { Button, message, Space } from "antd";
import dayjs from "dayjs";
import { Permission } from "@/components/permission/Permission";
import StatusTag from "@/components/common/StatusTag";
import type { ColumnConfig } from "@/components/table/ColumnCustomizer";
import { attendanceApi } from "@/api/attendance";

export interface AttendanceRecord {
  id: string;
  employee_name: string;
  employee_no: string;
  attendance_date: string;
  shift_name?: string;
  actual_on_duty_time?: string;
  actual_off_duty_time?: string;
  on_duty_status: number;
  off_duty_status: number;
  exception_type?: string;
  work_hours?: number;
  overtime_hours?: number;
  late_minutes?: number;
  early_leave_minutes?: number;
}

/**
 * 默认列配置
 */
export const defaultColumnConfig: ColumnConfig[] = [
  { key: "employee_name", title: "员工", visible: true, fixed: true },
  { key: "employee_no", title: "工号", visible: true },
  { key: "attendance_date", title: "日期", visible: true },
  { key: "shift_name", title: "班次", visible: true },
  { key: "clock_info", title: "打卡详情", visible: true },
  { key: "work_hours", title: "工作时长", visible: false },
  { key: "overtime_hours", title: "加班时长", visible: false },
  { key: "late_minutes", title: "迟到分钟", visible: false },
  { key: "early_leave_minutes", title: "早退分钟", visible: false },
  { key: "exception_type", title: "异常说明", visible: true },
  { key: "actions", title: "操作", visible: true, fixed: true },
];

/**
 * 获取状态类型
 */
const getStatusType = (status: number) => {
  switch (status) {
    case 1:
      return "enabled";
    case 2:
    case 3:
      return "warning";
    case 4:
    case 5:
      return "error";
    default:
      return "default";
  }
};

/**
 * 获取状态文本
 */
const getStatusText = (status: number) => {
  const map: any = { 1: "正常", 2: "迟到", 3: "早退", 4: "旷工", 5: "漏打卡" };
  return map[status] || "未知";
};

/**
 * 获取考勤记录列配置
 */
export const getAttendanceColumns = (
  columnConfig: ColumnConfig[] | null,
  handlers: {
    onReCalculate: (id: string) => void;
  },
): any[] => {
  const allColumns: any[] = [
    {
      key: "employee_name",
      title: "员工",
      dataIndex: "employee_name",
      className: "font-black text-slate-900",
      width: 120,
    },
    {
      key: "employee_no",
      title: "工号",
      dataIndex: "employee_no",
      className: "font-bold text-slate-600",
      width: 120,
    },
    {
      key: "attendance_date",
      title: "日期",
      dataIndex: "attendance_date",
      width: 120,
      render: (val: string) => (
        <span className="font-bold text-slate-900">
          {dayjs(val).format("YYYY-MM-DD")}
        </span>
      ),
    },
    {
      key: "shift_name",
      title: "班次",
      dataIndex: "shift_name",
      width: 100,
      render: (val: string) =>
        val ? <StatusTag color="blue" text={val} /> : "--",
    },
    {
      key: "clock_info",
      title: "打卡详情",
      width: 280,
      render: (_: any, record: AttendanceRecord) => (
        <Space size="large">
          <Space direction="vertical" size={0}>
            <div className="text-[10px] text-slate-400 font-black uppercase">
              On Duty
            </div>
            <div className="text-slate-900 font-black">
              {record.actual_on_duty_time
                ? dayjs(record.actual_on_duty_time).format("HH:mm")
                : "未打卡"}
            </div>
            <StatusTag
              status={getStatusType(record.on_duty_status)}
              text={getStatusText(record.on_duty_status)}
            />
          </Space>
          <Space direction="vertical" size={0}>
            <div className="text-[10px] text-slate-400 font-black uppercase">
              Off Duty
            </div>
            <div className="text-slate-900 font-black">
              {record.actual_off_duty_time
                ? dayjs(record.actual_off_duty_time).format("HH:mm")
                : "未打卡"}
            </div>
            <StatusTag
              status={getStatusType(record.off_duty_status)}
              text={getStatusText(record.off_duty_status)}
            />
          </Space>
        </Space>
      ),
    },
    {
      key: "work_hours",
      title: "工作时长",
      dataIndex: "work_hours",
      width: 100,
      render: (val: number) => (val ? `${val.toFixed(1)}小时` : "--"),
    },
    {
      key: "overtime_hours",
      title: "加班时长",
      dataIndex: "overtime_hours",
      width: 100,
      render: (val: number) => (val ? `${val.toFixed(1)}小时` : "--"),
    },
    {
      key: "late_minutes",
      title: "迟到分钟",
      dataIndex: "late_minutes",
      width: 100,
      render: (val: number) =>
        val ? <span className="text-orange-600">{val}分钟</span> : "--",
    },
    {
      key: "early_leave_minutes",
      title: "早退分钟",
      dataIndex: "early_leave_minutes",
      width: 100,
      render: (val: number) =>
        val ? <span className="text-orange-600">{val}分钟</span> : "--",
    },
    {
      key: "exception_type",
      title: "异常说明",
      dataIndex: "exception_type",
      className: "text-rose-600 font-black",
      width: 150,
    },
    {
      key: "actions",
      title: "操作",
      fixed: "right",
      width: 120,
      render: (_: any, record: AttendanceRecord) => (
        <Permission code="attendance:records:update">
          <Button
            type="link"
            size="small"
            onClick={() => handlers.onReCalculate(record.id)}
            className="font-black text-slate-900"
          >
            重新计算
          </Button>
        </Permission>
      ),
    },
  ];

  // 如果有列配置，则过滤列
  if (columnConfig) {
    const visibleKeys = new Set(
      columnConfig.filter((c) => c.visible).map((c) => c.key),
    );
    return columnConfig
      .filter((c) => c.visible)
      .map((c) => allColumns.find((col) => col.key === c.key))
      .filter(Boolean);
  }

  return allColumns;
};
