import { request } from '@/utils/request';

export interface ServiceSessionAnalysis {
  id: string;
  quality_score: number;
  quality_passed: number;
  loss_risk_level: 'high' | 'medium' | 'low';
  loss_risk_score: number;
  customer_sentiment: string;
  response_timeout_count: number;
  sensitive_hit_count: number;
  faq_hit_count: number;
  top_faqs?: Array<{ question: string; count: number }>;
  sensitive_hits?: Array<{ term: string; severity: number; category: string }>;
  summary?: string;
  suggestions?: string[];
  analyzed_at: string;
}

export interface ServiceQualityRecord {
  id: string;
  inspection_mode: string;
  score: number;
  passed: number;
  comment?: string;
  inspected_at: string;
}

export interface ServiceSessionRecord {
  id: string;
  session_no: string;
  customer_nickname?: string;
  customer_satisfaction?: number;
  agent_user_id?: string;
  agent_name?: string;
  group_name?: string;
  platform_id: string;
  dept_id: string;
  shop_id?: string;
  status: string;
  transfer_status: string;
  started_at: string;
  ended_at?: string;
  tags?: string[];
  latest_analysis?: ServiceSessionAnalysis | null;
  latest_quality_record?: ServiceQualityRecord | null;
}

export interface ServiceSessionMessage {
  id: string;
  sender_type: string;
  sender_name?: string;
  message_type: string;
  content: string;
  sent_at: string;
}

export interface ServiceSessionDetail extends ServiceSessionRecord {
  messages: ServiceSessionMessage[];
  analyses: ServiceSessionAnalysis[];
  quality_records: ServiceQualityRecord[];
}

export interface ServiceCaseDraftPayload {
  messages: Array<{
    id?: string;
    sender_type: string;
    sender_name?: string;
    content: string;
    sent_at?: string;
  }>;
  instruction?: string;
  tags?: string[];
}

export interface ServiceCaseDraftResult {
  title: string;
  keyword: string;
  tags: string[];
  content: string;
  transcript: ServiceCaseDraftPayload['messages'];
}

export interface ServiceQualityRule {
  id: string;
  rule_name: string;
  rule_type: string;
  description?: string;
  deduct_score: number;
  pass_threshold: number;
  trigger_keywords?: string[];
  response_timeout_sec?: number;
  enabled: number;
  sort: number;
  platform_id: string;
  dept_id: string;
  shop_id?: string;
}

export interface ServiceSensitiveTerm {
  id: string;
  term: string;
  category: string;
  severity: number;
  enabled: number;
  replace_text?: string;
  description?: string;
  platform_id: string;
  dept_id: string;
  shop_id?: string;
}

export interface ServiceAiOverview {
  totalSessions: number;
  analyzedSessions: number;
  qualityPassRate: number;
  averageQualityScore: number;
  lossSessionCount: number;
  sensitiveHitCount: number;
  riskBuckets: Record<'high' | 'medium' | 'low', number>;
  topFaqs: Array<{ question: string; count: number }>;
}

export interface QueryServiceSessionsPayload {
  keyword?: string;
  status?: string;
  risk_level?: string;
  agent_user_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface SaveServiceQualityRulePayload {
  rule_name: string;
  rule_type: string;
  description?: string;
  deduct_score: number;
  pass_threshold: number;
  trigger_keywords?: string[];
  response_timeout_sec?: number;
  enabled?: number;
  sort?: number;
  platform_id?: string;
  dept_id?: string;
  shop_id?: string;
}

export interface SaveServiceSensitiveTermPayload {
  term: string;
  category: string;
  severity?: number;
  enabled?: number;
  replace_text?: string;
  description?: string;
  platform_id?: string;
  dept_id?: string;
  shop_id?: string;
}

export const serviceApi = {
  listSessions: (params?: QueryServiceSessionsPayload) => request.get('/service/sessions', { params }),
  getSession: (id: string) => request.get(`/service/sessions/${id}`),
  analyzeSession: (id: string, payload?: { mode?: 'auto' | 'manual'; comment?: string }) =>
    request.post(`/service/sessions/${id}/analyze`, payload ?? {}),
  generateCaseDraft: (id: string, payload: ServiceCaseDraftPayload) => request.post(`/service/sessions/${id}/case-draft`, payload),
  archiveCase: (
    id: string,
    payload: ServiceCaseDraftPayload & {
      title: string;
      content: string;
      category_id?: string;
      category_name?: string;
      status?: string;
      keyword?: string;
      tags?: string[];
    }
  ) => request.post(`/service/sessions/${id}/archive-case`, payload),
  listQualityRules: () => request.get('/service/quality-rules'),
  createQualityRule: (payload: SaveServiceQualityRulePayload) => request.post('/service/quality-rules', payload),
  updateQualityRule: (id: string, payload: SaveServiceQualityRulePayload) => request.put(`/service/quality-rules/${id}`, payload),
  enableQualityRule: (id: string) => request.patch(`/service/quality-rules/${id}/enable`),
  disableQualityRule: (id: string) => request.patch(`/service/quality-rules/${id}/disable`),
  listSensitiveTerms: () => request.get('/service/sensitive-terms'),
  createSensitiveTerm: (payload: SaveServiceSensitiveTermPayload) => request.post('/service/sensitive-terms', payload),
  updateSensitiveTerm: (id: string, payload: SaveServiceSensitiveTermPayload) =>
    request.put(`/service/sensitive-terms/${id}`, payload),
  getAiOverview: (params?: QueryServiceSessionsPayload) => request.get('/service/ai-overview', { params })
};
