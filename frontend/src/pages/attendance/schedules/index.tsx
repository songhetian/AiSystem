import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  Upload,
  message
} from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, InboxOutlined } from '@ant-design/icons';
import { attendanceApi } from '@/api/attendance';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

interface ShiftRecord {
  id: string;
  name: string;
  on_duty_time: string;
  off_duty_time: string;
  late_threshold: number;
  early_threshold: number;
  absenteeism_threshold: number;
  status: number;
}

interface ScheduleRow {
  employee_id: string;
  employee_name: string;
  employee_no: string;
  department_name: string;
  schedules: Array<{
    date: string;
    schedule_id?: string;
    shift_id?: string;
    shift_name?: string;
    on_duty_time?: string;
    off_duty_time?: string;
  }>;
}

interface ScheduleData {
  days: Array<{ key: string; label: string; weekday: string }>;
  rows: ScheduleRow[];
  shifts: ShiftRecord[];
  summary: {
    employee_count: number;
    shift_count: number;
    scheduled_count: number;
    rest_count: number;
  };
}

// Draggable Shift Card Component
const DraggableShiftCard = ({ shift, onDelete, onEdit }: { shift: ShiftRecord; onDelete: (id: string) => void; onEdit: (shift: ShiftRecord) => void }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `shift-${shift.id}`,
    data: { type: 'shift', shift },
  });

  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card size="small" styles={{ body: { padding: 12 } }} style={{ background: '#f8fafc', borderColor: '#64748b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <Title level={5} style={{ margin: 0, fontSize: 14 }} className="font-bold text-slate-900">
              {shift.name}
            </Title>
            <Text className="text-slate-500" style={{ fontSize: 12 }}>
              {shift.on_duty_time} - {shift.off_duty_time}
            </Text>
          </div>
          <Tag color={shift.status === 1 ? 'success' : 'default'} className="font-bold">
            {shift.status === 1 ? '启用' : '禁用'}
          </Tag>
        </div>
        <Descriptions
          column={1}
          size="small"
          style={{ marginTop: 8 }}
          items={[
            { key: 'late', label: <span className="text-slate-500">迟到</span>, children: <span className="font-bold">{shift.late_threshold}分</span> },
            { key: 'early', label: <span className="text-slate-500">早退</span>, children: <span className="font-bold">{shift.early_threshold}分</span> },
          ]}
        />
        <Space style={{ marginTop: 8 }}>
          <Button type="link" size="small" className="font-bold p-0" onClick={(e) => { e.stopPropagation(); onEdit(shift); }}>编辑</Button>
          <Button type="link" size="small" danger className="font-bold p-0" onClick={(e) => { e.stopPropagation(); onDelete(shift.id); }}>删除</Button>
        </Space>
      </Card>
    </div>
  );
};

