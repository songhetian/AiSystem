import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Input, Progress, Select, Space, Statistic, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { examApi, type ExamAssignment, type ExamMyStats } from '@/api/exam';
import { Permission } from '@/components/permission/Permission';
import { BaseTable } from '@/components/table/BaseTable';

export default function MyExamsPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>();
  const { data = [], isLoading } = useQuery<ExamAssignment[]>({
    queryKey: ['exam-my', keyword, status],
    queryFn: () => examApi.listMyExams({ keyword: keyword || undefined, status })
  });
  const { data: stats } = useQuery<ExamMyStats>({
    queryKey: ['exam-my-stats'],
    queryFn: examApi.getMyStats
  });

  const columns: ProColumns<ExamAssignment>[] = useMemo(
    () => [
      { title: '计划', render: (_, record) => record.plan.plan_name },
      { title: '试卷', render: (_, record) => record.plan.paper?.paper_name ?? '-' },
      { title: '考试时间', render: (_, record) => `${new Date(record.plan.start_time).toLocaleString()} ~ ${new Date(record.plan.end_time).toLocaleString()}` },
      { title: '时长', render: (_, record) => `${record.plan.duration_min} 分钟` },
      {
        title: '次数',
        width: 130,
        render: (_, record) => `${record.attempt_count ?? 0}/${record.plan.max_attempts ?? 1}`
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        render: (_, record) => {
          const colorMap: Record<string, string> = {
            pending: 'default',
            in_progress: 'processing',
            submitted: 'success',
            expired: 'error'
          };
          const labelMap: Record<string, string> = {
            pending: '待考试',
            in_progress: '考试中',
            submitted: '已交卷',
            expired: '已过期'
          };
          return <Tag color={colorMap[record.status]}>{labelMap[record.status] ?? record.status}</Tag>;
        }
      },
      {
        title: '成绩',
        width: 140,
        render: (_, record) =>
          record.status === 'submitted' ? (
            <Space>
              <Tag color={record.passed === 1 ? 'success' : 'error'}>{record.passed === 1 ? '通过' : '未通过'}</Tag>
              <span>{record.score} 分</span>
            </Space>
          ) : (
            '-'
          )
      },
      {
        title: '操作',
        width: 120,
        render: (_, record) => (
          <Permission code={record.status === 'submitted' && !record.can_retake ? 'exam:my:list' : 'exam:my:submit'}>
            <Button type="link" onClick={() => navigate(`/exam/my/${record.id}`)}>
              {record.status === 'submitted' && !record.can_retake ? '查看结果' : record.status === 'expired' && record.can_retake ? '参加补考' : record.status === 'submitted' ? '再次考试' : '进入考试'}
            </Button>
          </Permission>
        )
      }
    ],
    [navigate]
  );

  return (
    <Card title="我的考试">
      <Space style={{ marginBottom: 16 }} wrap size={16}>
        <Card size="small">
          <Statistic title="平均分" value={stats?.average_score ?? 0} suffix="分" />
        </Card>
        <Card size="small">
          <Statistic title="合格次数" value={stats?.pass_count ?? 0} />
        </Card>
        <Card size="small">
          <Statistic title="不合格次数" value={stats?.fail_count ?? 0} />
        </Card>
        <Card size="small">
          <Statistic title="缺考次数" value={stats?.absent_count ?? 0} />
        </Card>
        <Card size="small">
          <Statistic title="答题正确率" value={stats?.accuracy ?? 0} suffix="%" />
        </Card>
      </Space>
      <Card title="题型正确率" size="small" style={{ marginBottom: 16 }}>
        <Space wrap size={24}>
          {(stats?.question_type_stats ?? []).map((item) => (
            <Card key={item.question_type} size="small" style={{ minWidth: 220 }}>
              <Statistic
                title={item.question_type === 'single' ? '单选题' : item.question_type === 'multiple' ? '多选题' : '判断题'}
                value={item.accuracy}
                suffix="%"
              />
              <Progress percent={item.accuracy} showInfo={false} strokeColor="#1677ff" />
              <div>{item.correct_count}/{item.total_count} 题答对</div>
            </Card>
          ))}
        </Space>
      </Card>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          allowClear
          style={{ width: 240 }}
          placeholder="搜索计划/试卷"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <Select
          allowClear
          style={{ width: 180 }}
          placeholder="考试状态"
          value={status}
          onChange={setStatus}
          options={[
            { label: '待考试', value: 'pending' },
            { label: '考试中', value: 'in_progress' },
            { label: '已交卷', value: 'submitted' },
            { label: '已过期', value: 'expired' }
          ]}
        />
      </Space>
      <BaseTable<ExamAssignment> rowKey="id" columns={columns} dataSource={data} loading={isLoading} />
    </Card>
  );
}
