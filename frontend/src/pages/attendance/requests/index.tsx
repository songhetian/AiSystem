import { useState, useRef } from "react";
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
  const searchInputRef = useRef<any>(null);

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+f": () => searchInputRef.current?.focus(),
    "Ctrl+r": () => {
      refetch();
      message.success("已刷新");
    },
  });

  const columns = [
    { title: "单号", dataIndex: type === "leave" ? "leave_no" : "overtime_no" },
    { title: "申请人", dataIndex: "applicantName" },
    { title: "原因", dataIndex: "reason" },
    { title: "时间", dataIndex: "start_time" },
  ];

  return (
    <GlobalLoading loading={isLoading}>
      <RequestFilterBar
        onSearch={setKeyword}
        onRefresh={refetch}
        searchInputRef={searchInputRef}
      />
      <RequestTable data={data} loading={isLoading} columns={columns} />
    </GlobalLoading>
  );
};

export default function AttendanceRequestsPage() {
  // 页面级快捷键
  useKeyboardShortcuts({
    "Ctrl+1": () => {
      // 切换到请假申请
      const tabElement = document.querySelector(
        '[data-node-key="leave"]',
      ) as HTMLElement;
      tabElement?.click();
    },
    "Ctrl+2": () => {
      // 切换到加班申请
      const tabElement = document.querySelector(
        '[data-node-key="overtime"]',
      ) as HTMLElement;
      tabElement?.click();
    },
    "Ctrl+3": () => {
      // 切换到补卡申请
      const tabElement = document.querySelector(
        '[data-node-key="patch-card"]',
      ) as HTMLElement;
      tabElement?.click();
    },
    "Ctrl+4": () => {
      // 切换到调班申请
      const tabElement = document.querySelector(
        '[data-node-key="schedule-change"]',
      ) as HTMLElement;
      tabElement?.click();
    },
  });

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