// Droppable Schedule Cell Component
const DroppableScheduleCell = ({
  dayKey,
  employeeId,
  schedule,
  onClick,
}: {
  dayKey: string;
  employeeId: string;
  schedule?: ScheduleRow['schedules'][0];
  onClick: () => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${employeeId}-${dayKey}`,
    data: { employeeId, date: dayKey },
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      style={{
        width: '100%',
        minHeight: 70,
        textAlign: 'left',
        background: isOver ? '#e6f4ff' : (schedule?.shift_name ? '#f0f9ff' : '#ffffff'),
        border: `1px solid ${isOver ? '#1677ff' : '#64748b'}`,
        borderRadius: 8,
        padding: '8px 10px',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {schedule?.shift_name ? (
        <>
          <Tag color="blue" className="font-bold mb-1" style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {schedule.shift_name}
          </Tag>
          <div className="font-black text-slate-900" style={{ fontSize: 11 }}>
            {schedule.on_duty_time}-{schedule.off_duty_time}
          </div>
        </>
      ) : (
        <div className="text-slate-400 italic" style={{ fontSize: 12 }}>空班</div>
      )}
    </div>
  );
};

export default function AttendanceSchedulesPage() {
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState({ start_date: '', end_date: '' });
  const [activeShift, setActiveShift] = useState<ShiftRecord | null>(null);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftRecord | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [quickAssignOpen, setQuickAssignOpen] = useState(false);
  const [activeCell, setActiveCell] = useState<any>(null);

  const [shiftForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [quickAssignForm] = Form.useForm();

  // 1. 数据查询
  const { data, isLoading } = useQuery<ScheduleData>({
    queryKey: ['attendance-schedules', keyword, filters],
    queryFn: () => attendanceApi.listSchedules({ keyword, ...filters })
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['attendance-schedules'] });

  // 2. 变更操作
  const assignMutation = useMutation({
    mutationFn: attendanceApi.assignSchedules,
    onSuccess: () => {
      setAssignOpen(false);
      setQuickAssignOpen(false);
      message.success('排班成功');
      refresh();
    }
  });

  const createShiftMutation = useMutation({
    mutationFn: attendanceApi.createShift,
    onSuccess: () => { setShiftOpen(false); message.success('创建成功'); refresh(); }
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => attendanceApi.updateShift(id, payload),
    onSuccess: () => { setShiftOpen(false); message.success('更新成功'); refresh(); }
  });

  const deleteShiftMutation = useMutation({
    mutationFn: attendanceApi.deleteShift,
    onSuccess: () => { message.success('已删除'); refresh(); }
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: attendanceApi.deleteSchedule,
    onSuccess: () => { setQuickAssignOpen(false); message.success('已清空'); refresh(); }
  });

  const importMutation = useMutation({
    mutationFn: (file: any) => attendanceApi.importSchedules(file),
    onSuccess: () => { message.success('导入成功'); refresh(); }
  });

  const shiftOptions = useMemo(() => (data?.shifts ?? []).map(s => ({ label: s.name, value: s.id })), [data?.shifts]);

  const columns = [
    {
      title: '员工信息',
      dataIndex: 'employee_name',
      fixed: 'left' as const,
      width: 180,
      render: (_: any, record: ScheduleRow) => (
        <div>
          <div className="font-bold text-slate-900">{record.employee_name}</div>
          <Text className="text-slate-500" style={{ fontSize: 12 }}>
            {record.employee_no || '--'} / {record.department_name}
          </Text>
        </div>
      )
    },
    ...(data?.days.map((day, index) => ({
      title: (
        <div style={{ textAlign: 'center' }}>
          <div className="font-bold text-slate-900">{day.label}</div>
          <Text className="text-slate-500" style={{ fontSize: 12 }}>{day.weekday}</Text>
        </div>
      ),
      key: day.key,
      width: 150,
      render: (_: any, record: ScheduleRow) => {
        const schedule = record.schedules[index];
        return (
          <DroppableScheduleCell
            dayKey={day.key}
            employeeId={record.employee_id}
            schedule={schedule}
            onClick={() => {
              setActiveCell({
                employee_id: record.employee_id,
                employee_name: record.employee_name,
                date: schedule?.date ?? day.key,
                schedule_id: schedule?.schedule_id,
                shift_id: schedule?.shift_id
              });
              quickAssignForm.setFieldsValue({ shift_id: schedule?.shift_id });
              setQuickAssignOpen(true);
            }}
          />
        );
      }
    })) ?? [])
  ];

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const shift = active.data.current?.shift;
    if (shift) setActiveShift(shift);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveShift(null);
    const { active, over } = event;
    if (!over) return;

    const shiftId = active.id.toString().replace('shift-', '');
    const { employeeId, date } = over.data.current as { employeeId: string; date: string };

    if (employeeId && date) {
      assignMutation.mutate({
        shift_id: shiftId,
        items: [{ employee_id: employeeId, schedule_date: date }]
      });
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Space direction="vertical" size={16} className="w-full">
        {/* 顶部控制台 */}
        <Card bordered={false} className="shadow-sm">
          <Form layout="inline" className="flex flex-wrap items-center gap-4">
            <Form.Item className="flex-grow min-w-[200px] mb-0">
              <Input.Search
                allowClear
                placeholder="搜索员工姓名/工号"
                className="h-[44px]"
                onSearch={setKeyword}
              />
            </Form.Item>
            <Form.Item className="mb-0">
              <RangePicker
                className="h-[44px]"
                onChange={(vals) => setFilters({
                  start_date: vals?.[0]?.format('YYYY-MM-DD') ?? '',
                  end_date: vals?.[1]?.format('YYYY-MM-DD') ?? ''
                })}
              />
            </Form.Item>
            <Form.Item className="mb-0">
              <Space>
                <Upload
                  showUploadList={false}
                  beforeUpload={(file) => { importMutation.mutate(file); return false; }}
                >
                  <Button icon={<InboxOutlined />} className="h-[44px] font-bold">导入排班</Button>
                </Upload>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setAssignOpen(true)} className="h-[44px] font-bold">
                  批量排班
                </Button>
              </Space>
            </Form.Item>
          </Form>
          
          <Row gutter={[24, 24]} className="mt-6">
            <Col span={6}>
              <Statistic title={<span className="font-bold text-slate-500">员工总数</span>} value={data?.summary.employee_count ?? 0} valueStyle={{ color: '#0f172a', fontWeight: 900 }} />
            </Col>
            <Col span={6}>
              <Statistic title={<span className="font-bold text-slate-500">定义班次</span>} value={data?.summary.shift_count ?? 0} valueStyle={{ color: '#0f172a', fontWeight: 900 }} />
            </Col>
            <Col span={6}>
              <Statistic title={<span className="font-bold text-slate-500">已排班次</span>} value={data?.summary.scheduled_count ?? 0} valueStyle={{ color: '#1677ff', fontWeight: 900 }} />
            </Col>
            <Col span={6}>
              <Statistic title={<span className="font-bold text-slate-500">剩余格数</span>} value={data?.summary.rest_count ?? 0} valueStyle={{ color: '#64748b', fontWeight: 900 }} />
            </Col>
          </Row>
        </Card>

        {/* 主体区域 */}
        <Row gutter={16}>
          <Col span={6}>
            <Card title={<span className="font-black text-slate-900">班次库</span>} extra={<Button size="small" type="primary" onClick={() => { setEditingShift(null); shiftForm.resetFields(); setShiftOpen(true); }}>新增</Button>}>
              <div className="space-y-3">
                {data?.shifts.map(shift => (
                  <DraggableShiftCard key={shift.id} shift={shift} onEdit={(s) => { setEditingShift(s); shiftForm.setFieldsValue(s); setShiftOpen(true); }} onDelete={id => deleteShiftMutation.mutate(id)} />
                ))}
                {data?.shifts.length === 0 && <Empty description="暂无班次" />}
              </div>
            </Card>
          </Col>
          <Col span={18}>
            <Card title={<span className="font-black text-slate-900">排班视图 (周)</span>} styles={{ body: { padding: 0 } }}>
              <Table
                rowKey="employee_id"
                columns={columns}
                dataSource={data?.rows ?? []}
                loading={isLoading}
                pagination={false}
                scroll={{ x: 'max-content' }}
                bordered
              />
            </Card>
          </Col>
        </Row>

        {/* 拖拽叠加层 */}
        <DragOverlay>
          {activeShift && (
            <Card size="small" style={{ width: 180, opacity: 0.8, background: '#1677ff', borderColor: '#1677ff' }}>
              <Text className="text-white font-bold">{activeShift.name}</Text>
              <div className="text-white text-xs">{activeShift.on_duty_time}-{activeShift.off_duty_time}</div>
            </Card>
          )}
        </DragOverlay>

        {/* 弹窗 */}
        <Modal open={shiftOpen} title={editingShift ? '编辑班次' : '新增班次'} onCancel={() => setShiftOpen(false)} onOk={() => shiftForm.submit()}>
          <Form form={shiftForm} layout="vertical" onFinish={v => editingShift ? updateShiftMutation.mutate({ id: editingShift.id, payload: v }) : createShiftMutation.mutate(v)}>
            <Form.Item label="名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
            <Row gutter={12}>
              <Col span={12}><Form.Item label="上班" name="on_duty_time" rules={[{ required: true }]}><Input placeholder="09:00" /></Form.Item></Col>
              <Col span={12}><Form.Item label="下班" name="off_duty_time" rules={[{ required: true }]}><Input placeholder="18:00" /></Form.Item></Col>
            </Row>
            <Row gutter={12}>
              <Col span={8}><Form.Item label="迟到(分)" name="late_threshold"><InputNumber className="w-full" min={0} /></Form.Item></Col>
              <Col span={8}><Form.Item label="早退(分)" name="early_threshold"><InputNumber className="w-full" min={0} /></Form.Item></Col>
              <Col span={8}><Form.Item label="旷工(分)" name="absenteeism_threshold"><InputNumber className="w-full" min={0} /></Form.Item></Col>
            </Row>
          </Form>
        </Modal>

        <Modal open={assignOpen} title="批量排班" onCancel={() => setAssignOpen(false)} onOk={() => assignForm.submit()}>
          <Form form={assignForm} layout="vertical" onFinish={v => assignMutation.mutate({ shift_id: v.shift_id, items: v.employee_ids.flatMap((eId: string) => v.dates.map((d: string) => ({ employee_id: eId, schedule_date: d }))) })}>
            <Form.Item label="班次" name="shift_id" rules={[{ required: true }]}><Select options={shiftOptions} /></Form.Item>
            <Form.Item label="员工" name="employee_ids" rules={[{ required: true }]}><Select mode="multiple" options={data?.rows.map(r => ({ label: r.employee_name, value: r.employee_id }))} /></Form.Item>
            <Form.Item label="日期" name="dates" rules={[{ required: true }]}><Select mode="multiple" options={data?.days.map(d => ({ label: d.label, value: d.key }))} /></Form.Item>
          </Form>
        </Modal>

        <Modal open={quickAssignOpen} title="快捷操作" onCancel={() => setQuickAssignOpen(false)} onOk={() => quickAssignForm.submit()}>
          <Form form={quickAssignForm} layout="vertical" onFinish={v => assignMutation.mutate({ shift_id: v.shift_id, items: [{ employee_id: activeCell.employee_id, schedule_date: activeCell.date }] })}>
             <Form.Item label="更换班次" name="shift_id"><Select allowClear options={shiftOptions} /></Form.Item>
          </Form>
          {activeCell?.schedule_id && <Button block danger onClick={() => deleteScheduleMutation.mutate(activeCell.schedule_id)}>清空该格</Button>}
        </Modal>
      </Space>
    </DndContext>
  );
}
