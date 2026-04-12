import { Injectable, NotFoundException } from '@nestjs/common';
import { BusinessLockService } from '../../../common/services/business-lock.service';
import { RealtimeService } from '../../../common/services/realtime.service';
import { ScopeService } from '../../../common/services/scope.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AnalyzeServiceSessionDto } from '../dto/analyze-service-session.dto';
import { ArchiveServiceCaseDto } from '../dto/archive-service-case.dto';
import { GenerateServiceCaseDraftDto } from '../dto/generate-service-case-draft.dto';
import { QueryServiceSessionsDto } from '../dto/query-service-sessions.dto';
import { SaveServiceQualityRuleDto } from '../dto/save-service-quality-rule.dto';
import { SaveServiceSensitiveTermDto } from '../dto/save-service-sensitive-term.dto';

@Injectable()
export class ServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly businessLockService: BusinessLockService,
    private readonly realtimeService: RealtimeService,
  ) {}

  private async enrichSessions(sessions: any[]) {
    if (sessions.length === 0) return [];

    const sessionIds = sessions.map((item) => item.id);
    const [analyses, qualityRecords] = await Promise.all([
      (this.prisma as any).service_session_analysis.findMany({
        where: { session_id: { in: sessionIds }, is_deleted: 0 },
        orderBy: [{ analyzed_at: 'desc' }, { create_time: 'desc' }],
      }),
      (this.prisma as any).service_quality_record.findMany({
        where: { session_id: { in: sessionIds }, is_deleted: 0 },
        orderBy: [{ inspected_at: 'desc' }, { create_time: 'desc' }],
      }),
    ]);

    const latestAnalysisMap = new Map<string, any>();
    for (const item of analyses) {
      if (!latestAnalysisMap.has(item.session_id)) {
        latestAnalysisMap.set(item.session_id, item);
      }
    }

    const latestQualityMap = new Map<string, any>();
    for (const item of qualityRecords) {
      if (!latestQualityMap.has(item.session_id)) {
        latestQualityMap.set(item.session_id, item);
      }
    }

    return sessions.map((item) => ({
      ...item,
      latest_analysis: latestAnalysisMap.get(item.id) ?? null,
      latest_quality_record: latestQualityMap.get(item.id) ?? null,
    }));
  }

  async listSessions(userId: string, query: QueryServiceSessionsDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const where: any = this.scopeService.applyScope(
      scope,
      { is_deleted: 0 },
      { platform: 'platform_id' },
    );

    if (query.keyword) {
      where.OR = [
        { session_no: { contains: query.keyword } },
        { customer_nickname: { contains: query.keyword } },
      ];
    }
    if (query.status) where.status = query.status;
    if (query.agent_user_id) where.agent_user_id = query.agent_user_id;
    if (query.shop_id) where.shop_id = query.shop_id;
    if (query.dept_id) where.dept_id = query.dept_id;
    if (query.start_date || query.end_date) {
      where.started_at = {
        ...(query.start_date ? { gte: new Date(query.start_date) } : {}),
        ...(query.end_date ? { lte: new Date(query.end_date) } : {}),
      };
    }

    const sessions = await (this.prisma as any).service_session.findMany({
      where,
      orderBy: { started_at: 'desc' },
    });
    const enriched = await this.enrichSessions(sessions);

    if (!query.risk_level) return enriched;
    return enriched.filter((item) => item.latest_analysis?.loss_risk_level === query.risk_level);
  }

  async getSession(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const session = await (this.prisma as any).service_session.findFirst({
      where: this.scopeService.applyScope(
        scope,
        { id, is_deleted: 0 },
        { platform: 'platform_id' },
      ),
      include: {
        messages: {
          where: { is_deleted: 0 },
          orderBy: { sent_at: 'asc' },
        },
      },
    });
    if (!session) throw new NotFoundException('会话不存在');

    const [analyses, qualityRecords] = await Promise.all([
      (this.prisma as any).service_session_analysis.findMany({
        where: { session_id: id, is_deleted: 0 },
        orderBy: [{ analyzed_at: 'desc' }, { create_time: 'desc' }],
      }),
      (this.prisma as any).service_quality_record.findMany({
        where: { session_id: id, is_deleted: 0 },
        orderBy: [{ inspected_at: 'desc' }, { create_time: 'desc' }],
      }),
    ]);

    return {
      ...session,
      analyses,
      quality_records: qualityRecords,
      latest_analysis: analyses[0] ?? null,
      latest_quality_record: qualityRecords[0] ?? null,
    };
  }

  async analyzeSession(userId: string, id: string, _dto: AnalyzeServiceSessionDto) {
    return this.businessLockService.runExclusive(`service-session:analyze:${id}`, 30, async () => {
      const session = await this.getSession(userId, id);
      const messages = session.messages || [];
      const content = messages.map((m: any) => m.content).join('\n');

      const terms = await (this.prisma as any).service_sensitive_term.findMany({
        where: { platform_id: session.platform_id, enabled: 1, is_deleted: 0 },
      });
      const sensitiveHits = terms
        .filter((t: any) => content.includes(t.term))
        .map((t: any) => ({
          term: t.term,
          category: t.category,
          severity: t.severity,
        }));

      const rules = await (this.prisma as any).service_quality_rule.findMany({
        where: { platform_id: session.platform_id, enabled: 1, is_deleted: 0 },
      });

      let score = 100;
      const violations: string[] = [];
      for (const rule of rules) {
        if (rule.rule_type === 'keyword_negative' && Array.isArray(rule.trigger_keywords)) {
          for (const keyword of rule.trigger_keywords as string[]) {
            if (content.includes(keyword)) {
              score -= rule.deduct_score;
              violations.push(rule.rule_name);
            }
          }
        }
      }

      const topFaqCounter = new Map<string, number>();
      for (const message of messages.filter((item: any) => item.sender_type !== 'agent')) {
        const normalized = String(message.content || '').trim();
        if (!normalized) continue;
        topFaqCounter.set(normalized, (topFaqCounter.get(normalized) ?? 0) + 1);
      }
      const topFaqs = Array.from(topFaqCounter.entries())
        .map(([question, count]) => ({ question, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const responseTimeoutCount = messages.reduce((count: number, item: any) => {
        if (item.sender_type === 'agent' && String(item.content || '').length < 3) {
          return count + 1;
        }
        return count;
      }, 0);

      const lossRiskScore = Math.min(
        100,
        sensitiveHits.length * 20 + Math.max(0, 60 - score) + responseTimeoutCount * 5,
      );
      const lossRiskLevel = lossRiskScore >= 70 ? 'high' : lossRiskScore >= 40 ? 'medium' : 'low';
      const suggestions: string[] = [];
      if (sensitiveHits.length > 0) suggestions.push('存在敏感词命中，建议复核客服用语并补充质检规则。');
      if (score < 80) suggestions.push('本次会话得分偏低，建议优化回复完整度与合规表达。');
      if (responseTimeoutCount > 0) suggestions.push('存在响应质量波动，建议检查坐席话术与接待流程。');
      if (topFaqs.length > 0) suggestions.push(`高频问题集中在“${topFaqs[0].question}”，建议沉淀FAQ或标准话术。`);

      const summary = content.substring(0, 500);

      const analysis = await (this.prisma as any).service_session_analysis.create({
        data: {
          session_id: session.id,
          session_no: session.session_no,
          platform_id: session.platform_id,
          dept_id: session.dept_id,
          shop_id: session.shop_id,
          quality_score: Math.max(0, score),
          quality_passed: score >= 60 ? 1 : 0,
          loss_risk_level: lossRiskLevel,
          loss_risk_score: lossRiskScore,
          customer_sentiment: lossRiskLevel === 'high' ? 'negative' : 'neutral',
          response_timeout_count: responseTimeoutCount,
          sensitive_hit_count: sensitiveHits.length,
          faq_hit_count: topFaqs.reduce((sum, item) => sum + item.count, 0),
          top_faqs: topFaqs as any,
          sensitive_hits: sensitiveHits as any,
          triggered_rule_ids: violations as any,
          summary,
          suggestions: suggestions as any,
        },
      });

      await (this.prisma as any).service_quality_record.create({
        data: {
          session_id: session.id,
          analysis_id: analysis.id,
          session_no: session.session_no,
          inspection_mode: 'auto',
          score: analysis.quality_score,
          passed: analysis.quality_passed,
          violations: sensitiveHits as any,
          deduct_details: violations as any,
          comment: summary,
          platform_id: session.platform_id,
          dept_id: session.dept_id,
          shop_id: session.shop_id,
        },
      });

      return analysis;
    });
  }

  async generateCaseDraft(userId: string, id: string, dto: GenerateServiceCaseDraftDto) {
    const session = await this.getSession(userId, id);
    const messages = dto.messages?.length ? dto.messages : session.messages || [];
    const transcript = messages.map((item) => ({
      id: item.id,
      sender_type: item.sender_type,
      sender_name: item.sender_name,
      content: item.content,
      sent_at: item.sent_at,
    }));

    const customerMessages = transcript.filter((item) => item.sender_type !== 'agent');
    const agentMessages = transcript.filter((item) => item.sender_type === 'agent');
    const titleSeed = customerMessages[0]?.content || session.customer_nickname || session.session_no;
    const title = titleSeed.slice(0, 30);
    const tags = Array.isArray(session.tags) ? session.tags : [];
    const keyword = customerMessages.map((item) => item.content).slice(0, 3).join(' / ').slice(0, 120);
    const content = [
      `问题背景：${customerMessages[0]?.content || '用户发起咨询。'}`,
      `沟通摘要：共 ${transcript.length} 条消息，客服回复 ${agentMessages.length} 条。`,
      dto.instruction ? `补充要求：${dto.instruction}` : undefined,
      '建议话术：',
      '1. 先确认用户核心诉求与订单/商品上下文。',
      '2. 给出清晰、可执行的处理方案或 FAQ 答案。',
      '3. 如涉及价格、售后或转人工，明确后续处理路径。',
      '',
      '会话摘录：',
      transcript
        .slice(0, 10)
        .map((item) => `- [${item.sender_type}] ${item.content}`)
        .join('\n'),
    ]
      .filter(Boolean)
      .join('\n');

    return {
      title,
      keyword,
      tags,
      content,
      transcript,
    };
  }

  async archiveCase(userId: string, id: string, dto: ArchiveServiceCaseDto) {
    const session = await this.getSession(userId, id);
    const scope = await this.scopeService.resolveAccess(userId);
    const article = await (this.prisma as any).knowledge_article.create({
      data: {
        title: dto.title,
        content: dto.content,
        category_id: dto.category_id,
        category_name: dto.category_name || '服务案例',
        status: dto.status || 'published',
        keyword: dto.keyword || dto.tags?.join(','),
        source_type: 'service_case',
        source_ref: session.id,
        platform_id: scope.platform_id,
        dept_id: scope.dept_id,
        shop_id: session.shop_id,
        published_at: dto.status === 'draft' ? null : new Date(),
      },
    });

    const mergedTags = Array.from(
      new Set([...(Array.isArray(session.tags) ? session.tags : []), ...(dto.tags || [])]),
    );
    await (this.prisma as any).service_session.update({
      where: { id: session.id },
      data: {
        tags: mergedTags as any,
        remark: `已归档案例：${article.title}`,
      },
    });

    return {
      id: article.id,
      status: 'archived',
      article_id: article.id,
    };
  }

  async listQualityRules(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return (this.prisma as any).service_quality_rule.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id' }),
    });
  }

  async createQualityRule(userId: string, dto: SaveServiceQualityRuleDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    return (this.prisma as any).service_quality_rule.create({
      data: { ...dto, platform_id: scope.platform_id, dept_id: scope.dept_id },
    });
  }

  async updateQualityRule(_userId: string, id: string, dto: SaveServiceQualityRuleDto) {
    return (this.prisma as any).service_quality_rule.update({ where: { id }, data: dto });
  }

  async toggleQualityRule(_userId: string, id: string, status: number) {
    return (this.prisma as any).service_quality_rule.update({
      where: { id },
      data: { enabled: status },
    });
  }

  async listSensitiveTerms(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return (this.prisma as any).service_sensitive_term.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id' }),
    });
  }

  async createSensitiveTerm(userId: string, dto: SaveServiceSensitiveTermDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    return (this.prisma as any).service_sensitive_term.create({
      data: { ...dto, platform_id: scope.platform_id, dept_id: scope.dept_id },
    });
  }

  async updateSensitiveTerm(_userId: string, id: string, dto: SaveServiceSensitiveTermDto) {
    return (this.prisma as any).service_sensitive_term.update({ where: { id }, data: dto });
  }

  async getAiOverview(userId: string, query: QueryServiceSessionsDto) {
    const sessions = await this.listSessions(userId, query);
    const analyzedSessions = sessions.filter((item) => item.latest_analysis);
    const passCount = analyzedSessions.filter((item) => item.latest_analysis?.quality_passed).length;
    const totalScore = analyzedSessions.reduce(
      (sum, item) => sum + Number(item.latest_analysis?.quality_score ?? 0),
      0,
    );
    const riskBuckets = { high: 0, medium: 0, low: 0 };
    const topFaqCounter = new Map<string, number>();
    let sensitiveHitCount = 0;

    for (const item of analyzedSessions) {
      const analysis = item.latest_analysis;
      if (!analysis) continue;
      riskBuckets[analysis.loss_risk_level as 'high' | 'medium' | 'low'] += 1;
      sensitiveHitCount += Number(analysis.sensitive_hit_count ?? 0);
      const topFaqs = Array.isArray(analysis.top_faqs) ? analysis.top_faqs : [];
      for (const faq of topFaqs) {
        if (!faq?.question) continue;
        topFaqCounter.set(faq.question, (topFaqCounter.get(faq.question) ?? 0) + Number(faq.count ?? 1));
      }
    }

    return {
      totalSessions: sessions.length,
      analyzedSessions: analyzedSessions.length,
      qualityPassRate: analyzedSessions.length ? Number(((passCount / analyzedSessions.length) * 100).toFixed(2)) : 0,
      averageQualityScore: analyzedSessions.length ? Number((totalScore / analyzedSessions.length).toFixed(2)) : 0,
      lossSessionCount: riskBuckets.high + riskBuckets.medium,
      sensitiveHitCount,
      riskBuckets,
      topFaqs: Array.from(topFaqCounter.entries())
        .map(([question, count]) => ({ question, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }
}
