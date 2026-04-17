import { useState } from "react";
import { Card, Tabs, message } from "antd";
import { RequestFilterBar } from "./components/RequestFilterBar";
import { RequestTable } from "./components/RequestTable";
import {
  useAttendanceRequests,
  type RequestType,
} from "./hooks/useAttendanceRequests";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { GlobalLoading } from "@/components/common/GlobalLoading";

const RequestTabContent = ({ type }: { type: RequestType }) => {
  const { data, isLoading, setKeyword, refetch } = useAttendanceRequests(type);

  const columns = [
    { title: "单号", dataIndex: type === "leave" ? "leave_no" : "overtime_no" },
    { title: "申请人", dataIndex: "applicantName" },
    { title: "原因", dataIndex: "reason" },
    { title: "时间", dataIndex: "start_time" },
  ];

  return (
    <>
      <RequestFilterBar onSearch={setKeyword} onRefresh={refetch} />
      <RequestTable data={data} loading={isLoading} columns={columns} />
    </>
  );
};

export default function AttendanceRequestsPage() {
  return (
    <div className="leixi-page-container">
      <Card className="shadow-sm" bodyStyle={{ padding: 24 }}>
        <Tabs
          items={[
            {
              key: "leave",
              label: "请假申请",
              children: <RequestTabContent type="leave" />,
            },
            {
              key: "overtime",
              label: "加班申请",
              children: <RequestTabContent type="overtime" />,
            },
            {
              key: "patch-card",
              label: "补卡申请",
              children: <RequestTabContent type="patch-card" />,
            },
            {
              key: "schedule-change",
              label: "调班申请",
              children: <RequestTabContent type="schedule-change" />,
            },
          ]}
        />
      </Card>
    </div>
  );
}
