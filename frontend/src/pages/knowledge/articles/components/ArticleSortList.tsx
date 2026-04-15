import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Space, Tag, Select, message, Empty } from "antd";
import { BaseDrag } from "@/components/common/BaseDrag";
import {
  knowledgeApi,
  type KnowledgeArticle,
  type KnowledgeCategory,
} from "@/api/knowledge";
import "./ArticleSortList.less";

export function ArticleSortList() {
  const queryClient = useQueryClient();
  const [sortedArticles, setSortedArticles] = useState<KnowledgeArticle[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>();

  const { data: categories = [] } = useQuery<KnowledgeCategory[]>({
    queryKey: ["knowledge-categories"],
    queryFn: knowledgeApi.listCategories,
  });

  const { data = [], isLoading } = useQuery<KnowledgeArticle[]>({
    queryKey: ["knowledge-articles", selectedCategoryId],
    queryFn: () =>
      knowledgeApi.listArticles({
        category_id: selectedCategoryId || undefined,
      }),
  });

  useEffect(() => {
    if (data.length > 0) {
      // 按 sort 排序
      const sorted = [...data].sort((a, b) => (a.sort || 0) - (b.sort || 0));
      setSortedArticles(sorted);
      setHasChanges(false);
    } else {
      setSortedArticles([]);
    }
  }, [data]);

  const sortMutation = useMutation({
    mutationFn: knowledgeApi.updateArticleSort,
    onSuccess: async () => {
      message.success("排序已保存");
      setHasChanges(false);
      await queryClient.invalidateQueries({ queryKey: ["knowledge-articles"] });
    },
    onError: () => {
      message.error("排序保存失败");
    },
  });

  const handleDragEnd = (newItems: KnowledgeArticle[]) => {
    setSortedArticles(newItems);
    setHasChanges(true);
  };

  const handleSave = () => {
    const items = sortedArticles.map((article, index) => ({
      id: article.id,
      sort: index,
    }));
    sortMutation.mutate(items);
  };

  const handleReset = () => {
    const sorted = [...data].sort((a, b) => (a.sort || 0) - (b.sort || 0));
    setSortedArticles(sorted);
    setHasChanges(false);
  };

  const statusMap: Record<string, { text: string; color: string }> = {
    draft: { text: "草稿", color: "default" },
    published: { text: "已发布", color: "success" },
    archived: { text: "已归档", color: "warning" },
  };

  if (isLoading) {
    return <Card loading />;
  }

  return (
    <Card
      title={
        <Space>
          <span>文章排序</span>
          {hasChanges && <Tag color="warning">未保存</Tag>}
        </Space>
      }
      extra={
        <Space>
          <Select
            style={{ width: 200 }}
            placeholder="选择分类"
            allowClear
            value={selectedCategoryId}
            onChange={setSelectedCategoryId}
            options={categories.map((cat) => ({
              label: cat.category_name,
              value: cat.id,
            }))}
          />
          <Button onClick={handleReset} disabled={!hasChanges}>
            重置
          </Button>
          <Button
            type="primary"
            onClick={handleSave}
            loading={sortMutation.isPending}
            disabled={!hasChanges}
          >
            保存排序
          </Button>
        </Space>
      }
    >
      <div className="article-sort-container">
        {sortedArticles.length === 0 ? (
          <Empty
            description={
              selectedCategoryId ? "该分类下暂无文章" : "请选择分类查看文章"
            }
            style={{ padding: "60px 0" }}
          />
        ) : (
          <>
            <div className="sort-tip">
              拖拽调整文章的展示顺序，排序越靠前越优先展示
            </div>

            <BaseDrag
              items={sortedArticles}
              getItemId={(article) => article.id}
              onDragEnd={handleDragEnd}
              renderItem={(article, index) => (
                <div className="article-sort-item">
                  <span className="drag-handle">⋮⋮</span>
                  <span className="sort-number">{index + 1}</span>
                  <div className="article-info">
                    <div className="article-header">
                      <span className="article-title">{article.title}</span>
                      <Space size={8}>
                        {article.category_name && (
                          <Tag color="blue">{article.category_name}</Tag>
                        )}
                        <Tag
                          color={statusMap[article.status]?.color || "default"}
                        >
                          {statusMap[article.status]?.text || article.status}
                        </Tag>
                        {article.is_public === 1 && (
                          <Tag color="green">公开</Tag>
                        )}
                      </Space>
                    </div>
                    <div className="article-meta">
                      {article.author_name && (
                        <span>作者: {article.author_name}</span>
                      )}
                      {article.keyword && (
                        <span>关键词: {article.keyword}</span>
                      )}
                      {article.source_type && (
                        <span>
                          来源:{" "}
                          {article.source_type === "manual"
                            ? "手动创建"
                            : "文档导入"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              direction="vertical"
            />
          </>
        )}
      </div>
    </Card>
  );
}
