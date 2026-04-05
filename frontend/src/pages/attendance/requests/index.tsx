import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Form, Input, InputNumber, Popconfirm, Select, Space, Tabs, Tag, message } from 'antd';
import { useNavigate } from 'umi';
import { attendanceApi } from '@/api/attendance';
import { personnelApi } from '@/api/personnel';
import { BaseModal } from '@/components/common/BaseModal';
import { BaseTable } from '@/components/table/BaseTable';
import { createIdempotencyKey } from '@/utils/request';

type TabKey = 'records' | 'leaves' | 'overtimes' | 'patch-cards' | 'schedule-changes';

interface EmployeeOption {
  id: string;
  name: string;
  employee_no?: string;
}

interface AttendanceRecordItem {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_no?: string;
  attendance_date: string;
  shift_name?: string;
  scheduled_on_duty_time?: string;
  scheduled_off_duty_time?: string;
  actual_on_duty_time?: string;
  actual_off_duty_time?: string;
  on_duty_status: number;
  off_duty_status: number;
  work_duration_minutes?: number;
  exception_type?: string;
  remark?: string;
}

interface AttendanceWorkflowItem {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_no?: string;
  approval_status?: number;
  approval_request_id?: string;
  approval_request_no?: string;
  reason?: string;
  [key: string]: unknown;
}

function formatDateTime(value?: unknown) {
  if (!value || typeof value !== 'string') {
    return '-';
  }

  return value.replace('T', ' ').slice(0, 16);
}

function approvalTag(status?: number) {
  switch (status) {
    case 1:
      return <Tag color="processing">已通过</Tag>;
    case 2:
      return <Tag color="error">已驳回</Tag>;
    default:
      return <Tag>待审批</Tag>;
  }
}

function attendanceStatusTag(status?: number) {
  switch (status) {
    case 1:
      return <Tag color="success">正常</Tag>;
    case 2:
      return <Tag color="warning">迟到/早退</Tag>;
    case 3:
      return <Tag color="error">异常</Tag>;
    default:
      return <Tag>未打卡</Tag>;
  }
}

function isWorkflowLocked(record: AttendanceWorkflowItem) {
  return record.approval_status === 1;
}

