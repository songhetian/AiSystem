import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Checkbox, Empty, Radio, Space, Statistic, Tag, Typography, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { examApi, type ExamAssignment, type ExamPaperQuestion } from '@/api/exam';

const { Paragraph, Title, Text } = Typography;

function computeRemainSeconds(record?: ExamAssignment) {
  if (!record) return 0;
  const deadline = record.deadline_at ? new Date(record.deadline_at).getTime() : new Date(record.plan.end_time).getTime();
  return Math.max(0, Math.floor((deadline - Date.now()) / 1000));
}

function formatAnswer(answer: string | string[] | boolean | undefined) {
  if (Array.isArray(answer)) {
    return answer.length ? answer.join('，') : '未作答';
  }
  if (answer === undefined || answer === null || answer === '') {
    return '未作答';
  }
  if (String(answer) === 'true') return '正确';
  if (String(answer) === 'false') return '错误';
  return String(answer);
}

export default function MyExamDetailPage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string | string[] | boolean>>({});
  const [remainSeconds, setRemainSeconds] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const { data, isLoading } = useQuery<ExamAssignment>({
    queryKey: ['exam-my-detail', params.id],
    queryFn: () => examApi.getMyExamDetail(params.id),
    enabled: Boolean(params.id)
  });

  useEffect(() => {
    setRemainSeconds(computeRemainSeconds(data));
  }, [data]);

  useEffect(() => {
    if (!data || data.status === 'submitted' || data.status === 'expired') return undefined;

    const timer = window.setInterval(() => {
      setRemainSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [data]);

  const submitMutation = useMutation({
    mutationFn: () =>
      examApi.submitMyExam(params.id, {
        answers: Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer }))
      }),
    onSuccess: async (result) => {
      message.success(`交卷成功，成绩 ${result.score} 分`);
      await queryClient.invalidateQueries({ queryKey: ['exam-my'] });
      await queryClient.invalidateQueries({ queryKey: ['exam-results'] });
      await queryClient.invalidateQueries({ queryKey: ['exam-my-detail', params.id] });
      navigate('/exam/my');
    }
  });

  useEffect(() => {
    if (!data || data.status === 'submitted' || data.status === 'expired' || submitMutation.isPending) {
      return;
    }

    if (remainSeconds === 0) {
      submitMutation.mutate();
    }
  }, [data, remainSeconds, submitMutation]);

  const minuteText = useMemo(() => `${Math.floor(remainSeconds / 60)}:${String(remainSeconds % 60).padStart(2, '0')}`, [remainSeconds]);
  const canViewExplanation = data?.status === 'submitted' && data.passed === 1 && !data.can_retake;
  const canAnswer = Boolean(data && data.status !== 'submitted' && data.status !== 'expired');

  const resolveCorrectAnswer = (question: ExamPaperQuestion) => {
    if (Array.isArray(question.correct_answer)) {
      return question.correct_answer.join('，');
    }
    return formatAnswer(question.correct_answer);
  };

  const renderQuestion = (question: ExamPaperQuestion, index: number) => {
    const optionNodes = (question.options ?? []).map((item) => ({
      label: `${item.value}. ${item.label}`,
      value: item.value
    }));

    return (
      <Card key={question.id ?? index} size="small" style={{ marginBottom: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={5} style={{ margin: 0 }}>
            {index + 1}. {question.title}
          </Title>
          <Text type="secondary">
            {question.question_type === 'single' ? '单选题' : question.question_type === 'multiple' ? '多选题' : '判断题'} | {question.score} 分
          </Text>
          {data?.status === 'submitted' ? (
            <>
              <Tag color={(data.answers ?? []).find((item) => item.question_id === question.id)?.correct ? 'success' : 'error'}>
                {(data.answers ?? []).find((item) => item.question_id === question.id)?.correct ? '回答正确' : '回答错误'}
              </Tag>
              <Paragraph style={{ marginBottom: 0 }}>
                你的答案：{formatAnswer((data.answers ?? []).find((item) => item.question_id === question.id)?.answer)}
              </Paragraph>
              {showExplanation ? (
                <>
                  <Paragraph style={{ marginBottom: 0 }}>正确答案：{resolveCorrectAnswer(question)}</Paragraph>
                  {question.explanation ? <Paragraph type="secondary">解析：{question.explanation}</Paragraph> : null}
                </>
              ) : null}
            </>
          ) : question.question_type === 'multiple' ? (
            <Checkbox.Group
              options={optionNodes}
              value={(answers[question.id ?? ''] as string[]) ?? []}
              onChange={(value) => setAnswers((prev) => ({ ...prev, [question.id ?? '']: value as string[] }))}
            />
          ) : (
            <Radio.Group
              options={optionNodes}
              value={(answers[question.id ?? ''] as string) ?? undefined}
              onChange={(event) => setAnswers((prev) => ({ ...prev, [question.id ?? '']: event.target.value }))}
            />
          )}
        </Space>
      </Card>
    );
  };

  if (!isLoading && !data) {
    return <Empty description="未找到考试记录" />;
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Card loading={isLoading}>
        <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space direction="vertical">
            <Title level={4} style={{ margin: 0 }}>
              {data?.plan.plan_name}
            </Title>
            <Text type="secondary">{data?.paper?.paper_name}</Text>
            <Space>
              <Tag color={data?.reminder_mode === 'force' ? 'red' : 'blue'}>{data?.reminder_mode === 'force' ? '强制考试' : '提醒考试'}</Tag>
              <Tag>{data?.plan.duration_min} 分钟</Tag>
              <Tag>及格 {data?.plan.pass_score} 分</Tag>
              <Tag>次数 {data?.attempt_count ?? 0}/{data?.plan.max_attempts ?? 1}</Tag>
              <Tag color={data?.can_retake ? 'processing' : 'default'}>{data?.can_retake ? '仍可再考' : '无剩余次数'}</Tag>
            </Space>
          </Space>
          {data?.status === 'submitted' ? (
            <Space direction="vertical" align="end">
              <Statistic title="考试成绩" value={data.score ?? 0} suffix="分" />
              <Tag color={data.passed === 1 ? 'success' : 'error'}>{data.passed === 1 ? '通过' : '未通过'}</Tag>
            </Space>
          ) : data?.status === 'expired' ? (
            <Space direction="vertical" align="end">
              <Tag color="error">缺考</Tag>
              <Text type="secondary">0 分 / 不合格</Text>
            </Space>
          ) : (
            <Statistic title="倒计时" value={minuteText} />
          )}
        </Space>
      </Card>

      {data?.status === 'expired' ? (
        <Alert
          type="warning"
          showIcon
          message="本次考试已缺考"
          description={data.absent_reason ?? '未参加考试'}
        />
      ) : canAnswer ? (
        <Alert
          type={data?.reminder_mode === 'force' ? 'warning' : 'info'}
          showIcon
          message={data?.reminder_mode === 'force' ? '当前计划配置为强制考试，开始后应立即完成答题。' : '请在考试结束前完成答题并提交。'}
          description={data?.deadline_at ? `最晚交卷时间：${new Date(data.deadline_at).toLocaleString()}` : undefined}
        />
      ) : null}

      <Card loading={isLoading}>
        {data?.status === 'submitted' ? (
          <Space style={{ marginBottom: 16 }}>
            <Button onClick={() => setShowExplanation((prev) => !prev)} disabled={!canViewExplanation}>
              {showExplanation ? '收起详解' : '一键详解'}
            </Button>
            {!canViewExplanation ? <Text type="secondary">需考试通过且无继续考试机会时才能查看详解</Text> : null}
          </Space>
        ) : null}
        {(data?.paper?.questions ?? []).map((question, index) => renderQuestion(question, index))}
        <Space>
          <Button onClick={() => navigate('/exam/my')}>返回</Button>
          {canAnswer ? (
            <Button type="primary" loading={submitMutation.isPending} onClick={() => submitMutation.mutate()}>
              交卷并自动判分
            </Button>
          ) : null}
        </Space>
      </Card>

      {data?.attempts_history?.length ? (
        <Card title="历史记录">
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            {data.attempts_history
              .slice()
              .sort((a, b) => b.attempt_no - a.attempt_no)
              .map((item) => (
                <Card key={item.attempt_no} size="small">
                  <Space wrap size={12}>
                    <Tag>第 {item.attempt_no} 次</Tag>
                    <Tag color={item.passed === 1 ? 'success' : 'error'}>{item.passed === 1 ? '通过' : '未通过'}</Tag>
                    <span>{item.score} 分</span>
                    <span>{item.correct_count}/{item.question_count} 题正确</span>
                    <span>{new Date(item.submitted_at).toLocaleString()}</span>
                  </Space>
                </Card>
              ))}
          </Space>
        </Card>
      ) : null}
    </Space>
  );
}
