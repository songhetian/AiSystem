import { useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Card, Layout } from "antd";
import { useQuery } from "@tanstack/react-query";
import { attendanceApi } from "@/api/attendance";
import { ScheduleFilterBar } from "./components/ScheduleFilterBar";
import { ScheduleTable } from "./components/ScheduleTable";
import { DraggableShiftCard } from "./components/DraggableShiftCard";
import { useScheduleDnD } from "./hooks/useScheduleDnD";

export default function AttendanceSchedulesPage() {
  const [keyword, setKeyword] = useState("");
  const { activeId, onDragStart, onDragEnd } = useScheduleDnD();
  const sensors = useSensors(useSensor(PointerSensor));

  const { data, isLoading } = useQuery({
    queryKey: ["attendance-schedules", keyword],
    queryFn: () => attendanceApi.getDashboard({ keyword }),
  });

  return (
    <div className="leixi-page-container">
      <ScheduleFilterBar 
        onSearch={setKeyword} 
        onRefresh={() => {}} 
        onImport={() => {}} 
      />

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <Layout className="bg-transparent">
          <Layout.Sider width={240} className="bg-transparent pr-4">
            <Card title="班次列表" className="shadow-sm">
              {data?.shifts?.map((shift: any) => (
                <DraggableShiftCard key={shift.id} shift={shift} />
              ))}
            </Card>
          </Layout.Sider>
          <Layout.Content>
            <Card className="shadow-sm" bodyStyle={{ padding: 0 }}>
              <ScheduleTable data={data} loading={isLoading} />
            </Card>
          </Layout.Content>
        </Layout>
      </DndContext>
    </div>
  );
}