export default function AttendanceRequestsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('records');
  const [keyword, setKeyword] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceWorkflowItem | null>(null);
  const [form] = Form.useForm();
  const submissionKeyRef = useRef<string>();

  const { data: employees = [] } = useQuery<EmployeeOption[]>({
    queryKey: ['attendance-request-employees'],
    queryFn: personnelApi.listEmployees
  });

  const queryParams = useMemo(() => (keyword ? { keyword } : undefined), [keyword]);

  const { data = [], isLoading } = useQuery<Array<AttendanceRecordItem | AttendanceWorkflowItem>>({
    queryKey: ['attendance-requests', activeTab, queryParams],
    queryFn: async () => {
      switch (activeTab) {
        case 'records':
          return attendanceApi.listRecords(queryParams);
        case 'leaves':
          return attendanceApi.listLeaves(queryParams);
        case 'overtimes':
          return attendanceApi.listOvertimes(queryParams);
        case 'patch-cards':
          return attendanceApi.listPatchCards(queryParams);
        case 'schedule-changes':
          return attendanceApi.listScheduleChanges(queryParams);
        default:
          return [];
      }
    }
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['attendance-requests'] });
  };

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const idempotencyKey =
        submissionKeyRef.current ?? (submissionKeyRef.current = createIdempotencyKey(`attendance-${activeTab}-create`));

      switch (activeTab) {
        case 'leaves':
          return attendanceApi.createLeave(values as never, { idempotencyKey });
        case 'overtimes':
          return attendanceApi.createOvertime(values as never, { idempotencyKey });
        case 'patch-cards':
          return attendanceApi.createPatchCard(values as never, { idempotencyKey });
        case 'schedule-changes':
          return attendanceApi.createScheduleChange(values as never, { idempotencyKey });
        default:
          return null;
      }
    },
    onSuccess: async () => {
      message.success('保存成功');
      setOpen(false);
      setEditing(null);
      form.resetFields();
      submissionKeyRef.current = undefined;
      await refresh();
    },
    onError: () => {
      submissionKeyRef.current = undefined;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const idempotencyKey =
        submissionKeyRef.current ?? (submissionKeyRef.current = createIdempotencyKey(`attendance-${activeTab}-update-${id}`));

      switch (activeTab) {
        case 'leaves':
          return attendanceApi.updateLeave(id, values as never, { idempotencyKey });
        case 'overtimes':
          return attendanceApi.updateOvertime(id, values as never, { idempotencyKey });
        case 'patch-cards':
          return attendanceApi.updatePatchCard(id, values as never, { idempotencyKey });
        case 'schedule-changes':
          return attendanceApi.updateScheduleChange(id, values as never, { idempotencyKey });
        default:
          return null;
      }
    },
    onSuccess: async () => {
      message.success('更新成功');
      setOpen(false);
      setEditing(null);
      form.resetFields();
      submissionKeyRef.current = undefined;
      await refresh();
    },
    onError: () => {
      submissionKeyRef.current = undefined;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      switch (activeTab) {
        case 'leaves':
          return attendanceApi.deleteLeave(id);
        case 'overtimes':
          return attendanceApi.deleteOvertime(id);
        case 'patch-cards':
          return attendanceApi.deletePatchCard(id);
        case 'schedule-changes':
          return attendanceApi.deleteScheduleChange(id);
        default:
          return null;
      }
    },
    onSuccess: async () => {
      message.success('删除成功');
      await refresh();
    }
  });

  const submitPending = createMutation.isPending || updateMutation.isPending;
  const rowActionPending = submitPending || deleteMutation.isPending;
  const employeeOptions = employees.map((item) => ({
    label: `${item.name}${item.employee_no ? ` / ${item.employee_no}` : ''}`,
    value: item.id
  }));

  const workflowColumns: ProColumns<AttendanceWorkflowItem>[] = [
    {
      title: '员工',
      dataIndex: 'employee_name',
      render: (_, record) => `${record.employee_name}${record.employee_no ? ` / ${record.employee_no}` : ''}`
    },
    ...(activeTab === 'leaves'
      ? [
          { title: '单号', dataIndex: 'leave_no' },
          { title: '类型', dataIndex: 'leave_type' },
          { title: '开始时间', dataIndex: 'start_time', render: (_: unknown, record: AttendanceWorkflowItem) => formatDateTime(record.start_time) },
          { title: '结束时间', dataIndex: 'end_time', render: (_: unknown, record: AttendanceWorkflowItem) => formatDateTime(record.end_time) },
          { title: '时长(小时)', dataIndex: 'duration_hours' }
        ]
      : []),
    ...(activeTab === 'overtimes'
      ? [
          { title: '单号', dataIndex: 'overtime_no' },
          { title: '开始时间', dataIndex: 'start_time', render: (_: unknown, record: AttendanceWorkflowItem) => formatDateTime(record.start_time) },
          { title: '结束时间', dataIndex: 'end_time', render: (_: unknown, record: AttendanceWorkflowItem) => formatDateTime(record.end_time) },
          { title: '时长(小时)', dataIndex: 'duration_hours' }
        ]
      : []),
    ...(activeTab === 'patch-cards'
      ? [
          { title: '单号', dataIndex: 'patch_no' },
          { title: '补卡日期', dataIndex: 'patch_date', render: (_: unknown, record: AttendanceWorkflowItem) => formatDateTime(record.patch_date) },
          { title: '补卡类型', dataIndex: 'patch_type' },
          { title: '目标时间', dataIndex: 'target_time', render: (_: unknown, record: AttendanceWorkflowItem) => formatDateTime(record.target_time) }
        ]
      : []),
    ...(activeTab === 'schedule-changes'
      ? [
          { title: '单号', dataIndex: 'change_no' },
          { title: '调班日期', dataIndex: 'change_date', render: (_: unknown, record: AttendanceWorkflowItem) => formatDateTime(record.change_date) },
          { title: '调整前班次', dataIndex: 'before_shift_name' },
          { title: '调整后班次', dataIndex: 'after_shift_name' },
          { title: '调班类型', dataIndex: 'change_type' }
        ]
      : []),
    {
      title: '审批状态',
      dataIndex: 'approval_status',
      render: (_, record) => approvalTag(record.approval_status)
    },
    {
      title: '审批单号',
      dataIndex: 'approval_request_no',
      render: (_, record) => record.approval_request_no || '-'
    },
    {
      title: '原因',
      dataIndex: 'reason',
      ellipsis: true
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => [
        <Button
          key="edit"
          type="link"
          disabled={rowActionPending || isWorkflowLocked(record)}
          onClick={() => {
            setEditing(record);
            form.setFieldsValue(record);
            submissionKeyRef.current = undefined;
            setOpen(true);
          }}
        >
          编辑
        </Button>,
        <Popconfirm
          key="delete"
          title="确认删除这条记录？"
          onConfirm={() => deleteMutation.mutate(record.id)}
          disabled={rowActionPending || isWorkflowLocked(record)}
        >
          <Button type="link" danger disabled={rowActionPending || isWorkflowLocked(record)}>
            删除
          </Button>
        </Popconfirm>,
        record.approval_request_no ? (
          <Button
            key="approval"
            type="link"
            disabled={rowActionPending}
            onClick={() =>
              navigate(
                `/approval/requests?view=all&requestNo=${encodeURIComponent(record.approval_request_no as string)}`
              )
            }
          >
            查看审批
          </Button>
        ) : null
      ]
    }
  ];

  const recordColumns: ProColumns<AttendanceRecordItem>[] = [
    {
      title: '员工',
      dataIndex: 'employee_name',
      render: (_, record) => `${record.employee_name}${record.employee_no ? ` / ${record.employee_no}` : ''}`
    },
    {
      title: '考勤日期',
      dataIndex: 'attendance_date',
      render: (_, record) => formatDateTime(record.attendance_date)
    },
    {
      title: '班次',
      dataIndex: 'shift_name'
    },
    {
      title: '计划时段',
      render: (_, record) => `${record.scheduled_on_duty_time ?? '-'} ~ ${record.scheduled_off_duty_time ?? '-'}`
    },
    {
      title: '实际上班',
      dataIndex: 'actual_on_duty_time',
      render: (_, record) => formatDateTime(record.actual_on_duty_time)
    },
    {
      title: '实际下班',
      dataIndex: 'actual_off_duty_time',
      render: (_, record) => formatDateTime(record.actual_off_duty_time)
    },
    {
      title: '上班状态',
      render: (_, record) => attendanceStatusTag(record.on_duty_status)
    },
    {
      title: '下班状态',
      render: (_, record) => attendanceStatusTag(record.off_duty_status)
    },
    {
      title: '异常',
      dataIndex: 'exception_type'
    },
    {
      title: '备注',
      dataIndex: 'remark',
      ellipsis: true
    }
  ];

  return (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card
        title="考勤申请与记录"
        extra={
          <Space>
            <Input.Search
              allowClear
              placeholder="搜索员工姓名/工号"
              style={{ width: 240 }}
              onSearch={(value) => setKeyword(value.trim())}
              onChange={(event) => {
                if (!event.target.value) {
                  setKeyword('');
                }
              }}
            />
            {activeTab !== 'records' ? (
              <Button
                type="primary"
                disabled={rowActionPending}
                onClick={() => {
                  setEditing(null);
                  form.resetFields();
                  submissionKeyRef.current = undefined;
                  setOpen(true);
                }}
              >
                新增
              </Button>
            ) : null}
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key as TabKey);
            setEditing(null);
            setOpen(false);
            form.resetFields();
            submissionKeyRef.current = undefined;
          }}
          items={[
            { key: 'records', label: '考勤记录' },
            { key: 'leaves', label: '请假申请' },
            { key: 'overtimes', label: '加班申请' },
            { key: 'patch-cards', label: '补卡申请' },
            { key: 'schedule-changes', label: '调班申请' }
          ]}
        />

        {activeTab === 'records' ? (
          <BaseTable<AttendanceRecordItem> rowKey="id" columns={recordColumns} dataSource={data as AttendanceRecordItem[]} loading={isLoading} />
        ) : (
          <BaseTable<AttendanceWorkflowItem> rowKey="id" columns={workflowColumns} dataSource={data as AttendanceWorkflowItem[]} loading={isLoading} />
        )}
      </Card>

      <BaseModal
        open={open}
        title={`${editing ? '编辑' : '新增'}${
          activeTab === 'leaves'
            ? '请假'
            : activeTab === 'overtimes'
              ? '加班'
              : activeTab === 'patch-cards'
                ? '补卡'
                : '调班'
        }`}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
          submissionKeyRef.current = undefined;
        }}
        onOk={() => form.submit()}
        confirmLoading={submitPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            if (submitPending) {
              return;
            }

            if (editing) {
              updateMutation.mutate({ id: editing.id, values });
            } else {
              createMutation.mutate(values);
            }
          }}
        >
          <Form.Item label="员工" name="employee_id" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={employeeOptions} />
          </Form.Item>

          {activeTab === 'leaves' ? (
            <>
              <Form.Item label="请假单号" name="leave_no">
                <Input placeholder="留空则自动生成" />
              </Form.Item>
              <Form.Item label="请假类型" name="leave_type" rules={[{ required: true }]}>
                <Select options={[{ label: '事假', value: '事假' }, { label: '病假', value: '病假' }, { label: '年假', value: '年假' }]} />
              </Form.Item>
              <Form.Item label="开始时间" name="start_time" rules={[{ required: true }]}>
                <Input placeholder="2026-04-06T09:00:00" />
              </Form.Item>
              <Form.Item label="结束时间" name="end_time" rules={[{ required: true }]}>
                <Input placeholder="2026-04-06T18:00:00" />
              </Form.Item>
              <Form.Item label="时长(小时)" name="duration_hours">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
              <Form.Item label="同步考勤" name="sync_attendance" initialValue={1}>
                <Select options={[{ label: '是', value: 1 }, { label: '否', value: 0 }]} />
              </Form.Item>
              <Form.Item label="同步排班" name="sync_schedule" initialValue={1}>
                <Select options={[{ label: '是', value: 1 }, { label: '否', value: 0 }]} />
              </Form.Item>
              <Form.Item label="原因" name="reason">
                <Input.TextArea rows={3} />
              </Form.Item>
            </>
          ) : null}

          {activeTab === 'overtimes' ? (
            <>
              <Form.Item label="加班单号" name="overtime_no">
                <Input placeholder="留空则自动生成" />
              </Form.Item>
              <Form.Item label="开始时间" name="start_time" rules={[{ required: true }]}>
                <Input placeholder="2026-04-06T19:00:00" />
              </Form.Item>
              <Form.Item label="结束时间" name="end_time" rules={[{ required: true }]}>
                <Input placeholder="2026-04-06T22:00:00" />
              </Form.Item>
              <Form.Item label="时长(小时)" name="duration_hours">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
              <Form.Item label="同步考勤" name="sync_attendance" initialValue={1}>
                <Select options={[{ label: '是', value: 1 }, { label: '否', value: 0 }]} />
              </Form.Item>
              <Form.Item label="同步排班" name="sync_schedule" initialValue={0}>
                <Select options={[{ label: '是', value: 1 }, { label: '否', value: 0 }]} />
              </Form.Item>
              <Form.Item label="原因" name="reason">
                <Input.TextArea rows={3} />
              </Form.Item>
            </>
          ) : null}

          {activeTab === 'patch-cards' ? (
            <>
              <Form.Item label="补卡单号" name="patch_no">
                <Input placeholder="留空则自动生成" />
              </Form.Item>
              <Form.Item label="补卡日期" name="patch_date" rules={[{ required: true }]}>
                <Input placeholder="2026-04-06T00:00:00" />
              </Form.Item>
              <Form.Item label="补卡类型" name="patch_type" rules={[{ required: true }]}>
                <Select options={[{ label: '上班补卡', value: '上班补卡' }, { label: '下班补卡', value: '下班补卡' }]} />
              </Form.Item>
              <Form.Item label="目标时间" name="target_time" rules={[{ required: true }]}>
                <Input placeholder="2026-04-06T09:00:00" />
              </Form.Item>
              <Form.Item label="同步考勤" name="sync_attendance" initialValue={1}>
                <Select options={[{ label: '是', value: 1 }, { label: '否', value: 0 }]} />
              </Form.Item>
              <Form.Item label="原因" name="reason">
                <Input.TextArea rows={3} />
              </Form.Item>
            </>
          ) : null}

          {activeTab === 'schedule-changes' ? (
            <>
              <Form.Item label="调班单号" name="change_no">
                <Input placeholder="留空则自动生成" />
              </Form.Item>
              <Form.Item label="调班日期" name="change_date" rules={[{ required: true }]}>
                <Input placeholder="2026-04-06T00:00:00" />
              </Form.Item>
              <Form.Item label="调整前班次" name="before_shift_name">
                <Input />
              </Form.Item>
              <Form.Item label="调整后班次" name="after_shift_name">
                <Input />
              </Form.Item>
              <Form.Item label="调班类型" name="change_type" rules={[{ required: true }]}>
                <Select options={[{ label: '换班', value: '换班' }, { label: '调休', value: '调休' }, { label: '临时调整', value: '临时调整' }]} />
              </Form.Item>
              <Form.Item label="原因" name="reason">
                <Input.TextArea rows={3} />
              </Form.Item>
            </>
          ) : null}
        </Form>
      </BaseModal>
    </Space>
  );
}
