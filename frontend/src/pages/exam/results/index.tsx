import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Form, Input, Progress, Select, Space, Statistic, Tag, message } from 'antd';
import { examApi, type ExamAssignment, type ExamPlan, type ExamResultSummary } from '@/api/exam';
import { BaseModal } from '@/components/common/BaseModal';
import { Permission } from '@/components/permission/Permission';
import { BaseTable } from '@/components/table/BaseTable';

export default function ExamResultsPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>();
  const [planId, setPlanId] = useState<string>();
  const [markAbsentOpen, setMarkAbsentOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<ExamAssignment>();
  const [form] = Form.useForm();

  const { data = [], isLoading } = useQuery<ExamAssignment[]>({
    queryKey: ['exam-results', keyword, status, planId],
    queryFn: () => examApi.listResults({ keyword: keyword || undefined, status, plan_id: planId })
  });
  const { data: summary } = useQuery<ExamResultSummary>({
    queryKey: ['exam-results-summary', keyword, status, planId],
    queryFn: () => examApi.getResultSummary({ keyword: keyword || undefined, status, plan_id: planId })
  });

  const { data: plans = [] } = useQuery<ExamPlan[]>({
    queryKey: ['exam-plan-options'],
    queryFn: examApi.listPlans
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['exam-results'] });
    await queryClient.invalidateQueries({ queryKey: ['exam-results-summary'] });
    await queryClient.invalidateQueries({ queryKey: ['exam-my'] });
  };

  const markAbsentMutation = useMutation({
    mutationFn: async (values: { reason?: string }) => examApi.markAbsent(currentRecord!.id, values),
    onSuccess: async () => {
      message.success('已标记为缺考');
      setMarkAbsentOpen(false);
      setCurrentRecord(undefined);
      form.resetFields();
      await refresh();
    }
  });

  const deptColumns: ProColumns<ExamResultSummary['department_stats'][number]>[] = useMemo(
    () => [
      { title: '部门', dataIndex: 'dept_name' },
      { title: '应参加', dataIndex: 'total_count', width: 90 },
      { title: '已交卷', dataIndex: 'submitted_count', width: 90 },
      { title: '通过', dataIndex: 'pass_count', width: 80 },
      { title: '缺考', dataIndex: 'absent_count', width: 80 },
      { title: '平均分', dataIndex: 'average_score', width: 90 },
      { title: '通过率', render: (_, record) => `${record.pass_rate}%`, width: 90 },
      { title: '缺考率', render: (_, record) => `${record.absent_rate}%`, width: 90 }
    ],
    []
  );

  const columns: ProColumns<ExamAssignment>[] = useMemo(
    () => [
      { title: '人员', render: (_, record) => record.employee_name ?? '-' },
      { title: '工号', dataIndex: 'employee_no', width: 120 },
      { title: '计划', render: (_, record) => record.plan.plan_name },
      { title: '试卷', render: (_, record) => record.plan.paper?.paper_name ?? '-' },
      {
        title: '次数',
        width: 140,
        render: (_, record) => `${record.attempt_count ?? 0}/${record.plan.max_attempts ?? 1}`
      },
      { title: '交卷时间', render: (_, record) => (record.submitted_at ? new Date(record.submitted_at).toLocaleString() : '-') },
      {
        title: '结果',
        render: (_, record) =>
          record.status === 'submitted' ? (
            <Space>
              <Tag color={record.passed === 1 ? 'success' : 'error'}>{record.passed === 1 ? '通过' : '未通过'}</Tag>
              <span>{record.score} / {record.plan.paper?.total_score ?? '-'}</span>
            </Space>
          ) : (
            <Tag color={record.status === 'expired' ? 'error' : 'default'}>{record.status === 'expired' ? '缺考' : '未完成'}</Tag>
          )
      },
      { title: '正确题数', render: (_, record) => `${record.correct_count}/${record.question_count}` },
      {
        title: '补考说明',
        render: (_, record) =>
          record.status === 'expired' ? record.absent_reason ?? '缺考' : record.can_retake ? `可继续考试，剩余 ${record.remaining_attempts ?? 0} 次` : '已结束'
      },
      {
        title: '操作',
        width: 120,
        render: (_, record) =>
          record.status === 'submitted' ? (
            '-'
          ) : (
            <Permission code="exam:result:manage">
              <Button
                type="link"
                onClick={() => {
                  setCurrentRecord(record);
                  setMarkAbsentOpen(true);
                  form.setFieldsValue({
                    reason: record.manual_absent_marked ? record.absent_reason : undefined
                  });
                }}
              >
                {record.status === 'expired' ? '修改缺考原因' : '标记缺考'}
              </Button>
            </Permission>
          )
      }
    ],
    [form]
  );

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Card title="考试结果">
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            allowClear
            style={{ width: 240 }}
            placeholder="搜索人员/工号/计划"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Select
            allowClear
            style={{ width: 180 }}
            placeholder="结果状态"
            value={status}
            onChange={setStatus}
            options={[
              { label: '已交卷', value: 'submitted' },
              { label: '缺考', value: 'expired' },
              { label: '未完成', value: 'pending' }
            ]}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 260 }}
            placeholder="按考试计划筛选"
            value={planId}
            onChange={setPlanId}
            options={plans.map((item) => ({ label: item.plan_name, value: item.id }))}
          />
        </Space>
        <Space style={{ marginBottom: 16 }} wrap size={16}>
          <Card size="small">
            <Statistic title="应参加人数" value={summary?.total_count ?? 0} />
          </Card>
          <Card size="small">
            <Statistic title="已交卷" value={summary?.submitted_count ?? 0} />
          </Card>
          <Card size="small">
            <Statistic title="缺考人数" value={summary?.absent_count ?? 0} />
          </Card>
          <Card size="small">
            <Statistic title="平均分" value={summary?.average_score ?? 0} suffix="分" />
          </Card>
          <Card size="small">
            <Statistic title="最高分" value={summary?.highest_score ?? 0} suffix="分" />
          </Card>
          <Card size="small">
            <Statistic title="最低分" value={summary?.lowest_score ?? 0} suffix="分" />
          </Card>
        </Space>
        <Space style={{ marginBottom: 16 }} wrap size={24}>
          <Card size="small" title="整体通过率" style={{ minWidth: 240 }}>
            <Statistic value={summary?.pass_rate ?? 0} suffix="%" />
            <Progress percent={summary?.pass_rate ?? 0} showInfo={false} strokeColor="#52c41a" />
          </Card>
          <Card size="small" title="整体缺考率" style={{ minWidth: 240 }}>
            <Statistic value={summary?.absent_rate ?? 0} suffix="%" />
            <Progress percent={summary?.absent_rate ?? 0} showInfo={false} strokeColor="#fa8c16" />
          </Card>
        </Space>
        <BaseTable<ExamAssignment> rowKey="id" columns={columns} dataSource={data} loading={isLoading} />
      </Card>

      <Card title="部门成绩分布">
        <BaseTable<ExamResultSummary['department_stats'][number]>
          rowKey="dept_id"
          columns={deptColumns}
          dataSource={summary?.department_stats ?? []}
          loading={isLoading}
        />
      </Card>

      <BaseModal
        open={markAbsentOpen}
        title="标记缺考"
        confirmLoading={markAbsentMutation.isPending}
        onCancel={() => {
          setMarkAbsentOpen(false);
          setCurrentRecord(undefined);
          form.resetFields();
        }}
        onOk={() => {
          form.validateFields().then((values) => markAbsentMutation.mutate(values));
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="考生">
            <Input value={currentRecord?.employee_name ?? ''} disabled />
          </Form.Item>
          <Form.Item label="考试计划">
            <Input value={currentRecord?.plan.plan_name ?? ''} disabled />
          </Form.Item>
          <Form.Item
            label="缺考原因"
            name="reason"
            rules={[{ required: true, message: '请输入缺考原因' }]}
          >
            <Input.TextArea rows={4} placeholder="例如：请假未参加、培训冲突、管理员补录缺考等" maxLength={500} showCount />
          </Form.Item>
        </Form>
      </BaseModal>
    </Space>
  );
}
