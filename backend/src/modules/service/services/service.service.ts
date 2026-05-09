import { Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { BusinessLockService } from "../../../common/services/business-lock.service";
import { RealtimeService } from "../../../common/services/realtime.service";
import { ScopeService } from "../../../common/services/scope.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { Cacheable } from "../../../common/decorators/cache.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";
import { QualityPromptService } from "./quality-prompt.service";
import { QualityInspectionHelperService } from "./quality-inspection-helper.service";
import { AnalyzeServiceSessionDto } from "../dto/analyze-service-session.dto";
import { ArchiveServiceCaseDto } from "../dto/archive-service-case.dto";
import { GenerateServiceCaseDraftDto } from "../dto/generate-service-case-draft.dto";
import { QueryServiceSessionsDto } from "../dto/query-service-sessions.dto";
import { SaveServiceQualityRuleDto } from "../dto/save-service-quality-rule.dto";
import { SaveServiceSensitiveTermDto } from "../dto/save-service-sensitive-term.dto";

import {
  QueryLossInquiriesDto,
  UpdateRecoveryStateDto,
} from "../dto/loss-inquiry.dto";
import { QueryFaqStatsDto, MapFaqArticleDto } from "../dto/faq-stats.dto";
import {
  QueryQualityTagsDto,
  AuditTagsDto,
  DedupTagsDto,
} from "../dto/quality-tag.dto";

@Injectable()
export class ServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly businessLockService: BusinessLockService,
    private readonly realtimeService: RealtimeService,
    private readonly qualityPromptService: QualityPromptService,
    private readonly qualityInspectionHelperService: QualityInspectionHelperService,
    private readonly eventEmitter: EventEmitter2,
  ) {}


  // Delegate methods for type-safe table access
  private get sessionDelegate() {
    return this.prisma["service_session" as keyof typeof this.prisma] as any;
  }

  private get sessionAnalysisDelegate() {
    return this.prisma[
      "service_session_analysis" as keyof typeof this.prisma
    ] as any;
  }

  private get qualityRecordDelegate() {
    return this.prisma[
      "service_quality_record" as keyof typeof this.prisma
    ] as any;
  }

  private get qualityRuleDelegate() {
    return this.prisma[
      "service_quality_rule" as keyof typeof this.prisma
    ] as any;
  }

  private get sensitiveTermDelegate() {
    return this.prisma[
      "service_sensitive_term" as keyof typeof this.prisma
    ] as any;
  }

  private get lossInquiryDelegate() {
    return this.prisma[
      "service_loss_inquiry" as keyof typeof this.prisma
    ] as any;
  }

  private get faqMappingDelegate() {
    return this.prisma[
      "service_faq_mapping" as keyof typeof this.prisma
    ] as any;
  }

  private get sessionTagDelegate() {
    return this.prisma[
      "service_session_tag" as keyof typeof this.prisma
    ] as any;
  }

  private get knowledgeArticleDelegate() {
    return this.prisma["knowledge_article" as keyof typeof this.prisma] as any;
  }

  private get knowledgeTagDelegate() {
    return this.prisma["knowledge_tag" as keyof typeof this.prisma] as any;
  }

  // ✅ 优化：使用 select 限制字段，减少数据传输量
  private async enrichSessions(sessions: any[]) {
    if (sessions.length === 0) return [];

    const sessionIds = sessions.map((item) => item.id);
    // ✅ 一次批量查询，使用 select 只取必要字段
    const [analyses, qualityRecords] = await Promise.all([
      this.sessionAnalysisDelegate().findMany({
        where: { session_id: { in: sessionIds }, is_deleted: 0 },
        select: {
          id: true,
          session_id: true,
          quality_score: true,
          quality_passed: true,
          loss_risk_level: true,
          loss_risk_score: true,
          customer_sentiment: true,
          sensitive_hit_count: true,
          faq_hit_count: true,
          top_faqs: true,
          sensitive_hits: true,
          suggestions: true,
          summary: true,
          analyzed_at: true,
        },
        orderBy: [{ analyzed_at: "desc" }, { create_time: "desc" }],
      }),
      this.qualityRecordDelegate().findMany({
        where: { session_id: { in: sessionIds }, is_deleted: 0 },
        select: {
          id: true,
          session_id: true,
          score: true,
          passed: true,
          inspection_mode: true,
          comment: true,
          inspected_at: true,
        },
        orderBy: [{ inspected_at: "desc" }, { create_time: "desc" }],
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

  // ✅ 优化：添加缓存和查询监控
  @Cacheable({
    prefix: "service:sessions",
    ttl: 180,
    keyGenerator: (userId: string, query: QueryServiceSessionsDto) =>
      `${userId}:${JSON.stringify(query)}`,
  })
  @QueryOptimize()
  async listSessions(userId: string, query: QueryServiceSessionsDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const where: any = this.scopeService.applyScope(
      scope,
      { is_deleted: 0 },
      { platform: "platform_id" },
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

    const sessions = await this.sessionDelegate().findMany({
      where,
      orderBy: { started_at: "desc" },
    });
    const enriched = await this.enrichSessions(sessions);

    if (!query.risk_level) return enriched;
    return enriched.filter(
      (item) => item.latest_analysis?.loss_risk_level === query.risk_level,
    );
  }

  async getSession(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const session = await this.sessionDelegate().findFirst({
      where: this.scopeService.applyScope(
        scope,
        { id, is_deleted: 0 },
        { platform: "platform_id" },
      ),
      include: {
        messages: {
          where: { is_deleted: 0 },
          orderBy: { sent_at: "asc" },
        },
      },
    });
    if (!session) throw new NotFoundException("会话不存在");

    const [analyses, qualityRecords] = await Promise.all([
      this.sessionAnalysisDelegate().findMany({
        where: { session_id: id, is_deleted: 0 },
        orderBy: [{ analyzed_at: "desc" }, { create_time: "desc" }],
      }),
      this.qualityRecordDelegate().findMany({
        where: { session_id: id, is_deleted: 0 },
        orderBy: [{ inspected_at: "desc" }, { create_time: "desc" }],
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

  async analyzeSession(
    userId: string,
    id: string,
    _dto: AnalyzeServiceSessionDto,
  ) {
    return this.businessLockService.runExclusive(
      `service-session:analyze:${id}`,
      30,
      async () => {
        const session = await this.getSession(userId, id);
        const messages = session.messages || [];
        const content = messages.map((m: any) => m.content).join("\n");

        // ✅ Task 3.1: 获取合并后的质检Prompt（包含来源标记）
        const mergedPrompts = await this.qualityPromptService.getMergedPromptsForInspection(
          session.platform_id,
          session.dept_id,
        );

        const terms = await (
          this.prisma as any
        ).service_sensitive_term.findMany({
          where: {
            platform_id: session.platform_id,
            enabled: 1,
            is_deleted: 0,
          },
        });
        const sensitiveHits = terms
          .filter((t: any) => content.includes(t.term))
          .map((t: any) => ({
            term: t.term,
            category: t.category,
            severity: t.severity,
          }));

        const rules = await this.qualityRuleDelegate().findMany({
          where: {
            platform_id: session.platform_id,
            enabled: 1,
            is_deleted: 0,
          },
        });

        let score = 100;
        const violations: Array<{
          source: string;
          rule: string;
          deduction: number;
          promptId?: string;
          promptName?: string;
        }> = [];

        // ✅ Task 3.1: 基于Prompt的质检逻辑（带来源标记）
        const promptViolations = this.qualityInspectionHelperService.checkPromptViolations(
          content,
          mergedPrompts,
        );
        for (const violation of promptViolations) {
          score -= violation.deduction;
          violations.push(violation);
        }

        // 原有的规则检查逻辑
        for (const rule of rules) {
          if (
            rule.rule_type === "keyword_negative" &&
            Array.isArray(rule.trigger_keywords)
          ) {
            for (const keyword of rule.trigger_keywords as string[]) {
              if (content.includes(keyword)) {
                score -= rule.deduct_score;
                violations.push({
                  source: 'rule',
                  rule: rule.rule_name,
                  deduction: rule.deduct_score,
                });
              }
            }
          }
        }

        const topFaqCounter = new Map<string, number>();
        for (const message of messages.filter(
          (item: any) => item.sender_type !== "agent",
        )) {
          const normalized = String(message.content || "").trim();
          if (!normalized) continue;
          topFaqCounter.set(
            normalized,
            (topFaqCounter.get(normalized) ?? 0) + 1,
          );
        }
        const topFaqs = Array.from(topFaqCounter.entries())
          .map(([question, count]) => ({ question, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        const responseTimeoutCount = messages.reduce(
          (count: number, item: any) => {
            if (
              item.sender_type === "agent" &&
              String(item.content || "").length < 3
            ) {
              return count + 1;
            }
            return count;
          },
          0,
        );

        const lossRiskScore = Math.min(
          100,
          sensitiveHits.length * 20 +
            Math.max(0, 60 - score) +
            responseTimeoutCount * 5,
        );
        const lossRiskLevel =
          lossRiskScore >= 70 ? "high" : lossRiskScore >= 40 ? "medium" : "low";
        const suggestions: string[] = [];

        // ✅ Task 3.1: 添加基于Prompt的建议
        if (promptViolations.length > 0) {
          const promptSuggestions = this.qualityInspectionHelperService.generatePromptSuggestions(promptViolations);
          suggestions.push(...promptSuggestions);
        }

        if (sensitiveHits.length > 0)
          suggestions.push("存在敏感词命中，建议复核客服用语并补充质检规则。");
        if (score < 80)
          suggestions.push("本次会话得分偏低，建议优化回复完整度与合规表达。");
        if (responseTimeoutCount > 0)
          suggestions.push("存在响应质量波动，建议检查坐席话术与接待流程。");
        if (topFaqs.length > 0)
          suggestions.push(
            `高频问题集中在“${topFaqs[0].question}”，建议沉淀FAQ或标准话术。`,
          );

        const summary = content.substring(0, 500);

        const analysis = await (
          this.prisma as any
        ).service_session_analysis.create({
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
            customer_sentiment:
              lossRiskLevel === "high" ? "negative" : "neutral",
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

        await this.qualityRecordDelegate().create({
          data: {
            session_id: session.id,
            analysis_id: analysis.id,
            session_no: session.session_no,
            inspection_mode: "auto",
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

        // --- [NEW] 触发质检不合格通知 (PRD 2.5) ---
        if (analysis.quality_passed === 0) {
          this.eventEmitter.emit("message.trigger", {
            event: "service.quality_failed",
            variables: {
              sessionNo: analysis.session_no,
              score: analysis.quality_score,
              violations: suggestions.join("; "),
            },
            platformId: analysis.platform_id,
            deptId: analysis.dept_id,
            bizId: analysis.session_id,
            bizType: "service_quality",
          });
        }

        return analysis;
      },
    );
  }


  async generateCaseDraft(
    userId: string,
    id: string,
    dto: GenerateServiceCaseDraftDto,
  ) {
    const session = await this.getSession(userId, id);
    const messages = dto.messages?.length
      ? dto.messages
      : session.messages || [];
    const transcript = messages.map((item) => ({
      id: item.id,
      sender_type: item.sender_type,
      sender_name: item.sender_name,
      content: item.content,
      sent_at: item.sent_at,
    }));

    const customerMessages = transcript.filter(
      (item) => item.sender_type !== "agent",
    );
    const agentMessages = transcript.filter(
      (item) => item.sender_type === "agent",
    );
    const titleSeed =
      customerMessages[0]?.content ||
      session.customer_nickname ||
      session.session_no;
    const title = titleSeed.slice(0, 30);
    const tags = Array.isArray(session.tags) ? session.tags : [];
    const keyword = customerMessages
      .map((item) => item.content)
      .slice(0, 3)
      .join(" / ")
      .slice(0, 120);
    const content = [
      `问题背景：${customerMessages[0]?.content || "用户发起咨询。"}`,
      `沟通摘要：共 ${transcript.length} 条消息，客服回复 ${agentMessages.length} 条。`,
      dto.instruction ? `补充要求：${dto.instruction}` : undefined,
      "建议话术：",
      "1. 先确认用户核心诉求与订单/商品上下文。",
      "2. 给出清晰、可执行的处理方案或 FAQ 答案。",
      "3. 如涉及价格、售后或转人工，明确后续处理路径。",
      "",
      "会话摘录：",
      transcript
        .slice(0, 10)
        .map((item) => `- [${item.sender_type}] ${item.content}`)
        .join("\n"),
    ]
      .filter(Boolean)
      .join("\n");

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
    const article = await this.knowledgeArticleDelegate().create({
      data: {
        title: dto.title,
        content: dto.content,
        category_id: dto.category_id,
        category_name: dto.category_name || "服务案例",
        status: dto.status || "published",
        keyword: dto.keyword || dto.tags?.join(","),
        source_type: "service_case",
        source_ref: session.id,
        platform_id: scope.platform_id,
        dept_id: scope.dept_id,
        shop_id: session.shop_id,
        published_at: dto.status === "draft" ? null : new Date(),
      },
    });

    const mergedTags = Array.from(
      new Set([
        ...(Array.isArray(session.tags) ? session.tags : []),
        ...(dto.tags || []),
      ]),
    );
    await this.sessionDelegate().update({
      where: { id: session.id },
      data: {
        tags: mergedTags as any,
        remark: `已归档案例：${article.title}`,
      },
    });

    return {
      id: article.id,
      status: "archived",
      article_id: article.id,
    };
  }

  // ✅ 优化：添加缓存（质检规则变更频率低）
  @Cacheable({
    prefix: "service:quality-rules",
    ttl: 600,
    keyGenerator: (userId: string) => userId,
  })
  @QueryOptimize()
  async listQualityRules(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.qualityRuleDelegate().findMany({
      where: this.scopeService.applyScope(
        scope,
        { is_deleted: 0 },
        { platform: "platform_id" },
      ),
      orderBy: [{ sort: "asc" }, { create_time: "desc" }],
    });
  }

  async createQualityRule(userId: string, dto: SaveServiceQualityRuleDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.qualityRuleDelegate().create({
      data: { ...dto, platform_id: scope.platform_id, dept_id: scope.dept_id },
    });
  }

  async updateQualityRule(
    _userId: string,
    id: string,
    dto: SaveServiceQualityRuleDto,
  ) {
    return this.qualityRuleDelegate().update({
      where: { id },
      data: dto,
    });
  }

  async toggleQualityRule(_userId: string, id: string, status: number) {
    return this.qualityRuleDelegate().update({
      where: { id },
      data: { enabled: status },
    });
  }

  /**
   * 质检规则排序（V2.0 性能优化）
   * 优化点：
   * 1. 使用事务批量更新
   * 2. 权限校验
   * 3. 数据一致性保证
   */
  async sortQualityRules(
    userId: string,
    items: Array<{ id: string; sort: number }>,
  ) {
    const scope = await this.scopeService.resolveAccess(userId);

    // 获取所有规则并校验权限
    const ruleIds = items.map((item) => item.id);
    const rules = await this.qualityRuleDelegate().findMany({
      where: { id: { in: ruleIds }, is_deleted: 0 },
    });

    // 校验所有规则的权限
    for (const rule of rules) {
      this.scopeService.assertPlatformAccess(scope, rule.platform_id);
      this.scopeService.assertDepartmentAccess(scope, rule.dept_id);
    }

    if (rules.length !== ruleIds.length) {
      throw new Error("部分规则不存在或无权限访问");
    }

    // 使用事务批量更新排序
    return this.prisma.$transaction(
      items.map((item) =>
        this.qualityRuleDelegate().update({
          where: { id: item.id },
          data: { sort: item.sort },
        }),
      ),
    );
  }

  // ✅ 优化：添加缓存（敏感词变更频率低）
  @Cacheable({
    prefix: "service:sensitive-terms",
    ttl: 600,
    keyGenerator: (userId: string) => userId,
  })
  @QueryOptimize()
  async listSensitiveTerms(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.sensitiveTermDelegate().findMany({
      where: this.scopeService.applyScope(
        scope,
        { is_deleted: 0 },
        { platform: "platform_id" },
      ),
    });
  }

  async createSensitiveTerm(userId: string, dto: SaveServiceSensitiveTermDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.sensitiveTermDelegate().create({
      data: { ...dto, platform_id: scope.platform_id, dept_id: scope.dept_id },
    });
  }

  async updateSensitiveTerm(
    _userId: string,
    id: string,
    dto: SaveServiceSensitiveTermDto,
  ) {
    return this.sensitiveTermDelegate().update({
      where: { id },
      data: dto,
    });
  }

  async getAiOverview(userId: string, query: QueryServiceSessionsDto) {
    const sessions = await this.listSessions(userId, query);
    const analyzedSessions = sessions.filter((item) => item.latest_analysis);
    const passCount = analyzedSessions.filter(
      (item) => item.latest_analysis?.quality_passed,
    ).length;
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
      riskBuckets[analysis.loss_risk_level as "high" | "medium" | "low"] += 1;
      sensitiveHitCount += Number(analysis.sensitive_hit_count ?? 0);
      const topFaqs = Array.isArray(analysis.top_faqs) ? analysis.top_faqs : [];
      for (const faq of topFaqs) {
        if (!faq?.question) continue;
        topFaqCounter.set(
          faq.question,
          (topFaqCounter.get(faq.question) ?? 0) + Number(faq.count ?? 1),
        );
      }
    }

    return {
      totalSessions: sessions.length,
      analyzedSessions: analyzedSessions.length,
      qualityPassRate: analyzedSessions.length
        ? Number(((passCount / analyzedSessions.length) * 100).toFixed(2))
        : 0,
      averageQualityScore: analyzedSessions.length
        ? Number((totalScore / analyzedSessions.length).toFixed(2))
        : 0,
      lossSessionCount: riskBuckets.high + riskBuckets.medium,
      sensitiveHitCount,
      riskBuckets,
      topFaqs: Array.from(topFaqCounter.entries())
        .map(([question, count]) => ({ question, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }
  async queryLossInquiries(userId: string, query: QueryLossInquiriesDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const where: any = this.scopeService.applyScope(
      scope,
      { is_deleted: 0 },
      { platform: "platform_id" },
    );
    if (query.recovery_state) where.recovery_state = query.recovery_state;
    if (query.product_id) where.product_id = query.product_id;
    if (query.agent_id) where.agent_id = query.agent_id;

    return this.lossInquiryDelegate().findMany({
      where,
      orderBy: { create_time: "desc" },
    });
  }

  async updateLossRecovery(
    _userId: string,
    id: string,
    dto: UpdateRecoveryStateDto,
  ) {
    return this.lossInquiryDelegate().update({
      where: { id },
      data: {
        recovery_state: dto.recovery_state,
        recovery_remark: dto.recovery_remark,
      },
    });
  }

  async queryFaqStats(userId: string, query: QueryFaqStatsDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const where: any = this.scopeService.applyScope(
      scope,
      { is_deleted: 0 },
      { platform: "platform_id" },
    );
    if (query.faq_type) where.faq_type = query.faq_type;

    return this.faqMappingDelegate().findMany({
      where,
      orderBy: { hit_count: "desc" },
      take: 50,
    });
  }

  async mapFaqArticle(userId: string, dto: MapFaqArticleDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.faqMappingDelegate().create({
      data: {
        ...dto,
        platform_id: scope.platform_id,
        dept_id: scope.dept_id,
      },
    });
  }

  async queryQualityTags(userId: string, query: QueryQualityTagsDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const where: any = this.scopeService.applyScope(
      scope,
      { is_deleted: 0 },
      { platform: "platform_id" },
    );
    if (query.status) where.status = query.status;

    return this.sessionTagDelegate().findMany({
      where,
      orderBy: { create_time: "desc" },
    });
  }

  async auditQualityTags(
    userId: string,
    dto: AuditTagsDto,
    action: "confirm" | "reject",
  ) {
    const scope = await this.scopeService.resolveAccess(userId);
    const tags = await this.sessionTagDelegate().findMany({
      where: { id: { in: dto.ids } },
    });

    await this.sessionTagDelegate().updateMany({
      where: { id: { in: dto.ids } },
      data: {
        status: action === "confirm" ? "confirmed" : "rejected",
        reject_reason: dto.reject_reason,
      },
    });

    if (action === "confirm") {
      const existingTags = await this.knowledgeTagDelegate().findMany({
        where: {
          tag_name: { in: tags.map((t: any) => t.tag_name) },
          platform_id: scope.platform_id,
          dept_id: scope.dept_id,
        },
      });
      const existingNames = new Set(existingTags.map((t: any) => t.tag_name));

      const newTags = tags
        .filter((t: any) => !existingNames.has(t.tag_name))
        .map((t: any) => ({
          tag_name: t.tag_name,
          tag_code: `QA_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`,
          source_type: "qa_inspection",
          platform_id: scope.platform_id,
          dept_id: scope.dept_id,
          shop_id: t.shop_id,
          created_by: userId,
        }));

      const uniqueNewTags: any[] = [];
      const seenNames = new Set();
      for (const nt of newTags) {
        if (!seenNames.has(nt.tag_name)) {
          uniqueNewTags.push(nt);
          seenNames.add(nt.tag_name);
        }
      }

      if (uniqueNewTags.length > 0) {
        // ✅ 优化：使用 createMany 批量创建，替代循环单条创建
        await this.knowledgeTagDelegate().createMany({
          data: uniqueNewTags,
          skipDuplicates: true,
        });
      }
    }
    return { success: true, count: dto.ids.length };
  }

  async dedupQualityTags(userId: string, dto: DedupTagsDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const { target_tag_name, source_tag_names } = dto;

    // Find sessions that have source tags
    const sessionsWithSource = await (
      this.prisma as any
    ).service_session_tag.findMany({
      where: {
        platform_id: scope.platform_id,
        tag_name: { in: source_tag_names },
      },
    });

    // Convert source to target
    await this.sessionTagDelegate().updateMany({
      where: {
        tag_name: { in: source_tag_names },
        platform_id: scope.platform_id,
      },
      data: {
        tag_name: target_tag_name,
      },
    });

    return { success: true, updatedSessions: sessionsWithSource.length };
  }
}
