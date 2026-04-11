import type { ProColumns } from "@ant-design/pro-components";

export const getAttendanceColumns = (): ProColumns<any>[] => [
  { title: "员工", dataIndex: "employee_name", className: "font-black text-slate-900" },
  { title: "工号", dataIndex: "employee_no", className: "font-bold text-slate-600" },
  { title: "出勤天数", dataIndex: "total_records", className: "font-black text-slate-900" },
  { title: "正常天数", dataIndex: "normal_days", render: (v) => <span className="text-emerald-600 font-black">{v as any}</span> },
  { 
    title: "迟到", 
    dataIndex: "late_count", 
    render: (v) => <span className={(v as number) > 0 ? "text-amber-600 font-black" : "text-slate-300"}>{v as any}</span> 
  },
  { 
    title: "早退", 
    dataIndex: "early_count", 
    render: (v) => <span className={(v as number) > 0 ? "text-amber-600 font-black" : "text-slate-300"}>{v as any}</span> 
  },
  { 
    title: "旷工", 
    dataIndex: "absent_days", 
    render: (v) => <span className={(v as number) > 0 ? "text-rose-600 font-black" : "text-slate-300"}>{v as any}</span> 
  },
  { 
    title: "漏打卡", 
    dataIndex: "miss_count", 
    render: (v) => <span className={(v as number) > 0 ? "text-rose-600 font-black" : "text-slate-300"}>{v as any}</span> 
  },
];
