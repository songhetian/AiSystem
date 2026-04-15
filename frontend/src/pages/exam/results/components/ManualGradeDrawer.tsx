import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, Input, InputNumber, Space, Typography, message, Skeleton, Tag, Divider } from 'antd';
import { examApi, type ExamAssignment, type ExamPaper } from '@/api/exam';

const { Text, Title } = Typography;

interface ManualGradeDrawerProps {
  open: boolean;
  onClose: () => void;
  record?: ExamAssignment;
}

export function ManualGradeDrawer({ open, onClose, record }: ManualGradeDrawerProps) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: paper, isLoading } = useQuery<ExamPaper>({
    queryKey: ['exam-paper-detail', record?.plan.paper_id],
    queryFn: () => examApi.getPaper(record!.plan.paper_id),
    enabled: !!record?.plan?.paper_id && open
  });

  const mutation = useMutation({
    mutationFn: (values: any) => {
      const grades = Object.keys(values).map(qId => ({
        question_id: qId,
        score: values[qId].score ?? 0,
        comment: values[qId].comment
      }));
      return examApi.manualGrade(record!.id, { grades });
    },
    onSuccess: async () => {
      message.success('判卷保存成功');
      await queryClient.invalidateQueries({ queryKey: ['exam-results'] });
      onClose();
    }
  });

  useEffect(() => {
    if (open && record && paper) {
      const initialValues: Record<string, any> = {};
      const answerMap = new Map((record.answers || []).map(a => [a.question_id, a]));
      paper.questions.forEach(q => {
        const ans = answerMap.get(q.id!);
        initialValues[q.id!] = {
          score: ans?.score ?? 0,
          comment: ans?.comment ?? ''
        };
      });
      form.setFieldsValue(initialValues);
    }
  }, [open, record, paper, form]);

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Drawer
      title={`阅卷 / 成绩校准: ${record?.employee_name ?? '未知'}`}
      width={720}
      open={open}
      onClose={handleClose}
      footer={
        <Space style={{ float: 'right' }}>
          <Button onClick={handleClose}>取消</Button>
          <Button type="primary" onClick={() => form.submit()} loading={mutation.isPending}>
            保存并重算成绩
          </Button>
        </Space>
      }
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <Form form={form} layout="vertical" onFinish={(values) => mutation.mutate(values)}>
          {!paper?.questions?.length && <Text type="secondary">试卷暂无题目</Text>}
          
          {paper?.questions?.map((q, index) => {
            const stuAnswer = record?.answers?.find(a => a.question_id === q.id);
            const isSubjective = q.question_type === 'fill' || q.question_type === 'essay';
            const bgColor = stuAnswer?.correct ? '#f6ffed' : '#fff1f0';
            const borderColor = stuAnswer?.correct ? '#b7eb8f' : '#ffa39e';

            return (
              <div
                key={q.id}
                style={{
                  marginBottom: 24,
                  padding: 16,
                  borderRadius: 8,
                  border: `1px solid ${stuAnswer?.manually_graded ? '#91caff' : '#f0f0f0'}`,
                  backgroundColor: '#fafafa'
                }}
              >
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                  <Text className="font-bold text-slate-900" style={{ fontSize: 15 }}>
                    {index + 1}. {q.title}
                  </Text>
                  <Space>
                    <Tag>{q.question_type}</Tag>
                    <Text className="font-bold text-slate-500">此题满分: {q.score} 分</Text>
                  </Space>
                </div>

                <div style={{ padding: '8px 12px', background: '#fff', border: `1px solid ${borderColor}`, borderRadius: 4, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text className="text-slate-500">考生存卷答案:</Text>
                    <Text className="font-black text-slate-900">
                      {Array.isArray(stuAnswer?.answer) ? stuAnswer?.answer.join(', ') : String(stuAnswer?.answer ?? '未作答')}
                    </Text>
                  </div>
                  <div>
                    <Text className="text-slate-500">系统原判结果: </Text>
                    <Text type={stuAnswer?.correct ? 'success' : 'danger'} className="font-bold">
                      {stuAnswer?.correct ? '正确' : '错误'} ({stuAnswer?.score ?? 0} 分)
                    </Text>
                    {stuAnswer?.manually_graded && <Tag color="blue" style={{ marginLeft: 8 }}>已人工校准</Tag>}
                  </div>
                </div>

                <div className="flex w-full gap-4 flex-grow">
                  <Form.Item
                    label={<span className="font-bold text-slate-900">本题得分</span>}
                    name={[q.id!, 'score']}
                    style={{ minWidth: 120 }}
                  >
                    <InputNumber min={0} max={q.score} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    label={<span className="font-bold text-slate-900">教师评语</span>}
                    name={[q.id!, 'comment']}
                    style={{ flexGrow: 1 }}
                  >
                    <Input placeholder={isSubjective ? "请输入主观题评语" : "请输入校准备注/评语"} />
                  </Form.Item>
                </div>
              </div>
            );
          })}
        </Form>
      )}
    </Drawer>
  );
}
