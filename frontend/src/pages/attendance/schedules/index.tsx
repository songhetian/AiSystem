import { useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Card, Layout, Modal, Space, Typography, message } from "antd";
import { useQuery } from "@tanstack/react-query";
import { attendanceApi } from "@/api/attendance";
import type { AttendanceScheduleShift } from "@/api/attendance/types";
import { personnelApi } from "@/api/personnel";
import { systemApi } from "@/api/system";
import { useGlobalStore } from "@/models/global";
import { GlobalLoading } from "@/components/common/GlobalLoading";
import { useDebounce } from "@/hooks/useDebounce";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ScheduleFilterBar } from "./components/ScheduleFilterBar";
import { ScheduleTable } from "./components/ScheduleTable";
import { DraggableShiftCard } from "./components/DraggableShiftCard";
import { useScheduleDnD } from "./hooks/useScheduleDnD";
import { ScheduleSettingsDrawer } from "./components/ScheduleSettingsDrawer";
import { SettingOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;

function buildMonthRange(month: Dayjs) {
  return {
    start_date: month.startOf("month").format("YYYY-MM-DD"),
    end_date: month.endOf("month").format("YYYY-MM-DD"),
  };
}

export default function AttendanceSchedulesPage() {
  const currentUser = useGlobalStore((state) => state.currentUser);
  const [month, setMonth] = useState(dayjs());
  const [deptId, setDeptId] = useState<string>();
  const [employeeKeyword, setEmployeeKeyword] = useState<string>();
  const debouncedEmployeeKeyword = useDebounce(employeeKeyword, 500);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string>();
  const {
    activeShift,
    previewTarget,
    onDragStart,
    onDragOver,
    onDragEnd,
    saving,
    saveSchedule,
  } = useScheduleDnD();
  const sensors = useSensors(useSensor(PointerSensor));
  const dateRange = buildMonthRange(month);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+r": () => refetch(),
    Escape: () => {
      setScheduleMode(false);
      setSelectedShiftId(undefined);
      setSettingsDrawerOpen(false);
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      "attendance-schedules",
      month.format("YYYY-MM"),
      deptId,
      debouncedEmployeeKeyword,
    ],
    queryFn: () =>
      attendanceApi.getDashboard({
        ...dateRange,
        ...(deptId ? { dept_id: deptId } : {}),
        ...(debouncedEmployeeKeyword
          ? { keyword: debouncedEmployeeKeyword }
          : {}),
      }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["system-departments"],
    queryFn: systemApi.listDepartments,
    staleTime: 5 * 60 * 1000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["personnel-employees"],
    queryFn: personnelApi.listEmployees,
    staleTime: 5 * 60 * 1000,
  });

  const selectedShift = useMemo(
    () => data?.shifts?.find((item) => item.id === selectedShiftId) ?? null,
    [data?.shifts, selectedShiftId],
  );

  const departmentOptions = useMemo(
    () =>
      departments.map((item: { id: string; name: string }) => ({
        label: item.name,
        value: item.id,
      })),
    [departments],
  );

  const employeeOptions = useMemo(
    () =>
      employees
        .filter((item: { department_id?: string }) =>
          !deptId ? true : item.department_id === deptId,
        )
        .map((item: { name: string; employee_no?: string }) => ({
          label: `${item.name}${item.employee_no ? ` / ${item.employee_no}` : ""}`,
          value: item.employee_no || item.name,
        })),
    [deptId, employees],
  );

  const scopeLabel = currentUser?.name
    ? `当前查看：${currentUser.name} 可见范围内排班`
    : "当前查看：权限范围内排班";

  const handleMonthChange = (value: Dayjs) => {
    setMonth(value);
  };

  const handleAssign = async ({
    employee_id,
    schedule_date,
    shift_name,
  }: {
    employee_id: string;
    schedule_date: string;
    shift_name?: string | null;
  }) => {
    if (!scheduleMode) return;
    if (!selectedShift) {
      message.warning("请先在左侧激活一个班次");
      return;
    }

    if (shift_name && shift_name !== selectedShift.name) {
      Modal.confirm({
        title: "确认覆盖排班",
        content: `该日期已排为“${shift_name}”，是否改为“${selectedShift.name}”？`,
        okText: "确认覆盖",
        cancelText: "取消",
        onOk: async () => {
          await saveSchedule({
            shift_id: selectedShift.id,
            items: [{ employee_id, schedule_date }],
          });
        },
      });
      return;
    }

    await saveSchedule({
      shift_id: selectedShift.id,
      items: [{ employee_id, schedule_date }],
    });
  };

  const handleClear = async ({
    employee_id,
    schedule_date,
    shift_name,
  }: {
    employee_id: string;
    schedule_date: string;
    shift_name?: string | null;
  }) => {
    if (!scheduleMode || !shift_name) return;
    Modal.confirm({
      title: "确认清空排班",
      content: `是否清空 ${schedule_date} 的“${shift_name}”排班？`,
      okText: "清空",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        await saveSchedule({
          items: [{ employee_id, schedule_date }],
        });
      },
    });
  };

  return (
    <GlobalLoading loading={isLoading}>
      <div className="leixi-page-container bg-slate-50">
        <ScheduleFilterBar
          month={month}
          scheduleMode={scheduleMode}
          departments={departmentOptions}
          employees={employeeOptions}
          deptId={deptId}
          employeeKeyword={employeeKeyword}
          scopeLabel={scopeLabel}
          onMonthChange={handleMonthChange}
          onPrevMonth={() =>
            setMonth((current) => current.subtract(1, "month"))
          }
          onNextMonth={() => setMonth((current) => current.add(1, "month"))}
          onDepartmentChange={(value) => {
            setDeptId(value);
          }}
          onEmployeeChange={(value) => {
            setEmployeeKeyword(value);
          }}
          onRefresh={() => {
            void refetch();
          }}
          onToggleScheduleMode={() => {
            setScheduleMode((current) => {
              if (current) setSelectedShiftId(undefined);
              return !current;
            });
          }}
          onOpenAiSettings={() => setAiModalOpen(true)}
          onOpenGlobalSettings={() => setSettingsDrawerOpen(true)}
        />

        <div className="mb-4 grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <Card
            className="rounded-2xl border-slate-200 shadow-sm"
            bodyStyle={{ padding: 18 }}
          >
            <div className="mb-4">
              <Title level={5} className="!mb-1">
                班次列表
              </Title>
              <Text type="secondary">
                点击激活班次，拖拽或点击表格单元格即可排班。
              </Text>
            </div>

            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              {data?.shifts?.map((shift: AttendanceScheduleShift) => (
                <DraggableShiftCard
                  key={shift.id}
                  shift={shift}
                  selected={selectedShiftId === shift.id}
                  disabled={!scheduleMode}
                  onSelect={() => {
                    if (!scheduleMode) {
                      message.info("请先进入排班模式");
                      return;
                    }
                    setSelectedShiftId((current) =>
                      current === shift.id ? undefined : shift.id,
                    );
                  }}
                />
              ))}
            </Space>
          </Card>

          <DndContext
            sensors={sensors}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={(event) => {
              void onDragEnd(event);
            }}
          >
            <Layout className="bg-transparent">
              <Layout.Content>
                <Card
                  className="rounded-2xl border-slate-200 shadow-sm"
                  bodyStyle={{ padding: 0 }}
                  extra={
                    saving ? (
                      <span className="text-xs text-slate-500">保存中...</span>
                    ) : null
                  }
                >
                  <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                    <Space direction="vertical" size={0}>
                      <Text strong>
                        {month.format("YYYY 年 MM 月排班看板")}
                      </Text>
                      <Text type="secondary">
                        {scheduleMode
                          ? selectedShift
                            ? `当前激活班次：${selectedShift.name}`
                            : "当前未激活班次，点击左侧班次后可快速排班"
                          : "当前为只读状态，进入排班模式后可编辑"}
                      </Text>
                    </Space>
                  </div>

                  <ScheduleTable
                    data={data}
                    loading={isLoading}
                    scheduleMode={scheduleMode}
                    activeShift={activeShift ?? selectedShift}
                    previewTarget={previewTarget}
                    onCellClick={(payload) => {
                      void handleAssign(payload);
                    }}
                    onCellDoubleClick={(payload) => {
                      void handleClear(payload);
                    }}
                  />
                </Card>
              </Layout.Content>
            </Layout>
          </DndContext>
        </div>

        <ScheduleSettingsDrawer
          open={settingsDrawerOpen}
          onClose={() => setSettingsDrawerOpen(false)}
        />
      </div>
    </GlobalLoading>
  );
}
