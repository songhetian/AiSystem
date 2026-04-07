import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BusinessLockService } from '../../../common/services/business-lock.service';
import { MessageService } from '../../../common/services/message.service';
import { ScopeService, type AccessScope } from '../../../common/services/scope.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AnalyzeServiceSessionDto } from '../dto/analyze-service-session.dto';
import { ArchiveServiceCaseDto } from '../dto/archive-service-case.dto';
import { GenerateServiceCaseDraftDto } from '../dto/generate-service-case-draft.dto';
import { QueryServiceSessionsDto } from '../dto/query-service-sessions.dto';
import { SaveServiceQualityRuleDto } from '../dto/save-service-quality-rule.dto';
import { SaveServiceSensitiveTermDto } from '../dto/save-service-sensitive-term.dto';

type JsonObject = Record<string, unknown>;
type NormalizedCaseMessage = {
  id: string;
  sender_type: string;
  sender_name: string;
  content: string;
  sent_at: string;
};

@Injectable()
export class ServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly messageService: MessageService,
    private readonly businessLockService: BusinessLockService
  ) {}

  async listSessions(userId: string, query: QueryServiceSessionsDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const where = this.buildSessionWhere(scope, query);
    const sessionDelegate = (this.prisma as any).service_session;

    const sessions = await sessionDelegate.findMany({
      where,
      orderBy: { started_at: 'desc' },
      include: {
        analyses: {
          where: { is_deleted: 0 },
          orderBy: { analyzed_at: 'desc' },
          take: 1
        },
        quality_records: {
          where: { is_deleted: 0 },
          orderBy: { inspected_at: 'desc' },
          take: 1
        }
      }
    });

    return sessions.map((item: any) => ({
      ...item,
      tags: this.normalizeTags(item.tags),
      latest_analysis: item.analyses?.[0] ?? null,
      latest_quality_record: item.quality_records?.[0] ?? null
    }));
  }

  async getSession(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const session = await (this.prisma as any).service_session.findFirst({
      where: this.scopeService.applyScope(
        scope,
        { id, is_deleted: 0 },
        { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
      ),
      include: {
        messages: {
          where: { is_deleted: 0 },
          orderBy: { sent_at: 'asc' }
        },
        analyses: {
          where: { is_deleted: 0 },
          orderBy: { analyzed_at: 'desc' }
        },
        quality_records: {
          where: { is_deleted: 0 },
          orderBy: { inspected_at: 'desc' }
        },
        satisfaction_records: {
          where: { is_deleted: 0 },
          orderBy: { create_time: 'desc' }
        }
      }
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    return {
      ...session,
      tags: this.normalizeTags(session.tags)
    };
  }

  async analyzeSession(userId: string, id: string, dto: AnalyzeServiceSessionDto) {
    return this.businessLockService.runExclusive(`service-session:analyze:${id}`, 30, async () => {
      const scope = await this.scopeService.resolveAccess(userId);
      const session = await this.getScopedSession(scope, id);

      const [messages, rules, terms, actor] = await Promise.all([
        (this.prisma as any).service_session_message.findMany({
          where: { session_id: session.id, is_deleted: 0 },
          orderBy: { sent_at: 'asc' }
        }),
        this.listQualityRulesForScope(scope, session),
        this.listSensitiveTermsForScope(scope, session),
        this.prisma.sys_user.findUnique({ where: { id: userId } })
      ]);

      const analysis = this.buildAnalysis(session, messages, rules, terms);
      const confirmedTags = await this.ensureKnowledgeTags(userId, session, analysis.tags, 'service_quality');

      const created = await this.prisma.$transaction(async (tx) => {
        const analysisRecord = await (tx as any).service_session_analysis.create({
          data: {
            session_id: session.id,
            session_no: session.session_no,
            platform_id: session.platform_id,
            dept_id: session.dept_id,
            shop_id: session.shop_id,
            triggered_by: dto.mode === 'manual' ? 'manual' : 'system',
            triggered_by_user_id: userId,
            quality_score: analysis.qualityScore,
            quality_passed: analysis.qualityPassed ? 1 : 0,
            loss_risk_level: analysis.lossRiskLevel,
            loss_risk_score: analysis.lossRiskScore,
            customer_sentiment: analysis.customerSentiment,
            response_timeout_count: analysis.responseTimeoutCount,
            sensitive_hit_count: analysis.sensitiveHits.length,
            faq_hit_count: analysis.topFaqs.length,
            top_faqs: analysis.topFaqs as Prisma.InputJsonValue,
            sensitive_hits: analysis.sensitiveHits as Prisma.InputJsonValue,
            triggered_rule_ids: analysis.triggeredRuleIds as Prisma.InputJsonValue,
            summary: analysis.summary,
            suggestions: analysis.suggestions as Prisma.InputJsonValue
          }
        });

        await (tx as any).service_session.update({
          where: { id: session.id },
          data: {
            tags: confirmedTags as Prisma.InputJsonValue
          }
        });

        const qualityRecord = await (tx as any).service_quality_record.create({
          data: {
            session_id: session.id,
            analysis_id: analysisRecord.id,
            session_no: session.session_no,
            inspector_id: userId,
            inspector_name: actor?.name ?? actor?.username ?? userId,
            inspection_mode: dto.mode === 'manual' ? 'manual' : 'auto',
            score: analysis.qualityScore,
            passed: analysis.qualityPassed ? 1 : 0,
            violations: analysis.violations as Prisma.InputJsonValue,
            deduct_details: analysis.deductDetails as Prisma.InputJsonValue,
            comment: dto.comment ?? analysis.summary,
            platform_id: session.platform_id,
            dept_id: session.dept_id,
            shop_id: session.shop_id,
            rectification_status: analysis.qualityPassed ? 'not_required' : 'pending'
          }
        });

        return { analysisRecord, qualityRecord };
      });

      if (!analysis.qualityPassed && session.agent_user_id) {
        await this.messageService.send({
          recipientId: session.agent_user_id,
          title: '客服质检整改提醒',
          content: `会话 ${session.session_no} 质检不合格，请尽快查看整改建议。`,
          messageType: 'service_quality_warning',
          bizType: 'service_session',
          bizId: session.id,
          route: `/service/sessions/${session.id}`,
          senderId: userId,
          senderName: actor?.name ?? actor?.username ?? userId,
          payload: {
            sessionNo: session.session_no,
            score: analysis.qualityScore,
            lossRiskLevel: analysis.lossRiskLevel
          }
        });
      }

      return {
        sessionId: session.id,
        sessionNo: session.session_no,
        tags: confirmedTags,
        analysis: created.analysisRecord,
        qualityRecord: created.qualityRecord
      };
    });
  }

  async generateCaseDraft(userId: string, id: string, dto: GenerateServiceCaseDraftDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const session = await this.getScopedSession(scope, id);
    const transcript = this.normalizeCaseMessages(dto.messages);
    const latestAnalysis = await this.getLatestAnalysis(session.id);
    const sessionTags = this.normalizeTags(session.tags);
    const analysisTags = this.normalizeTags(latestAnalysis?.triggered_rule_ids);

    return {
      title: `案例复盘 - ${session.session_no}`,
      keyword: [session.session_no, session.customer_nickname, ...sessionTags.slice(0, 2)].filter(Boolean).join(' / '),
      tags: [...new Set([...sessionTags, ...analysisTags])].slice(0, 8),
      content: this.buildCaseArticleContent(session, transcript, latestAnalysis, dto.instruction),
      transcript
    };
  }

  async archiveCase(userId: string, id: string, dto: ArchiveServiceCaseDto) {
    return this.businessLockService.runExclusive(`service-session:case:${id}`, 60, async () => {
      const scope = await this.scopeService.resolveAccess(userId);
      const session = await this.getScopedSession(scope, id);
      const actor = await this.prisma.sys_user.findUnique({ where: { id: userId } });
      const transcript = this.normalizeCaseMessages(dto.messages);
      const latestAnalysis = await this.getLatestAnalysis(session.id);
      const confirmedTags = await this.ensureKnowledgeTags(
        userId,
        session,
        this.normalizeTags(dto.tags ?? session.tags),
        'service_case'
      );
      const category = dto.category_id
        ? await (this.prisma as any).knowledge_category.findFirst({
            where: this.scopeService.applyScope(
              scope,
              { id: dto.category_id, is_deleted: 0, enabled: 1 },
              { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
            )
          })
        : null;

      const article = await (this.prisma as any).knowledge_article.create({
        data: {
          title: dto.title.trim(),
          content: (dto.content?.trim() || this.buildCaseArticleContent(session, transcript, latestAnalysis)) as string,
          category_id: category?.id,
          category_name: category?.category_name ?? dto.category_name ?? '服务案例',
          status: dto.status ?? 'published',
          author_id: userId,
          author_name: actor?.name ?? actor?.username ?? userId,
          source_type: 'service_case',
          source_ref: session.id,
          keyword: dto.keyword?.trim() || [session.session_no, ...confirmedTags.slice(0, 3)].join(', '),
          platform_id: session.platform_id,
          dept_id: session.dept_id,
          shop_id: session.shop_id,
          published_at: dto.status === 'draft' ? null : new Date()
        }
      });

      await (this.prisma as any).service_session.update({
        where: { id: session.id },
        data: {
          tags: confirmedTags as Prisma.InputJsonValue
        }
      });

      return {
        article,
        transcriptCount: transcript.length,
        tags: confirmedTags
      };
    });
  }

  async listQualityRules(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.listQualityRulesForScope(scope);
  }

  async createQualityRule(userId: string, dto: SaveServiceQualityRuleDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const resolved = this.resolveWriteScope(scope, dto.platform_id, dto.dept_id, dto.shop_id);

    return (this.prisma as any).service_quality_rule.create({
      data: {
        rule_name: dto.rule_name,
        rule_type: dto.rule_type,
        description: dto.description,
        deduct_score: dto.deduct_score,
        pass_threshold: dto.pass_threshold,
        trigger_keywords: (dto.trigger_keywords ?? []) as Prisma.InputJsonValue,
        response_timeout_sec: dto.response_timeout_sec,
        enabled: dto.enabled ?? 1,
        sort: dto.sort ?? 0,
        platform_id: resolved.platform_id,
        dept_id: resolved.dept_id,
        shop_id: resolved.shop_id,
        created_by: userId
      }
    });
  }

  async updateQualityRule(userId: string, id: string, dto: SaveServiceQualityRuleDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.getScopedQualityRule(scope, id);
    const resolved = this.resolveWriteScope(
      scope,
      dto.platform_id ?? current.platform_id,
      dto.dept_id ?? current.dept_id,
      dto.shop_id ?? current.shop_id
    );

    return (this.prisma as any).service_quality_rule.update({
      where: { id },
      data: {
        rule_name: dto.rule_name,
        rule_type: dto.rule_type,
        description: dto.description,
        deduct_score: dto.deduct_score,
        pass_threshold: dto.pass_threshold,
        trigger_keywords: (dto.trigger_keywords ?? []) as Prisma.InputJsonValue,
        response_timeout_sec: dto.response_timeout_sec,
        enabled: dto.enabled ?? current.enabled,
        sort: dto.sort ?? current.sort,
        platform_id: resolved.platform_id,
        dept_id: resolved.dept_id,
        shop_id: resolved.shop_id
      }
    });
  }

  async toggleQualityRule(userId: string, id: string, enabled: number) {
    const scope = await this.scopeService.resolveAccess(userId);
    await this.getScopedQualityRule(scope, id);

    return (this.prisma as any).service_quality_rule.update({
      where: { id },
      data: { enabled }
    });
  }

  async listSensitiveTerms(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.listSensitiveTermsForScope(scope);
  }

  async createSensitiveTerm(userId: string, dto: SaveServiceSensitiveTermDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const resolved = this.resolveWriteScope(scope, dto.platform_id, dto.dept_id, dto.shop_id);

    return (this.prisma as any).service_sensitive_term.create({
      data: {
        term: dto.term,
        category: dto.category,
        severity: dto.severity ?? 1,
        enabled: dto.enabled ?? 1,
        replace_text: dto.replace_text,
        description: dto.description,
        platform_id: resolved.platform_id,
        dept_id: resolved.dept_id,
        shop_id: resolved.shop_id,
        created_by: userId
      }
    });
  }

  async updateSensitiveTerm(userId: string, id: string, dto: SaveServiceSensitiveTermDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.getScopedSensitiveTerm(scope, id);
    const resolved = this.resolveWriteScope(
      scope,
      dto.platform_id ?? current.platform_id,
      dto.dept_id ?? current.dept_id,
      dto.shop_id ?? current.shop_id
    );

    return (this.prisma as any).service_sensitive_term.update({
      where: { id },
      data: {
        term: dto.term,
        category: dto.category,
        severity: dto.severity ?? current.severity,
        enabled: dto.enabled ?? current.enabled,
        replace_text: dto.replace_text,
        description: dto.description,
        platform_id: resolved.platform_id,
        dept_id: resolved.dept_id,
        shop_id: resolved.shop_id
      }
    });
  }

  async getAiOverview(userId: string, query: QueryServiceSessionsDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const where = this.buildSessionWhere(scope, query);

    const sessions = await (this.prisma as any).service_session.findMany({
      where,
      include: {
        analyses: {
          where: { is_deleted: 0 },
          orderBy: { analyzed_at: 'desc' },
          take: 1
        }
      }
    });

    const latestAnalyses = sessions.map((item: any) => item.analyses?.[0]).filter(Boolean);
    const riskBuckets = { high: 0, medium: 0, low: 0 };
    const faqMap = new Map<string, number>();
    let passedCount = 0;
    let totalScore = 0;
    let lossSessionCount = 0;
    let sensitiveHitCount = 0;

    for (const analysis of latestAnalyses) {
      if (analysis.loss_risk_level in riskBuckets) {
        riskBuckets[analysis.loss_risk_level as 'high' | 'medium' | 'low'] += 1;
      }

      passedCount += analysis.quality_passed === 1 ? 1 : 0;
      totalScore += analysis.quality_score ?? 0;
      sensitiveHitCount += analysis.sensitive_hit_count ?? 0;

      if ((analysis.loss_risk_score ?? 0) >= 60) {
        lossSessionCount += 1;
      }

      for (const item of ((analysis.top_faqs as JsonObject[]) ?? [])) {
        const question = String(item.question ?? '');
        const count = Number(item.count ?? 0);
        faqMap.set(question, (faqMap.get(question) ?? 0) + count);
      }
    }

    return {
      totalSessions: sessions.length,
      analyzedSessions: latestAnalyses.length,
      qualityPassRate: latestAnalyses.length ? Number(((passedCount / latestAnalyses.length) * 100).toFixed(2)) : 0,
      averageQualityScore: latestAnalyses.length ? Number((totalScore / latestAnalyses.length).toFixed(2)) : 0,
      lossSessionCount,
      sensitiveHitCount,
      riskBuckets,
      topFaqs: [...faqMap.entries()]
        .map(([question, count]) => ({ question, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    };
  }

  private buildSessionWhere(scope: AccessScope, query: QueryServiceSessionsDto) {
    const where = this.scopeService.applyScope(
      scope,
      {
        is_deleted: 0,
        ...(query.status ? { status: query.status } : {}),
        ...(query.agent_user_id ? { agent_user_id: query.agent_user_id } : {}),
        ...(query.platform_id ? { platform_id: query.platform_id } : {}),
        ...(query.dept_id ? { dept_id: query.dept_id } : {}),
        ...(query.shop_id ? { shop_id: query.shop_id } : {}),
        ...(query.start_date || query.end_date
          ? {
              started_at: {
                ...(query.start_date ? { gte: new Date(query.start_date) } : {}),
                ...(query.end_date ? { lte: new Date(query.end_date) } : {})
              }
            }
          : {}),
        ...(query.keyword
          ? {
              OR: [
                { session_no: { contains: query.keyword } },
                { customer_nickname: { contains: query.keyword } },
                { agent_name: { contains: query.keyword } }
              ]
            }
          : {})
      },
      { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
    );

    if (!query.risk_level) {
      return where;
    }

    return {
      ...where,
      analyses: {
        some: {
          is_deleted: 0,
          loss_risk_level: query.risk_level
        }
      }
    };
  }

  private async getScopedSession(scope: AccessScope, id: string) {
    const session = await (this.prisma as any).service_session.findFirst({
      where: this.scopeService.applyScope(
        scope,
        { id, is_deleted: 0 },
        { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
      )
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    return session;
  }

  private async getScopedQualityRule(scope: AccessScope, id: string) {
    const item = await (this.prisma as any).service_quality_rule.findFirst({
      where: this.scopeService.applyScope(
        scope,
        { id, is_deleted: 0 },
        { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
      )
    });

    if (!item) {
      throw new NotFoundException('质检规则不存在');
    }

    return item;
  }

  private async getScopedSensitiveTerm(scope: AccessScope, id: string) {
    const item = await (this.prisma as any).service_sensitive_term.findFirst({
      where: this.scopeService.applyScope(
        scope,
        { id, is_deleted: 0 },
        { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
      )
    });

    if (!item) {
      throw new NotFoundException('敏感词不存在');
    }

    return item;
  }

  private async listQualityRulesForScope(scope: AccessScope, session?: any) {
    const where = this.scopeService.applyScope(
      scope,
      {
        is_deleted: 0,
        enabled: 1,
        ...(session?.platform_id ? { platform_id: session.platform_id } : {}),
        ...(session?.dept_id ? { dept_id: session.dept_id } : {})
      },
      { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
    );

    return (this.prisma as any).service_quality_rule.findMany({
      where: session?.shop_id
        ? {
            ...where,
            OR: [{ shop_id: null }, { shop_id: session.shop_id }]
          }
        : where,
      orderBy: [{ sort: 'desc' }, { create_time: 'asc' }]
    });
  }

  private async listSensitiveTermsForScope(scope: AccessScope, session?: any) {
    const where = this.scopeService.applyScope(
      scope,
      {
        is_deleted: 0,
        enabled: 1,
        ...(session?.platform_id ? { platform_id: session.platform_id } : {}),
        ...(session?.dept_id ? { dept_id: session.dept_id } : {})
      },
      { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
    );

    return (this.prisma as any).service_sensitive_term.findMany({
      where: session?.shop_id
        ? {
            ...where,
            OR: [{ shop_id: null }, { shop_id: session.shop_id }]
          }
        : where,
      orderBy: [{ severity: 'desc' }, { create_time: 'asc' }]
    });
  }

  private resolveWriteScope(scope: AccessScope, platformId?: string, deptId?: string, shopId?: string | null) {
    const resolvedPlatformId = platformId ?? scope.platform_id;
    const resolvedDeptId = deptId ?? scope.dept_id;
    const resolvedShopId = shopId ?? scope.shop_id ?? null;

    if (!resolvedPlatformId || !resolvedDeptId) {
      throw new ForbiddenException('写入客服质检数据时必须明确平台和部门');
    }

    this.scopeService.assertPlatformAccess(scope, resolvedPlatformId);
    this.scopeService.assertDepartmentAccess(scope, resolvedDeptId);
    if (resolvedShopId) {
      this.scopeService.assertShopAccess(scope, resolvedShopId);
    }

    return {
      platform_id: resolvedPlatformId,
      dept_id: resolvedDeptId,
      shop_id: resolvedShopId
    };
  }

  private buildAnalysis(session: any, messages: any[], rules: any[], terms: any[]) {
    const customerMessages = messages.filter((item) => item.sender_type === 'customer');
    const agentMessages = messages.filter((item) => item.sender_type === 'agent');
    const violations: JsonObject[] = [];
    const deductDetails: JsonObject[] = [];
    const suggestions: string[] = [];
    const triggeredRuleIds: string[] = [];
    let qualityScore = 100;
    let responseTimeoutCount = 0;

    for (const rule of rules) {
      if (rule.rule_type === 'response_timeout' && rule.response_timeout_sec) {
        const timeoutCount = this.countResponseTimeouts(messages, rule.response_timeout_sec);
        if (timeoutCount > 0) {
          responseTimeoutCount += timeoutCount;
          triggeredRuleIds.push(rule.id);
          const deduct = timeoutCount * (rule.deduct_score ?? 0);
          qualityScore -= deduct;
          violations.push({ type: rule.rule_type, count: timeoutCount, ruleName: rule.rule_name });
          deductDetails.push({ ruleId: rule.id, ruleName: rule.rule_name, deductScore: deduct });
          suggestions.push(`优化首响与跟进响应，避免超过 ${rule.response_timeout_sec} 秒未回复。`);
        }
      }

      if (rule.rule_type !== 'response_timeout' && Array.isArray(rule.trigger_keywords) && rule.trigger_keywords.length > 0) {
        const hitCount = this.countKeywordHits(messages, rule.trigger_keywords as string[]);
        if (hitCount > 0) {
          triggeredRuleIds.push(rule.id);
          const deduct = hitCount * (rule.deduct_score ?? 0);
          qualityScore -= deduct;
          violations.push({ type: rule.rule_type, count: hitCount, ruleName: rule.rule_name });
          deductDetails.push({ ruleId: rule.id, ruleName: rule.rule_name, deductScore: deduct });
          suggestions.push(`检查 ${rule.rule_name} 相关话术，减少重复触发。`);
        }
      }
    }

    const sensitiveHits = this.collectSensitiveHits(messages, terms);
    if (sensitiveHits.length > 0) {
      qualityScore -= sensitiveHits.reduce((sum, item) => sum + Number(item.severity ?? 1) * 2, 0);
      violations.push({ type: 'sensitive_term', count: sensitiveHits.length, ruleName: '敏感词检测' });
      deductDetails.push({ ruleId: 'sensitive_term', ruleName: '敏感词检测', deductScore: sensitiveHits.length * 2 });
      suggestions.push('替换违规话术并复盘敏感词命中场景。');
    }

    const topFaqs = this.extractFaqs(customerMessages);
    const lossRiskScore =
      (session.customer_satisfaction !== null && session.customer_satisfaction !== undefined && session.customer_satisfaction <= 2 ? 40 : 0) +
      responseTimeoutCount * 8 +
      sensitiveHits.length * 6 +
      (customerMessages.length > agentMessages.length * 2 ? 10 : 0);

    const customerSentiment = lossRiskScore >= 60 ? 'negative' : lossRiskScore >= 30 ? 'neutral' : 'positive';
    const lossRiskLevel = lossRiskScore >= 60 ? 'high' : lossRiskScore >= 30 ? 'medium' : 'low';
    const qualityScoreFinal = Math.max(0, Math.min(100, qualityScore));
    const qualityPassed = qualityScoreFinal >= 80 && sensitiveHits.length === 0;

    if (lossRiskLevel === 'high') {
      suggestions.push('该会话存在较高流失风险，建议优先人工复核并主动回访。');
    }

    if (topFaqs.length > 0) {
      suggestions.push('将高频问题沉淀到知识库或快捷回复，降低重复咨询成本。');
    }

    const uniqueRuleIds = [...new Set(triggeredRuleIds)];
    const tags = this.buildSessionTags({
      qualityPassed,
      lossRiskLevel,
      responseTimeoutCount,
      sensitiveHits,
      topFaqs,
      triggeredRuleIds: uniqueRuleIds,
      customerSentiment
    });

    return {
      qualityScore: qualityScoreFinal,
      qualityPassed,
      lossRiskLevel,
      lossRiskScore,
      customerSentiment,
      responseTimeoutCount,
      sensitiveHits,
      topFaqs,
      triggeredRuleIds: uniqueRuleIds,
      violations,
      deductDetails,
      tags,
      suggestions: [...new Set(suggestions)],
      summary: `质检${qualityPassed ? '通过' : '未通过'}，流失风险${lossRiskLevel}，命中敏感词 ${sensitiveHits.length} 次，高频问题 ${topFaqs.length} 类。`
    };
  }

  private buildSessionTags(input: {
    qualityPassed: boolean;
    lossRiskLevel: string;
    responseTimeoutCount: number;
    sensitiveHits: JsonObject[];
    topFaqs: Array<{ question: string; count: number }>;
    triggeredRuleIds: string[];
    customerSentiment: string;
  }) {
    const tags = new Set<string>();

    tags.add(input.qualityPassed ? '质检通过' : '质检未通过');
    tags.add(`流失风险-${input.lossRiskLevel}`);

    if (input.responseTimeoutCount > 0) {
      tags.add('响应超时');
    }

    if (input.topFaqs.length > 0) {
      tags.add('高频问题');
    }

    if (input.customerSentiment === 'negative') {
      tags.add('客户情绪负向');
    }

    for (const hit of input.sensitiveHits) {
      const category = String(hit.category ?? '').trim();
      tags.add(category ? `敏感词-${category}` : '敏感词命中');
    }

    for (const ruleId of input.triggeredRuleIds.slice(0, 3)) {
      tags.add(`规则-${ruleId.slice(0, 8)}`);
    }

    return [...tags].slice(0, 10);
  }

  private countResponseTimeouts(messages: any[], timeoutSec: number) {
    let count = 0;

    for (let i = 0; i < messages.length; i += 1) {
      const current = messages[i];
      if (current.sender_type !== 'customer') {
        continue;
      }

      const nextAgent = messages.slice(i + 1).find((item) => item.sender_type === 'agent');
      if (!nextAgent) {
        count += 1;
        continue;
      }

      const gap = (new Date(nextAgent.sent_at).getTime() - new Date(current.sent_at).getTime()) / 1000;
      if (gap > timeoutSec) {
        count += 1;
      }
    }

    return count;
  }

  private countKeywordHits(messages: any[], keywords: string[]) {
    const normalized = keywords.map((item) => item.toLowerCase()).filter(Boolean);
    let count = 0;

    for (const message of messages) {
      const content = String(message.content ?? '').toLowerCase();
      if (normalized.some((keyword) => content.includes(keyword))) {
        count += 1;
      }
    }

    return count;
  }

  private collectSensitiveHits(messages: any[], terms: any[]) {
    const hits: JsonObject[] = [];

    for (const message of messages) {
      const content = String(message.content ?? '');
      for (const term of terms) {
        if (content.includes(term.term)) {
          hits.push({
            term: term.term,
            severity: term.severity,
            category: term.category,
            messageId: message.id,
            senderType: message.sender_type
          });
        }
      }
    }

    return hits;
  }

  private extractFaqs(messages: any[]) {
    const faqMap = new Map<string, number>();

    for (const message of messages) {
      const content = String(message.content ?? '').trim();
      if (!content || (!content.includes('吗') && !content.includes('?') && !content.includes('？'))) {
        continue;
      }

      const normalized = content.length > 40 ? `${content.slice(0, 40)}...` : content;
      faqMap.set(normalized, (faqMap.get(normalized) ?? 0) + 1);
    }

    return [...faqMap.entries()]
      .map(([question, count]) => ({ question, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private normalizeTags(value: unknown) {
    return Array.isArray(value)
      ? value
          .map((item) => String(item ?? '').trim())
          .filter(Boolean)
      : [];
  }

  private async ensureKnowledgeTags(
    userId: string,
    session: { platform_id: string; dept_id: string; shop_id?: string | null },
    tags: string[],
    sourceType: string
  ) {
    const normalizedTags = [...new Set(tags.map((item) => item.trim()).filter(Boolean))].slice(0, 12);
    for (const tag of normalizedTags) {
      const existing = await (this.prisma as any).knowledge_tag.findFirst({
        where: {
          is_deleted: 0,
          tag_name: tag,
          platform_id: session.platform_id,
          dept_id: session.dept_id,
          shop_id: session.shop_id ?? null
        }
      });

      if (existing) {
        continue;
      }

      await (this.prisma as any).knowledge_tag.create({
        data: {
          tag_name: tag,
          tag_code: this.buildTagCode(tag),
          source_type: sourceType,
          platform_id: session.platform_id,
          dept_id: session.dept_id,
          shop_id: session.shop_id ?? null,
          created_by: userId
        }
      });
    }

    return normalizedTags;
  }

  private buildTagCode(tag: string) {
    return tag
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
  }

  private normalizeCaseMessages(
    messages?:
      | Array<{
          id?: string;
          sender_type?: string;
          sender_name?: string;
          content?: string;
          sent_at?: string;
        }>
      | undefined
  ) {
    return (messages ?? [])
      .map((item) => ({
        id: String(item.id ?? ''),
        sender_type: String(item.sender_type ?? 'unknown'),
        sender_name: item.sender_name ? String(item.sender_name) : '',
        content: String(item.content ?? '').trim(),
        sent_at: item.sent_at ? String(item.sent_at) : ''
      }))
      .filter((item) => item.content);
  }

  private async getLatestAnalysis(sessionId: string) {
    return (this.prisma as any).service_session_analysis.findFirst({
      where: { session_id: sessionId, is_deleted: 0 },
      orderBy: { analyzed_at: 'desc' }
    });
  }

  private buildCaseArticleContent(session: any, messages: NormalizedCaseMessage[], latestAnalysis?: any, instruction?: string) {
    const summaryLines = [
      `会话编号: ${session.session_no}`,
      `客户: ${session.customer_nickname || '-'}`,
      `客服: ${session.agent_name || '-'}`,
      `状态: ${session.status || '-'}`,
      latestAnalysis?.summary ? `质检摘要: ${latestAnalysis.summary}` : '',
      instruction ? `整理要求: ${instruction}` : ''
    ].filter(Boolean);

    const transcript = messages
      .map((item, index) => `${index + 1}. [${item.sender_type}] ${item.sender_name || '-'}: ${item.content}`)
      .join('\n');

    const suggestionLines = Array.isArray(latestAnalysis?.suggestions)
      ? latestAnalysis.suggestions.map((item: unknown, index: number) => `${index + 1}. ${String(item)}`)
      : [];

    return [
      '案例概览',
      ...summaryLines,
      '',
      '对话纪要',
      transcript || '暂无对话内容',
      '',
      '复盘建议',
      ...(suggestionLines.length > 0 ? suggestionLines : ['1. 结合本次对话补充标准应答与风险提示。'])
    ].join('\n');
  }
}
