import { request } from '@/utils/request';

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category_id?: string;
  category_name?: string;
  status: string;
  author_name?: string;
  source_type?: string;
  source_ref?: string;
  keyword?: string;
  platform_id: string;
  dept_id: string;
  shop_id?: string;
  published_at?: string;
  update_time: string;
}

export interface KnowledgeFaqCandidate {
  question: string;
  count: number;
  platform_id: string;
  dept_id: string;
  shop_id?: string;
  latest_analyzed_at: string;
  source_ref?: string;
  already_archived: boolean;
}

export interface SaveKnowledgeArticlePayload {
  title: string;
  content: string;
  category_id?: string;
  category_name?: string;
  status?: string;
  platform_id?: string;
  dept_id?: string;
  shop_id?: string;
  source_type?: string;
  source_ref?: string;
  keyword?: string;
}

export interface KnowledgeCategory {
  id: string;
  category_name: string;
  category_code: string;
  parent_id?: string;
  level: number;
  sort: number;
  enabled: number;
  description?: string;
  platform_id: string;
  dept_id: string;
  shop_id?: string;
  children?: KnowledgeCategory[];
}

export interface KnowledgeTag {
  id: string;
  tag_name: string;
  tag_code: string;
  source_type?: string;
  color?: string;
  sort?: number;
  is_deleted?: number;
  platform_id: string;
  dept_id: string;
  shop_id?: string;
}

export interface KnowledgeTagImpact {
  tag: {
    id: string;
    tag_name: string;
    is_deleted?: number;
  };
  session_count: number;
  article_count: number;
  sample_sessions: Array<{ id: string; session_no?: string }>;
  sample_articles: Array<{ id: string; title: string; source_type?: string }>;
}

export interface MergeKnowledgeTagPayload {
  target_tag_id: string;
}

export interface SaveKnowledgeCategoryPayload {
  category_name: string;
  category_code: string;
  parent_id?: string;
  level?: number;
  sort?: number;
  enabled?: number;
  description?: string;
  platform_id?: string;
  dept_id?: string;
  shop_id?: string;
}

export const knowledgeApi = {
  listArticles: (params?: { keyword?: string; status?: string; category_id?: string; source_type?: string }) =>
    request.get('/knowledge/articles', { params }),
  getArticle: (id: string) => request.get(`/knowledge/articles/${id}`),
  listTags: (params?: { keyword?: string; source_type?: string; enabled?: string }) => request.get('/knowledge/tags', { params }),
  getTagImpact: (id: string) => request.get(`/knowledge/tags/${id}/impact`),
  createTag: (payload: Partial<KnowledgeTag> & { tag_name: string }) => request.post('/knowledge/tags', payload),
  updateTag: (id: string, payload: Partial<KnowledgeTag> & { tag_name: string }) => request.put(`/knowledge/tags/${id}`, payload),
  mergeTag: (id: string, payload: MergeKnowledgeTagPayload) => request.post(`/knowledge/tags/${id}/merge`, payload),
  enableTag: (id: string) => request.post(`/knowledge/tags/${id}/enable`),
  disableTag: (id: string) => request.post(`/knowledge/tags/${id}/disable`),
  createArticle: (payload: SaveKnowledgeArticlePayload) => request.post('/knowledge/articles', payload),
  updateArticle: (id: string, payload: SaveKnowledgeArticlePayload) => request.put(`/knowledge/articles/${id}`, payload),
  listFaqCandidates: () => request.get('/knowledge/faq-candidates'),
  listCategories: (params?: { keyword?: string; enabled?: string }) => request.get('/knowledge/categories', { params }),
  createCategory: (payload: SaveKnowledgeCategoryPayload) => request.post('/knowledge/categories', payload),
  updateCategory: (id: string, payload: SaveKnowledgeCategoryPayload) => request.put(`/knowledge/categories/${id}`, payload),
  enableCategory: (id: string) => request.post(`/knowledge/categories/${id}/enable`),
  disableCategory: (id: string) => request.post(`/knowledge/categories/${id}/disable`)
};
