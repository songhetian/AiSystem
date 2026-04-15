import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Skeleton, Typography, Tag, Empty } from 'antd';
import { examApi, type ExamPaper } from '@/api/exam';

const { Text } = Typography;

interface QuestionStatsModalProps {
  open: boolean;
  onClose: () => void;
  planId?: string;
  paperId?: string;
  planName?: string;
}

export function QuestionStatsModal({ open, onClose, planId, paperId, planName }: QuestionStatsModalProps) {
  const { data: paper, isLoading: isPaperLoading } = useQuery<ExamPaper>({
    queryKey: ['exam-paper-detail', paperId],
    queryFn: () => examApi.getPaper(paperId!),
    enabled: !!paperId && open
  });

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['exam-question-stats', planId],
    queryFn: () => examApi.getQuestionStats(planId!),
    enabled: !!planId && open
  });

  const mergedData = useMemo(() => {
    if (!paper?.questions || !stats) return [];
    
    const statsMap = new Map(stats.map(s => [s.question_id, s]));
    
    return paper.questions.map(q => {
      const match = statsMap.get(q.id!);
      return {
        ...q,
        total_answers: match?.total_answers ?? 0,
        correct_count: match?.correct_count ?? 0,
        error_rate: match?.error_rate ?? 0
      };
    }).sort((a, b) => b.error_rate - a.error_rate); // Sort by highest error rate first
  }, [paper, stats]);

  return (
    <Modal
      title={`易错题分析看板 - ${planName ?? '未知'}`}
      width={800}
      open={open}
      onCancel={onClose}
      footer={null}
      centered
    >
      {(isPaperLoading || isStatsLoading) ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : mergedData.length === 0 ? (
        <Empty description="暂无试答数据" />
      ) : (
        <div className="flex flex-col gap-6 mt-4 max-h-[60vh] overflow-y-auto pr-2">
          {mergedData.map((item, index) => {
            const errorRateStr = item.error_rate.toFixed(1);
            const isHighError = item.error_rate > 50;

            return (
              <div key={item.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex justify-between items-start mb-3">
                  <Text className="font-bold text-slate-900 flex-grow pr-4" style={{ fontSize: 15 }}>
                    {index + 1}. {item.title}
                  </Text>
                  <Tag color={isHighError ? 'error' : 'processing'}>
                    错误率 {errorRateStr}%
                  </Tag>
                </div>

                <div className="flex justify-between text-slate-500 mb-1" style={{ fontSize: 13 }}>
                  <span>作答/交卷次数: <strong className="text-slate-900">{item.total_answers}</strong></span>
                  <span>答对: <strong className="text-emerald-600 font-bold">{item.correct_count}</strong></span>
                </div>

                {/* CSS Native Bar Chart Container */}
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden flex relative">
                  {/* Correct (Green) */}
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-500 will-change-transform" 
                    style={{ width: `${100 - item.error_rate}%` }} 
                  />
                  {/* Error (Red) */}
                  <div 
                    className="bg-rose-500 h-full transition-all duration-500 will-change-transform" 
                    style={{ width: `${item.error_rate}%` }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
