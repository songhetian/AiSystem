import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Space, Tag, message } from 'antd';
import { knowledgeApi, type KnowledgeFaqCandidate } from '@/api/knowledge';
import { Permission } from '@/components/permission/Permission';
import { BaseTable } from '@/components/table/BaseTable';

export default function KnowledgeFaqCandidatesPage() {
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery<KnowledgeFaqCandidate[]>({
    queryKey: ['knowledge-faq-candidates'],
    queryFn: knowledgeApi.listFaqCandidates
  });

  const archiveMutation = useMutation({
    mutationFn: (candidate: KnowledgeFaqCandidate) =>
      knowledgeApi.createArticle({
        title: candidate.question,
        content: `问题：${candidate.question}\n\n标准回复：\n1. 先确认客户诉求。\n2. 提供标准解答。\n3. 如果涉及价格或售后，说明升级路径。`,
        category_name: '高频问题',
        status: 'published',
        platform_id: candidate.platform_id,
        dept_id: candidate.dept_id,
        shop_id: candidate.shop_id,
        source_type: 'service_faq',
        source_ref: candidate.source_ref,
        keyword: candidate.question
      }),
    onSuccess: async () => {
      message.success('已沉淀为知识库文章');
      await queryClient.invalidateQueries({ queryKey: ['knowledge-faq-candidates'] });
      await queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
    }
  });

  const columns: ProColumns<KnowledgeFaqCandidate>[] = [
    { title: '高频问题', dataIndex: 'question' },
    { title: '命中次数', dataIndex: 'count', width: 100 },
    { title: '最近分析时间', dataIndex: 'latest_analyzed_at', width: 180 },
    {
      title: '状态',
      width: 120,
      render: (_, record) => (
        <Tag color={record.already_archived ? 'success' : 'warning'}>{record.already_archived ? '已沉淀' : '待沉淀'}</Tag>
      )
    },
    {
      title: '操作',
      width: 140,
      render: (_, record) => (
        <Permission code="knowledge:article:create">
          <Button
            type="link"
            disabled={record.already_archived}
            loading={archiveMutation.isPending}
            onClick={() => archiveMutation.mutate(record)}
          >
            一键入库
          </Button>
        </Permission>
      )
    }
  ];

  return (
    <Card
      title="FAQ 候选池"
      extra={
        <Space>
          <Tag color="blue">来源：AI质检高频问题</Tag>
        </Space>
      }
    >
      <BaseTable<KnowledgeFaqCandidate> rowKey="question" columns={columns} dataSource={data} loading={isLoading} />
    </Card>
  );
}
