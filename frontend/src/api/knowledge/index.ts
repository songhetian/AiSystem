import request from "@/utils/request";

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
  attachment_urls?: string[];
  is_public?: number;
  sort?: number;
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
  [key: string]: unknown;
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
  [key: string]: unknown;
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

export interface KnowledgeAiTagSuggestion {
  suggested_name: string;
  hit_count: number;
}

export interface BatchCreateTagsResult {
  tag_name: string;
  success: boolean;
  error?: string;
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

export interface KnowledgeDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  status: "pending" | "processing" | "completed" | "failed";
  error_msg?: string;
  process_log?: string;
  create_time: string;
  update_time: string;
  uploader_id?: string;
  is_public?: number;
  progress?: number;
}

export interface KnowledgeChatSession {
  id: string;
  title: string;
  create_time: string;
  update_time: string;
}

export interface KnowledgeChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  create_time: string;
  references?: string[];
}

export interface VectorData {
  id: string;
  file_name: string;
  doc_id: string;
  vector_size: number;
  import_time: string;
}

export const knowledgeApi = {
  // --- Chat ---
  createChatSession: (title: string): Promise<KnowledgeChatSession> =>
    request.post("/knowledge/chat/sessions", { title }),
  listChatSessions: (): Promise<KnowledgeChatSession[]> =>
    request.get("/knowledge/chat/sessions"),
  getChatMessages: (sessionId: string): Promise<KnowledgeChatMessage[]> =>
    request.get(`/knowledge/chat/sessions/${sessionId}/messages`),
  sendChatMessage: (
    sessionId: string,
    content: string,
  ): Promise<KnowledgeChatMessage> =>
    request.post(`/knowledge/chat/sessions/${sessionId}/chat`, { content }),

  // --- Documents ---
  listDocuments: (): Promise<KnowledgeDocument[]> =>
    request.get("/knowledge/documents"),
  uploadDocument: (
    file: File,
    isPublic = 0,
    onProgress: (p: number) => void,
  ) => {
    const formData = new FormData();
    formData.append("files", file); // 注意后端现在是 files 数组名
    formData.append("is_public", isPublic.toString());
    return request.post("/knowledge/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1),
        );
        onProgress(percentCompleted);
      },
    });
  },
  togglePublicDocument: (id: string, isPublic: number) =>
    request.post(`/knowledge/documents/${id}/toggle-public`, {
      is_public: isPublic,
    }),
  deleteDocument: (id: string) => request.delete(`/knowledge/documents/${id}`),
  getDocumentContent: (id: string): Promise<{ content: string }> =>
    request.get(`/knowledge/documents/${id}/content`),
  reimportDocument: (id: string) =>
    request.post(`/knowledge/documents/${id}/re-import`),

  // --- Vectors ---
  listVectors: (params?: {
    limit?: number;
    offset?: string;
  }): Promise<{ points: VectorData[]; next_page_offset?: string }> =>
    request.get("/knowledge/vectors", { params }),
  deleteVector: (id: string) => request.delete(`/knowledge/vectors/${id}`),
  listArticles: (params?: {
    keyword?: string;
    status?: string;
    category_id?: string;
    source_type?: string;
  }) => request.get("/knowledge/articles", { params }),
  getArticle: (id: string) => request.get(`/knowledge/articles/${id}`),
  listTags: (params?: {
    keyword?: string;
    source_type?: string;
    enabled?: string;
  }) => request.get("/knowledge/tags", { params }),
  getTagImpact: (id: string) => request.get(`/knowledge/tags/${id}/impact`),
  createTag: (payload: Partial<KnowledgeTag> & { tag_name: string }) =>
    request.post("/knowledge/tags", payload),
  updateTag: (
    id: string,
    payload: Partial<KnowledgeTag> & { tag_name: string },
  ) => request.put(`/knowledge/tags/${id}`, payload),
  mergeTag: (id: string, payload: MergeKnowledgeTagPayload) =>
    request.post(`/knowledge/tags/${id}/merge`, payload),
  enableTag: (id: string) => request.post(`/knowledge/tags/${id}/enable`),
  disableTag: (id: string) => request.post(`/knowledge/tags/${id}/disable`),
  getAiTagSuggestions: (): Promise<KnowledgeAiTagSuggestion[]> =>
    request.get("/knowledge/tags/ai-suggestions"),
  batchCreateTags: (tagNames: string[]): Promise<BatchCreateTagsResult[]> =>
    request.post("/knowledge/tags/batch-create", { tag_names: tagNames }),
  createArticle: (payload: SaveKnowledgeArticlePayload) =>
    request.post("/knowledge/articles", payload),
  updateArticle: (id: string, payload: SaveKnowledgeArticlePayload) =>
    request.put(`/knowledge/articles/${id}`, payload),
  updateArticleSort: (items: Array<{ id: string; sort: number }>) =>
    request.post("/knowledge/articles/sort", { items }),
  listFaqCandidates: (): Promise<KnowledgeFaqCandidate[]> =>
    request.get("/knowledge/faq-candidates"),
  listCategories: (params?: { keyword?: string; enabled?: string }) =>
    request.get("/knowledge/categories", { params }),
  createCategory: (payload: SaveKnowledgeCategoryPayload) =>
    request.post("/knowledge/categories", payload),
  updateCategory: (id: string, payload: SaveKnowledgeCategoryPayload) =>
    request.put(`/knowledge/categories/${id}`, payload),
  enableCategory: (id: string) =>
    request.post(`/knowledge/categories/${id}/enable`),
  disableCategory: (id: string) =>
    request.post(`/knowledge/categories/${id}/disable`),
  updateCategorySort: (payload: {
    items: Array<{ id: string; parent_id: string | null; sort: number }>;
  }) => request.post("/knowledge/categories/sort", payload),
  // ✅ 新增：向量管理（知识库.md 3.4.2）
  regenerateVector: (docId: string) =>
    request.post(`/knowledge/documents/${docId}/regenerate-vector`, {}),
};
