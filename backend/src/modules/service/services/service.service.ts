import { Injectable, NotFoundException } from '@nestjs/common';
import { BusinessLockService } from '../../../common/services/business-lock.service';
import { RealtimeService } from '../../../common/services/realtime.service';
import { ScopeService } from '../../../common/services/scope.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly businessLockService: BusinessLockService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async listSessions(userId: string, query: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    return (this.prisma as any).service_session.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id' }),
      orderBy: { started_at: 'desc' },
    });
  }

  async analyzeSession(userId: string, id: string) {
    return this.businessLockService.runExclusive(`service-session:analyze:${id}`, 30, async () => {
      const session = await (this.prisma as any).service_session.findUnique({ 
        where: { id },
        include: { messages: { where: { is_deleted: 0 }, orderBy: { sent_at: 'asc' } } }
      });
      if (!session) throw new NotFoundException('会话不存在');

      // 1. 获取质检规则和敏感词
      const [rules, terms] = await Promise.all([
        (this.prisma as any).service_quality_rule.findMany({ where: { platform_id: session.platform_id, enabled: 1 } }),
        (this.prisma as any).service_sensitive_term.findMany({ where: { platform_id: session.platform_id, enabled: 1 } }),
      ]);

      const messages = session.messages || [];
      const content = messages.map((m: any) => m.content).join('\n');

      // 2. 真实分析逻辑
      let score = 100;
      const violations = [];
      const sensitiveHits = [];

      // 敏感词检测
      for (const term of terms) {
        if (content.includes(term.term)) {
          score -= (term.severity * 5);
          sensitiveHits.push({ term: term.term, category: term.category });
        }
      }

      // 规则检测 (简单关键词/响应时间示例)
      for (const rule of rules) {
        if (rule.rule_type === 'keyword_negative') {
          const keywords = Array.isArray(rule.trigger_keywords) ? rule.trigger_keywords : [];
          for (const kw of keywords) {
            if (content.includes(kw)) {
              score -= rule.deduct_score;
              violations.push(rule.rule_name);
            }
          }
        }
      }

      // 3. 情感分析模拟 (基于关键词)
      const negativeWords = ['生气', '投诉', '差劲', '等了很久', '没解决'];
      const sentimentScore = negativeWords.filter(w => content.includes(w)).length;
      const sentiment = sentimentScore > 2 ? 'negative' : sentimentScore > 0 ? 'neutral' : 'positive';

      const created = await (this.prisma as any).service_session_analysis.create({
        data: {
          session_id: session.id,
          session_no: session.session_no,
          platform_id: session.platform_id,
          dept_id: session.dept_id,
          quality_score: Math.max(0, score),
          quality_passed: score >= 60 ? 1 : 0,
          loss_risk_level: score < 50 ? 'high' : 'low',
          customer_sentiment: sentiment,
          sensitive_hits: sensitiveHits as any,
          suggestions: score < 80 ? ['需加强服务话术培训', '注意响应及时性'] : ['表现良好'],
          analyzed_at: new Date(),
        },
      });

      return created;
    });
  }

  // 补全规则管理接口
  async listQualityRules(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return (this.prisma as any).service_quality_rule.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id' })
    });
  }

  async createQualityRule(userId: string, dto: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    return (this.prisma as any).service_quality_rule.create({
      data: { ...dto, platform_id: scope.platform_id, dept_id: scope.dept_id }
    });
  }

  async listSensitiveTerms(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return (this.prisma as any).service_sensitive_term.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id' })
    });
  }
}
