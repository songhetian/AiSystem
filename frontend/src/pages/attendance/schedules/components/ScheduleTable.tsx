import { useDroppable } from '@dnd-kit/core';
import { Table, Tag, Tooltip, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import type {
  AttendanceScheduleDashboard,
  AttendanceScheduleDay,
  AttendanceScheduleRow,
  AttendanceScheduleShift,
} from '@/api/attendance/types';
import { getShiftTheme } from './DraggableShiftCard';

const { Text } = Typography;

interface ScheduleTableProps {
  data?: AttendanceScheduleDashboard;
  loading: boolean;
  scheduleMode: boolean;
  activeShift?: AttendanceScheduleShift | null;
  previewTarget?: {
    employee_id: string;
    schedule_date: string;
  } | null;
  onCellClick: (payload: {
    employee_id: string;
    schedule_date: string;
    schedule_id?: string;
    shift_name?: string | null;
  }) => void;
  onCellDoubleClick: (payload: {
    employee_id: string;
    schedule_date: string;
    schedule_id?: string;
    shift_name?: string | null;
  }) => void;
}

const DroppableCell = ({
  id,
  children,
  preview,
  interactive,
  onClick,
  onDoubleClick,
}: {
  id: string;
  children: React.ReactNode;
  preview?: AttendanceScheduleShift | null;
  interactive: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`w-full min-h-[64px] rounded-2xl border border-dashed p-2 transition ${
        isOver
          ? 'border-blue-400 bg-blue-50/80'
          : interactive
            ? 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
            : 'border-transparent bg-transparent'
      }`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {preview ? (
        <div className="rounded-xl border border-blue-300 bg-white/90 px-2 py-1 shadow-sm">
          <Text strong className="block text-blue-700">
            {preview.name}
          </Text>
          {preview.on_duty_time && preview.off_duty_time ? (
            <Text type="secondary" className="text-xs">
              {preview.on_duty_time} - {preview.off_duty_time}
            </Text>
          ) : null}
          <div className="mt-1">
            <Tag color="processing" className="mr-0">
              待放置
            </Tag>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
};

export const ScheduleTable = ({
  data,
  loading,
  scheduleMode,
  activeShift,
  previewTarget,
  onCellClick,
  onCellDoubleClick,
}: ScheduleTableProps) => {
  if (!data) return null;

  const columns: TableColumnsType<AttendanceScheduleRow> = [
    {
      title: '员工',
      dataIndex: 'employee_name',
      fixed: 'left',
      width: 180,
      render: (_value: unknown, record: AttendanceScheduleRow) => (
        <div>
          <Text strong>{record.employee_name}</Text>
          <div className="mt-1">
            <Text type="secondary" className="text-xs">
              {record.employee_no}
            </Text>
            {record.department_name ? (
              <Tag className="ml-2 mr-0" color="default">
                {record.department_name}
              </Tag>
            ) : null}
          </div>
        </div>
      ),
    },
    ...data.days.map((day: AttendanceScheduleDay) => ({
      title: (
        <div className="text-center">
          <div>{day.label}</div>
          <div className="text-xs font-normal text-slate-400">{day.weekday}</div>
        </div>
      ),
      dataIndex: day.key,
      width: 130,
      render: (_value: unknown, record: AttendanceScheduleRow) => {
        const currentSchedule = record.schedules.find((item) => item.date === day.key);
        const isPreview =
          previewTarget?.employee_id === record.employee_id &&
          previewTarget?.schedule_date === day.key;
        const theme = currentSchedule?.shift_id ? getShiftTheme(currentSchedule.shift_id) : null;

        return (
          <DroppableCell
            id={`cell-${record.employee_id}-${day.key}`}
            preview={isPreview ? activeShift : null}
            interactive={scheduleMode}
            onClick={() =>
              onCellClick({
                employee_id: record.employee_id,
                schedule_date: day.key,
                schedule_id: currentSchedule?.schedule_id,
                shift_name: currentSchedule?.shift_name,
              })
            }
            onDoubleClick={() =>
              onCellDoubleClick({
                employee_id: record.employee_id,
                schedule_date: day.key,
                schedule_id: currentSchedule?.schedule_id,
                shift_name: currentSchedule?.shift_name,
              })
            }
          >
            {currentSchedule?.shift_name ? (
              <Tooltip title={scheduleMode ? '单击可覆盖，双击可清空' : currentSchedule.shift_name}>
                <div
                  className="rounded-xl px-2 py-2"
                  style={{
                    background: theme?.softColor ?? '#f8fafc',
                    borderLeft: `4px solid ${theme?.color ?? '#94a3b8'}`,
                  }}
                >
                  <Text strong className="block">
                    {currentSchedule.shift_name}
                  </Text>
                  {currentSchedule.on_duty_time && currentSchedule.off_duty_time ? (
                    <Text type="secondary" className="text-xs">
                      {currentSchedule.on_duty_time} - {currentSchedule.off_duty_time}
                    </Text>
                  ) : null}
                </div>
              </Tooltip>
            ) : (
              <Text type="secondary" className="text-xs">
                {scheduleMode ? '点击排班' : '未排班'}
              </Text>
            )}
          </DroppableCell>
        );
      },
    })),
  ];

  return (
    <Table
      columns={columns}
      dataSource={data.rows}
      loading={loading}
      rowKey="employee_id"
      bordered
      pagination={false}
      size="middle"
      scroll={{ x: 1600, y: 620 }}
    />
  );
};
