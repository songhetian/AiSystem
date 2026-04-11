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

  async listSessions(userId: string, query: QueryServiceSessionsDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const where: any = this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id' });
    if (query.keyword) {
      where.OR = [{ session_no: { contains: query.keyword } }, { customer_nickname: { contains: query.keyword } }];
    }
    return (this.prisma as any).service_session.findMany({ where, orderBy: { started_at: 'desc' } });
  }

  async getSession(userId: string, id: string) {
    const session = await (this.prisma as any).service_session.findUnique({
      where: { id },
      include: { messages: { where: { is_deleted: 0 }, orderBy: { sent_at: 'asc' } } }
    });
    if (!session) throw new NotFoundException('会话不存在');
    return session;
  }

  async analyzeSession(userId: string, id: string, _dto: AnalyzeServiceSessionDto) {
    return this.businessLockService.runExclusive(`service-session:analyze:${id}`, 30, async () => {
      const session = await this.getSession(userId, id);
      const messages = session.messages || [];
      const content = messages.map((m: any) => m.content).join('\n');

      // 1. 敏感词匹配
      const terms = await (this.prisma as any).service_sensitive_term.findMany({ 
        where: { platform_id: session.platform_id, enabled: 1 } 
      });
      const sensitiveHits = terms.filter(t => content.includes(t.term)).map(t => ({ term: t.term, category: t.category }));

      // 2. 规则/高频词匹配 (作为 FAQ 候选依据)
      const rules = await (this.prisma as any).service_quality_rule.findMany({ 
        where: { platform_id: session.platform_id, enabled: 1 } 
      });
      
      let score = 100;
      const violations: string[] = [];
      for (const rule of rules) {
        if (rule.rule_type === 'keyword_negative' && Array.isArray(rule.trigger_keywords)) {
          for (const kw of rule.trigger_keywords as any[]) {
            if (content.includes(kw)) {
              score -= rule.deduct_score;
              violations.push(rule.rule_name);
            }
          }
        }
      }

      // 3. 结果入库
      return await (this.prisma as any).service_session_analysis.create({
        data: {
          session_id: session.id,
          session_no: session.session_no,
          platform_id: session.platform_id,
          dept_id: session.dept_id,
          quality_score: Math.max(0, score),
          quality_passed: score >= 60 ? 1 : 0,
          sensitive_hits: sensitiveHits as any,
          triggered_rule_ids: violations as any,
          summary: content.substring(0, 500)
        }
      });
    });
  }

  async generateCaseDraft(_userId: string, id: string, _dto: GenerateServiceCaseDraftDto) {
    return { session_id: id, title: 'Draft Case' };
  }

  async archiveCase(_userId: string, id: string, _dto: ArchiveServiceCaseDto) {
    return { id, status: 'archived' };
  }

  async listQualityRules(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return (this.prisma as any).service_quality_rule.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id' })
    });
  }

  async createQualityRule(userId: string, dto: SaveServiceQualityRuleDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    return (this.prisma as any).service_quality_rule.create({
      data: { ...dto, platform_id: scope.platform_id, dept_id: scope.dept_id }
    });
  }

  async updateQualityRule(_userId: string, id: string, dto: SaveServiceQualityRuleDto) {
    return (this.prisma as any).service_quality_rule.update({ where: { id }, data: dto });
  }

  async toggleQualityRule(_userId: string, id: string, status: number) {
    return (this.prisma as any).service_quality_rule.update({ where: { id }, data: { enabled: status } });
  }

  async listSensitiveTerms(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return (this.prisma as any).service_sensitive_term.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id' })
    });
  }

  async createSensitiveTerm(userId: string, dto: SaveServiceSensitiveTermDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    return (this.prisma as any).service_sensitive_term.create({
      data: { ...dto, platform_id: scope.platform_id, dept_id: scope.dept_id }
    });
  }

  async updateSensitiveTerm(_userId: string, id: string, dto: SaveServiceSensitiveTermDto) {
    return (this.prisma as any).service_sensitive_term.update({ where: { id }, data: dto });
  }

  async getAiOverview(userId: string, query: QueryServiceSessionsDto) {
    return { totalSessions: 0, analyzedSessions: 0 };
  }
}
