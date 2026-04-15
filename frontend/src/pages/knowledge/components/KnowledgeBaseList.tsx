import React, { useState, useEffect } from 'react';
import { Card, Tag, Input, Space, Badge, Modal, Empty, Skeleton } from 'antd';
import { SearchOutlined, BookOutlined } from '@ant-design/icons';
import { knowledgeApi, KnowledgeArticle } from '@/api/knowledge';

export const KnowledgeBaseList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [keyword, setKeyword] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<KnowledgeArticle | null>(null);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const data = await knowledgeApi.listArticles({ keyword });
      setArticles(data as any);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [keyword]);

  const sourceMap: Record<string, { color: string; label: string }> = {
    'manual': { color: 'blue', label: '人工录入' },
    'document_parse': { color: 'magenta', label: '文档解析' },
    'service_faq': { color: 'purple', label: '会话提炼' },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">知识库列表</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Knowledge Articles</p>
        </div>
        <Input 
          className="w-72 rounded-full px-4 border-slate-200" 
          placeholder="搜索知识标题、关键词..." 
          prefix={<SearchOutlined className="text-slate-400" />} 
          onPressEnter={(e: any) => setKeyword(e.target.value)} 
          allowClear
          onClear={() => setKeyword('')}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <Skeleton active paragraph={{ rows: 4 }} />
          <Skeleton active paragraph={{ rows: 4 }} />
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      ) : articles.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-100">
          <Empty description={<span className="font-bold text-slate-400">当前没有被转化为有效知识的内容</span>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {articles.map(item => {
            const src = sourceMap[item.source_type ?? 'manual'] || sourceMap['manual'];
            return (
              <Card 
                key={item.id} 
                hoverable 
                className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[200px]"
                bodyStyle={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}
                onClick={() => { setCurrentArticle(item); setDetailOpen(true); }}
              >
                <div className="flex justify-between items-start mb-2">
                  <Badge color={item.status === 'published' ? 'green' : 'orange'} text={<span className="font-black text-xs text-slate-600">{item.status === 'published' ? '已收录' : '草稿'}</span>} />
                  <Tag color={src.color} className="border-none font-bold text-[10px] m-0">{src.label}</Tag>
                </div>
                
                <h3 className="font-black text-slate-900 text-base leading-tight mb-2 line-clamp-2 mt-2 flex-grow">
                  <BookOutlined className="mr-2 text-slate-400" />
                  {item.title}
                </h3>

                <div className="mt-auto pt-4 flex justify-between items-center border-t border-slate-50">
                  <span className="text-xs text-slate-400 font-bold truncate pr-3">{item.category_name || '未分类'}</span>
                  <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{new Date(item.update_time).toLocaleDateString()}</span>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        title={<span className="text-lg font-black text-slate-900">{currentArticle?.title}</span>}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={800}
        centered
      >
        <div className="bg-slate-50 p-6 rounded-2xl max-h-[60vh] overflow-y-auto border border-slate-100">
          <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
            {currentArticle?.content || '暂无内容'}
          </div>
          {currentArticle?.keyword && (
            <div className="mt-6 pt-4 border-t border-slate-200">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest block mb-2">Keywords / Tags</span>
              <Space wrap>
                {currentArticle.keyword.split(',').map(k => k.trim()).filter(Boolean).map(k => (
                  <Tag key={k} color="blue" className="rounded-md border-none px-3 font-bold bg-blue-50 text-blue-600">{k}</Tag>
                ))}
              </Space>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
