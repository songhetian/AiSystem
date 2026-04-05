import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  Upload
} from 'antd';
import type { UploadProps } from 'antd';
import { attendanceApi } from '@/api/attendance';

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
  usage_count?: number;
}

interface ScheduleRow {
  employee_id: string;
  employee_name: string;
  employee_no?: string;
  department_name: string;
  schedules: Array<{
    date: string;
    schedule_id?: string;
    shift_name?: string | null;
    shift_id?: string | null;
    on_duty_time?: string | null;
    off_duty_time?: string | null;
  }>;
}

interface DashboardData {
  range: {
    start_date: string;
    end_date: string;
  };
  summary: {
    employee_count: number;
    shift_count: number;
    scheduled_count: number;
    rest_count: number;
  };
  days: Array<{
    key: string;
    label: string;
    weekday: string;
  }>;
  shifts: ShiftRecord[];
  rows: ScheduleRow[];
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function startOfWeek(date: Date) {
  const value = new Date(date);
  const day = value.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + delta);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AttendanceSchedulesPage() {
  const queryClient = useQueryClient();
  const todayWeek = useMemo(() => {
    const start = startOfWeek(new Date());
    return {
      start_date: formatDate(start),
      end_date: formatDate(addDays(start, 6))
    };
  }, []);
  const [filters, setFilters] = useState(todayWeek);
  const [keyword, setKeyword] = useState('');
  const [shiftOpen, setShiftOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [quickAssignOpen, setQuickAssignOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftRecord | null>(null);
  const [activeCell, setActiveCell] = useState<{
    employee_id: string;
    employee_name: string;
    department_name: string;
    date: string;
    schedule_id?: string;
    shift_name?: string | null;
  } | null>(null);
  const [shiftForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [quickAssignForm] = Form.useForm();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['attendance-dashboard', filters, keyword],
    queryFn: () => attendanceApi.getDashboard(keyword ? { ...filters, keyword } : filters)
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['attendance-dashboard'] });
  };

  const createShiftMutation = useMutation({
    mutationFn: attendanceApi.createShift,
    onSuccess: async () => {
      message.success('Shift saved');
      setShiftOpen(false);
      setEditingShift(null);
      shiftForm.resetFields();
      await refresh();
    }
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ShiftRecord> }) => attendanceApi.updateShift(id, payload),
    onSuccess: async () => {
      message.success('Shift updated');
      setShiftOpen(false);
      setEditingShift(null);
      shiftForm.resetFields();
      await refresh();
    }
  });

  const deleteShiftMutation = useMutation({
    mutationFn: attendanceApi.deleteShift,
    onSuccess: async () => {
      message.success('Shift removed');
      await refresh();
    }
  });

  const assignMutation = useMutation({
    mutationFn: attendanceApi.saveSchedule,
    onSuccess: async () => {
      message.success('Schedule saved');
      setAssignOpen(false);
      assignForm.resetFields();
      setQuickAssignOpen(false);
      quickAssignForm.resetFields();
      setActiveCell(null);
      await refresh();
    }
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: attendanceApi.deleteSchedule,
    onSuccess: async () => {
      message.success('Schedule cleared');
      setQuickAssignOpen(false);
      quickAssignForm.resetFields();
      setActiveCell(null);
      await refresh();
    }
  });

  const importMutation = useMutation({
    mutationFn: attendanceApi.importSchedules,
    onSuccess: async (result: { imported: number; failed: number; errors: string[] }) => {
      if (result.failed > 0) {
        Modal.warning({
          title: `Import finished. Success ${result.imported}, failed ${result.failed}`,
          content: (
            <div style={{ maxHeight: 240, overflow: 'auto' }}>
              {result.errors.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          )
        });
      } else {
        message.success(`Imported ${result.imported} rows`);
      }
      await refresh();
    }
  });

  const shiftOptions =
    data?.shifts.map((item) => ({
      label: `${item.name} ${item.on_duty_time}-${item.off_duty_time}`,
      value: item.id
    })) ?? [];

  const uploadProps: UploadProps = {
    accept: '.csv',
    showUploadList: false,
    beforeUpload: async (file) => {
      const text = await file.text();
      const rows = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(1)
        .map((line) => {
          const [employee_no, employee_name, department_name, schedule_date, shift_name] = line.split(',');
          return {
            employee_no,
            employee_name,
            department_name,
            schedule_date,
            shift_name
          };
        })
        .filter((item) => item.schedule_date && item.shift_name);

      if (rows.length === 0) {
        message.error('File is empty or not using the template');
        return Upload.LIST_IGNORE;
      }

      importMutation.mutate({ rows });
      return Upload.LIST_IGNORE;
    }
  };

  const columns = [
    {
      title: 'Employee',
      dataIndex: 'employee_name',
      fixed: 'left' as const,
      width: 200,
      render: (_: unknown, record: ScheduleRow) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.employee_name}</div>
          <Typography.Text type="secondary">
            {record.employee_no || 'No employee no'} / {record.department_name}
          </Typography.Text>
        </div>
      )
    },
    ...(data?.days.map((day, index) => ({
      title: (
        <div>
          <div>{day.label}</div>
          <Typography.Text type="secondary">{day.weekday}</Typography.Text>
        </div>
      ),
      key: day.key,
      width: 168,
      render: (_: unknown, record: ScheduleRow) => {
        const schedule = record.schedules[index];
        return (
          <button
            type="button"
            onClick={() => {
              setActiveCell({
                employee_id: record.employee_id,
                employee_name: record.employee_name,
                department_name: record.department_name,
                date: schedule?.date ?? day.key,
                schedule_id: schedule?.schedule_id,
                shift_name: schedule?.shift_name
              });
              quickAssignForm.setFieldsValue({ shift_id: schedule?.shift_id ?? undefined });
              setQuickAssignOpen(true);
            }}
            style={{
              width: '100%',
              textAlign: 'left',
              background: schedule?.shift_name ? '#eff6ff' : '#f8fafc',
              border: '1px solid #d0d5dd',
              borderRadius: 14,
              padding: '10px 12px',
              cursor: 'pointer'
            }}
          >
            {schedule?.shift_name ? (
              <>
                <Tag color="blue" style={{ marginBottom: 6 }}>
                  {schedule.shift_name}
                </Tag>
                <div style={{ fontSize: 12, color: '#667085' }}>
                  {schedule.on_duty_time}-{schedule.off_duty_time}
                </div>
              </>
            ) : (
              <Typography.Text type="secondary">Click to assign</Typography.Text>
            )}
          </button>
        );
      }
    })) ?? [])
  ];

  return (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card
        title="Shift and Schedule Management"
        extra={
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="Search employee / employee no"
              style={{ width: 260 }}
              onSearch={(value) => setKeyword(value.trim())}
              onChange={(event) => {
                if (!event.target.value) {
                  setKeyword('');
                }
              }}
            />
            <RangePicker
              onChange={(values) => {
                if (!values?.[0] || !values[1]) return;
                setFilters({
                  start_date: values[0].format('YYYY-MM-DD'),
                  end_date: values[1].format('YYYY-MM-DD')
                });
              }}
            />
            <Button
              onClick={async () => {
                const result = await attendanceApi.downloadTemplate();
                downloadTextFile(result.filename, result.content);
              }}
            >
              Template
            </Button>
            <Upload {...uploadProps}>
              <Button loading={importMutation.isPending}>Import</Button>
            </Upload>
            <Button
              onClick={async () => {
                const result = await attendanceApi.exportSchedules(filters);
                downloadTextFile(result.filename, result.content);
              }}
            >
              Export
            </Button>
            <Button type="primary" onClick={() => setAssignOpen(true)}>
              Batch Assign
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Statistic title="Employees" value={data?.summary.employee_count ?? 0} />
          </Col>
          <Col span={6}>
            <Statistic title="Shifts" value={data?.summary.shift_count ?? 0} />
          </Col>
          <Col span={6}>
            <Statistic title="Assigned" value={data?.summary.scheduled_count ?? 0} />
          </Col>
          <Col span={6}>
            <Statistic title="Rest Cells" value={data?.summary.rest_count ?? 0} />
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <Card
            title="Shift Library"
            extra={
              <Button
                type="primary"
                onClick={() => {
                  setEditingShift(null);
                  shiftForm.resetFields();
                  setShiftOpen(true);
                }}
              >
                New Shift
              </Button>
            }
          >
            <Space direction="vertical" size={12} style={{ display: 'flex' }}>
              {(data?.shifts ?? []).map((shift) => (
                <Card key={shift.id} size="small" styles={{ body: { padding: 16 } }} style={{ background: '#f8fafc', borderColor: '#d0d5dd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <Typography.Title level={5} style={{ margin: 0 }}>
                        {shift.name}
                      </Typography.Title>
                      <Typography.Text type="secondary">
                        {shift.on_duty_time} - {shift.off_duty_time}
                      </Typography.Text>
                    </div>
                    <Tag color={shift.status === 1 ? 'success' : 'default'}>{shift.status === 1 ? 'Enabled' : 'Disabled'}</Tag>
                  </div>
                  <Descriptions
                    column={1}
                    size="small"
                    style={{ marginTop: 12 }}
                    items={[
                      { key: 'late', label: 'Late Threshold', children: `${shift.late_threshold} min` },
                      { key: 'early', label: 'Early Leave', children: `${shift.early_threshold} min` },
                      { key: 'use', label: 'Usage Count', children: `${shift.usage_count ?? 0}` }
                    ]}
                  />
                  <Space>
                    <Button
                      type="link"
                      onClick={() => {
                        setEditingShift(shift);
                        shiftForm.setFieldsValue(shift);
                        setShiftOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button type="link" danger onClick={() => deleteShiftMutation.mutate(shift.id)}>
                      Delete
                    </Button>
                  </Space>
                </Card>
              ))}
              {!data?.shifts?.length ? <Empty description="No shifts yet. Create Morning / Mid / Night first." /> : null}
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={16}>
          <Card
            title="Weekly Schedule View"
            extra={
              <Space>
                <Segmented
                  options={[
                    { label: 'Week Grid', value: 'week' },
                    { label: 'Quick Assign', value: 'quick' }
                  ]}
                  value="week"
                />
                <Typography.Text type="secondary">Click a cell to assign or clear a shift</Typography.Text>
              </Space>
            }
          >
            {!data?.rows?.length ? (
              <Empty description="No employees available in the selected range" />
            ) : (
              <Table rowKey="employee_id" columns={columns} dataSource={data.rows} loading={isLoading} pagination={false} scroll={{ x: 1200 }} size="small" />
            )}
          </Card>
        </Col>
      </Row>

      <Card title="Notes">
        <Alert type="info" showIcon message="Supports shift rules, weekly schedule view, batch assignment, CSV import, and CSV export." />
      </Card>

      <Modal
        open={shiftOpen}
        title={editingShift ? 'Edit Shift' : 'New Shift'}
        onCancel={() => {
          setShiftOpen(false);
          setEditingShift(null);
          shiftForm.resetFields();
        }}
        onOk={() => shiftForm.submit()}
      >
        <Form
          form={shiftForm}
          layout="vertical"
          initialValues={{ status: 1, late_threshold: 10, early_threshold: 10, absenteeism_threshold: 120 }}
          onFinish={(values) => {
            if (editingShift) {
              updateShiftMutation.mutate({ id: editingShift.id, payload: values });
            } else {
              createShiftMutation.mutate(values);
            }
          }}
        >
          <Form.Item label="Shift Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="Morning Shift / Night Shift / Support Duty" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="On Duty" name="on_duty_time" rules={[{ required: true }]}>
                <Input placeholder="09:00" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Off Duty" name="off_duty_time" rules={[{ required: true }]}>
                <Input placeholder="18:00" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="Late Threshold" name="late_threshold">
                <InputNumber min={0} max={240} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Early Leave" name="early_threshold">
                <InputNumber min={0} max={240} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Absence Threshold" name="absenteeism_threshold">
                <InputNumber min={0} max={1440} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Status" name="status">
            <Select options={[{ label: 'Enabled', value: 1 }, { label: 'Disabled', value: 0 }]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={assignOpen}
        title="Batch Assign"
        onCancel={() => {
          setAssignOpen(false);
          assignForm.resetFields();
        }}
        onOk={() => assignForm.submit()}
      >
        <Form
          form={assignForm}
          layout="vertical"
          onFinish={(values) => {
            const employeeIds = values.employee_ids ?? [];
            const dates = values.schedule_dates ?? [];
            assignMutation.mutate({
              shift_id: values.shift_id,
              items: employeeIds.flatMap((employeeId: string) =>
                dates.map((schedule_date: string) => ({
                  employee_id: employeeId,
                  schedule_date
                }))
              )
            });
          }}
        >
          <Form.Item label="Shift" name="shift_id">
            <Select allowClear placeholder="Clear schedule when no shift is selected" options={shiftOptions} />
          </Form.Item>
          <Form.Item label="Employees" name="employee_ids" rules={[{ required: true }]}>
            <Select
              mode="multiple"
              options={(data?.rows ?? []).map((item) => ({
                label: `${item.employee_name} / ${item.department_name}`,
                value: item.employee_id
              }))}
            />
          </Form.Item>
          <Form.Item label="Dates" name="schedule_dates" rules={[{ required: true }]}>
            <Select
              mode="multiple"
              options={(data?.days ?? []).map((item) => ({
                label: `${item.label} ${item.weekday}`,
                value: item.key
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={quickAssignOpen}
        title="Quick Assign"
        onCancel={() => {
          setQuickAssignOpen(false);
          setActiveCell(null);
          quickAssignForm.resetFields();
        }}
        onOk={() => quickAssignForm.submit()}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          {activeCell ? `${activeCell.employee_name} / ${activeCell.department_name} / ${activeCell.date}` : ''}
        </Typography.Paragraph>
        <Form
          form={quickAssignForm}
          layout="vertical"
          onFinish={(values) => {
            if (!activeCell) {
              return;
            }

            assignMutation.mutate({
              shift_id: values.shift_id,
              items: [
                {
                  employee_id: activeCell.employee_id,
                  schedule_date: activeCell.date
                }
              ]
            });
          }}
        >
          <Form.Item label="Shift" name="shift_id">
            <Select allowClear placeholder="Choose a shift or leave empty to clear" options={shiftOptions} />
          </Form.Item>
        </Form>
        {activeCell?.schedule_id ? (
          <Button danger onClick={() => deleteScheduleMutation.mutate(activeCell.schedule_id!)}>
            Clear Current Schedule
          </Button>
        ) : null}
      </Modal>
    </Space>
  );
}
