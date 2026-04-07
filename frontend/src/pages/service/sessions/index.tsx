import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Input, Segmented, Space, Statistic, Tag, Typography, message } from 'antd';
import { useNavigate } from 'umi';
import { serviceApi, type ServiceAiOverview, type ServiceSessionRecord } from '@/api/service';
import { Permission } from '@/components/permission/Permission';
import { BaseTable } from '@/components/table/BaseTable';

type RiskView = 'all' | 'high' | 'medium' | 'low';

const riskColorMap: Record<'high' | 'medium' | 'low', string> = {
  high: 'error',
  medium: 'warning',
  low: 'success'
};

export default function ServiceSessionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [riskView, setRiskView] = useState<RiskView>('all');

  const queryParams = useMemo(
    () => ({
      keyword: keyword || undefined,
      risk_level: riskView === 'all' ? undefined : riskView
    }),
    [keyword, riskView]
  );

  const { data: sessions = [], isLoading } = useQuery<ServiceSessionRecord[]>({
    queryKey: ['service-sessions', queryParams],
    queryFn: () => serviceApi.listSessions(queryParams)
  });

  const { data: overview } = useQuery<ServiceAiOverview>({
    queryKey: ['service-ai-overview', queryParams],
    queryFn: () => serviceApi.getAiOverview(queryParams)
  });

  const analyzeMutation = useMutation({
    mutationFn: (id: string) => serviceApi.analyzeSession(id, { mode: 'manual' }),
    onSuccess: async () => {
      message.success('AI 质检已重新分析');
      await queryClient.invalidateQueries({ queryKey: ['service-sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['service-ai-overview'] });
    }
  });

  const columns: ProColumns<ServiceSessionRecord>[] = [
    {
      title: '会话编号',
      dataIndex: 'session_no',
      width: 180
    },
    {
      title: '客户 / 客服',
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Typography.Text strong>{record.customer_nickname || '匿名客户'}</Typography.Text>
          <Typography.Text type="secondary">{record.agent_name || '-'}</Typography.Text>
        </div>
      )
    },
    {
      title: 'AI 质检',
      render: (_, record) => {
        const analysis = record.latest_analysis;
        if (!analysis) {
          return <Tag>未分析</Tag>;
        }

        return (
          <Space direction="vertical" size={4}>
            <Space wrap>
              <Tag color={analysis.quality_passed ? 'success' : 'error'}>
                {analysis.quality_passed ? '合格' : '不合格'}
              </Tag>
              <Tag color={riskColorMap[analysis.loss_risk_level]}>{analysis.loss_risk_level}</Tag>
            </Space>
            <Typography.Text type="secondary">
              质检分 {analysis.quality_score} / 流失分 {analysis.loss_risk_score}
            </Typography.Text>
          </Space>
        );
      }
    },
    {
      title: '高频问题 / 敏感词',
      render: (_, record) => {
        const analysis = record.latest_analysis;
        return (
          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary">
              FAQ {analysis?.faq_hit_count ?? 0} / 敏感词 {analysis?.sensitive_hit_count ?? 0}
            </Typography.Text>
            {record.tags?.length ? (
              <Space size={[4, 4]} wrap>
                {record.tags.slice(0, 3).map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </Space>
            ) : null}
          </Space>
        );
      }
    },
    {
      title: '会话状态',
      render: (_, record) => <Tag>{record.status}</Tag>,
      width: 120
    },
    {
      title: '开始时间',
      dataIndex: 'started_at',
      width: 180
    },
    {
      title: '操作',
      width: 220,
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => navigate(`/service/sessions/${record.id}`)}>
            详情
          </Button>
          <Permission code="service:quality:analyze">
            <Button type="link" loading={analyzeMutation.isPending} onClick={() => analyzeMutation.mutate(record.id)}>
              重新分析
            </Button>
          </Permission>
        </Space>
      )
    }
  ];

  return (
    <Card
      title="客服 AI 质检"
      extra={
        <Space wrap>
          <Input.Search allowClear placeholder="搜索会话编号、客户、客服" style={{ width: 280 }} onChange={(e) => setKeyword(e.target.value)} />
          <Segmented<RiskView>
            value={riskView}
            onChange={setRiskView}
            options={[
              { label: '全部风险', value: 'all' },
              { label: '高风险', value: 'high' },
              { label: '中风险', value: 'medium' },
              { label: '低风险', value: 'low' }
            ]}
          />
        </Space>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
        <Card size="small">
          <Statistic title="会话总量" value={overview?.totalSessions ?? 0} />
        </Card>
        <Card size="small">
          <Statistic title="分析完成" value={overview?.analyzedSessions ?? 0} />
        </Card>
        <Card size="small">
          <Statistic title="质检通过率" value={overview?.qualityPassRate ?? 0} suffix="%" precision={2} />
        </Card>
        <Card size="small">
          <Statistic title="高风险询单" value={overview?.riskBuckets?.high ?? 0} />
        </Card>
      </div>

      <BaseTable<ServiceSessionRecord> rowKey="id" columns={columns} dataSource={sessions} loading={isLoading} />
    </Card>
  );
}
