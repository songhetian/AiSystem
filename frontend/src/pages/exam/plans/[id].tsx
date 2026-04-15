import { useQuery } from '@tanstack/react-query';
import { Button, Card, Descriptions, Progress, Space, Statistic, Tag, Typography, Skeleton } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { examApi } from '@/api/exam';
import { ScoreDistributionChart } from '../components/ScoreDistributionChart';
import { DeptComparisonChart } from '../components/DeptComparisonChart';
import { TimeTrendChart } from '../components/TimeTrendChart';

const { Title, Text } = Typography;

export default function ExamPlanDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: plan, isLoading } = useQuery({
    queryKey: ['exam-plan-detail', id],
    queryFn: () => examApi.getPlanDetail(id!),
    enabled: !!id
  });

  if (isLoading) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card>
        <Text type="danger">考试计划不存在</Text>
      </Card>
    );
  }

  const stats = plan.stats || {};
  const colorMap: Record<string, string> = { upcoming: 'gold', ongoing: 'processing', ended: 'default' };
  const labelMap: Record<string, string> = { upcoming: '未开始', ongoing: '进行中', ended: '已结束' };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      {/* Header */}
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space>
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={() => navigate('/exam/plans')}
              >
                返回列表
              </Button>
              <Title level={3} style={{ margin: 0 }}>
                {plan.plan_name}
              </Title>
              <Tag color={colorMap[plan.runtime_status || 'upcoming']}>
                {labelMap[plan.runtime_status || 'upcoming']}
              </Tag>
            </Space>
          </div>

          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="试卷名称">
              {plan.paper?.paper_name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="试卷总分">
              {plan.paper?.total_score || 0} 分
            </Descriptions.Item>
            <Descriptions.Item label="考试时间">
              {dayjs(plan.start_time).format('YYYY-MM-DD HH:mm')} ~ {dayjs(plan.end_time).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="答题时长">
              {plan.duration_min} 分钟
            </Descriptions.Item>
            <Descriptions.Item label="及格分数">
              {plan.pass_score} 分
            </Descriptions.Item>
            <Descriptions.Item label="最大次数">
              {plan.max_attempts || 1} 次
            </Descriptions.Item>
            <Descriptions.Item label="提醒模式">
              <Tag color={plan.reminder_mode === 'force' ? 'red' : 'blue'}>
                {plan.reminder_mode === 'force' ? '强制进入' : '消息提醒'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="允许重考">
              <Tag color={plan.allow_retake === 1 ? 'success' : 'default'}>
                {plan.allow_retake === 1 ? '是' : '否'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="允许补考">
              <Tag color={plan.allow_makeup === 1 ? 'success' : 'default'}>
                {plan.allow_makeup === 1 ? `是（${plan.makeup_limit || 0}次）` : '否'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="缺考判定阈值">
              {plan.absent_mark_minutes || 0} 分钟
            </Descriptions.Item>
          </Descriptions>
        </Space>
      </Card>

      {/* Statistics */}
      <Card title="考试统计数据">
        <Space style={{ marginBottom: 16 }} wrap size={16}>
          <Card size="small" style={{ minWidth: 180 }}>
            <Statistic title="应参加人数" value={stats.total_count || 0} />
          </Card>
          <Card size="small" style={{ minWidth: 180 }}>
            <Statistic title="已交卷" value={stats.submitted_count || 0} />
          </Card>
          <Card size="small" style={{ minWidth: 180 }}>
            <Statistic title="通过人数" value={stats.passed_count || 0} />
          </Card>
          <Card size="small" style={{ minWidth: 180 }}>
            <Statistic title="缺考人数" value={stats.absent_count || 0} />
          </Card>
          <Card size="small" style={{ minWidth: 180 }}>
            <Statistic title="未完成" value={stats.pending_count || 0} />
          </Card>
          <Card size="small" style={{ minWidth: 180 }}>
            <Statistic title="平均分" value={stats.average_score?.toFixed(1) || 0} suffix="分" />
          </Card>
        </Space>

        <Space style={{ marginBottom: 0 }} wrap size={24}>
          <Card size="small" title="整体通过率" style={{ minWidth: 280 }}>
            <Statistic value={stats.pass_rate?.toFixed(1) || 0} suffix="%" />
            <Progress 
              percent={Number(stats.pass_rate?.toFixed(1) || 0)} 
              showInfo={false} 
              strokeColor="#52c41a" 
            />
          </Card>
          <Card size="small" title="整体缺考率" style={{ minWidth: 280 }}>
            <Statistic value={stats.absent_rate?.toFixed(1) || 0} suffix="%" />
            <Progress 
              percent={Number(stats.absent_rate?.toFixed(1) || 0)} 
              showInfo={false} 
              strokeColor="#fa8c16" 
            />
          </Card>
        </Space>
      </Card>

      {/* Charts */}
      <ScoreDistributionChart planId={id!} />
      
      <TimeTrendChart planId={id!} />
      
      <DeptComparisonChart planId={id!} />

      {/* Paper Questions */}
      {plan.paper?.questions && plan.paper.questions.length > 0 && (
        <Card title={`试卷题目（共 ${plan.paper.questions.length} 题）`}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            {plan.paper.questions.map((q: any, index: number) => (
              <Card 
                key={q.id} 
                size="small" 
                style={{ 
                  backgroundColor: '#fafafa',
                  border: '1px solid #f0f0f0'
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  <Space>
                    <Text className="font-bold text-slate-900" style={{ fontSize: 15 }}>
                      {index + 1}. {q.title}
                    </Text>
                    <Tag>
                      {q.question_type === 'single' ? '单选题' : 
                       q.question_type === 'multiple' ? '多选题' : '判断题'}
                    </Tag>
                    <Text className="font-bold text-slate-500">{q.score} 分</Text>
                  </Space>
                </div>
                
                {q.options && q.options.length > 0 && (
                  <div style={{ marginLeft: 24, marginBottom: 8 }}>
                    {q.options.map((opt: any, optIndex: number) => (
                      <div key={optIndex} style={{ marginBottom: 4 }}>
                        <Text className="text-slate-600">
                          {opt.label}. {opt.value}
                        </Text>
                      </div>
                    ))}
                  </div>
                )}
                
                <div style={{ marginLeft: 24 }}>
                  <Text className="text-slate-500">
                    正确答案: 
                    <Text className="font-bold text-emerald-600" style={{ marginLeft: 8 }}>
                      {Array.isArray(q.correct_answer) 
                        ? q.correct_answer.join(', ') 
                        : String(q.correct_answer)}
                    </Text>
                  </Text>
                </div>
                
                {q.explanation && (
                  <div style={{ marginLeft: 24, marginTop: 8 }}>
                    <Text className="text-slate-500">
                      解析: <Text className="text-slate-700">{q.explanation}</Text>
                    </Text>
                  </div>
                )}
              </Card>
            ))}
          </Space>
        </Card>
      )}
    </Space>
  );
}
