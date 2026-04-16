import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../../../common/current-user.decorator";
import { Permission } from "../../../common/permission.decorator";
import { AnalyzeServiceSessionDto } from "../dto/analyze-service-session.dto";
import { ArchiveServiceCaseDto } from "../dto/archive-service-case.dto";
import { GenerateServiceCaseDraftDto } from "../dto/generate-service-case-draft.dto";
import { QueryServiceSessionsDto } from "../dto/query-service-sessions.dto";
import { SaveServiceQualityRuleDto } from "../dto/save-service-quality-rule.dto";
import { SaveServiceSensitiveTermDto } from "../dto/save-service-sensitive-term.dto";
import { SortQualityRuleDto } from "../dto/sort-quality-rule.dto";
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
import { ServiceService } from "../services/service.service";
import { AntiShake } from "../../../common/decorators/antishake.decorator";
import { Idempotent } from "../../../common/decorators/idempotent.decorator";
import { RateLimit } from "../../../common/decorators/rate-limiter.decorator";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";

@Controller("service")
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get("sessions")
  @Permission("service:session:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "service:sessions", ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 300, timeout: 5000 })
  listSessions(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryServiceSessionsDto,
  ) {
    return this.serviceService.listSessions(user.sub, query);
  }

  @Get("sessions/:id")
  @Permission("service:session:list")
  @RateLimit({ limit: 50, window: 60 })
  @Cache({ key: "service:session:detail", ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  getSession(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.serviceService.getSession(user.sub, id);
  }

  @Post("sessions/:id/analyze")
  @Permission("service:quality:analyze")
  @AntiShake(2000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["service:sessions:*", "service:quality:*"] })
  analyzeSession(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: AnalyzeServiceSessionDto,
  ) {
    return this.serviceService.analyzeSession(user.sub, id, dto);
  }

  @Post("sessions/:id/case-draft")
  @Permission("service:session:list")
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  generateCaseDraft(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: GenerateServiceCaseDraftDto,
  ) {
    return this.serviceService.generateCaseDraft(user.sub, id, dto);
  }

  @Post("sessions/:id/archive-case")
  @Permission("knowledge:article:create")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["service:sessions:*", "knowledge:articles:*"] })
  archiveCase(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: ArchiveServiceCaseDto,
  ) {
    return this.serviceService.archiveCase(user.sub, id, dto);
  }

  @Get("quality-rules")
  @Permission("service:quality-rule:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "service:quality-rules", ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  listQualityRules(@CurrentUser() user: CurrentUserPayload) {
    return this.serviceService.listQualityRules(user.sub);
  }

  @Post("quality-rules")
  @Permission("service:quality-rule:create")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["service:quality-rules:*"] })
  createQualityRule(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SaveServiceQualityRuleDto,
  ) {
    return this.serviceService.createQualityRule(user.sub, dto);
  }

  @Put("quality-rules/:id")
  @Permission("service:quality-rule:update")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["service:quality-rules:*"] })
  updateQualityRule(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: SaveServiceQualityRuleDto,
  ) {
    return this.serviceService.updateQualityRule(user.sub, id, dto);
  }

  @Patch("quality-rules/:id/enable")
  @Permission("service:quality-rule:update")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["service:quality-rules:*"] })
  enableQualityRule(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.serviceService.toggleQualityRule(user.sub, id, 1);
  }

  @Patch("quality-rules/:id/disable")
  @Permission("service:quality-rule:update")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["service:quality-rules:*"] })
  disableQualityRule(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.serviceService.toggleQualityRule(user.sub, id, 0);
  }

  @Post("quality-rules/sort")
  @Permission("service:quality-rule:sort")
  @AntiShake(500)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["service:quality-rules:*"] })
  sortQualityRules(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SortQualityRuleDto,
  ) {
    return this.serviceService.sortQualityRules(user.sub, dto.items);
  }

  @Get("sensitive-terms")
  @Permission("service:sensitive-term:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "service:sensitive-terms", ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  listSensitiveTerms(@CurrentUser() user: CurrentUserPayload) {
    return this.serviceService.listSensitiveTerms(user.sub);
  }

  @Post("sensitive-terms")
  @Permission("service:sensitive-term:create")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["service:sensitive-terms:*"] })
  createSensitiveTerm(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SaveServiceSensitiveTermDto,
  ) {
    return this.serviceService.createSensitiveTerm(user.sub, dto);
  }

  @Put("sensitive-terms/:id")
  @Permission("service:sensitive-term:update")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["service:sensitive-terms:*"] })
  updateSensitiveTerm(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: SaveServiceSensitiveTermDto,
  ) {
    return this.serviceService.updateSensitiveTerm(user.sub, id, dto);
  }

  @Get("ai-overview")
  @Permission("service:dashboard:view")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "service:ai-overview", ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 300, timeout: 5000 })
  getAiOverview(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryServiceSessionsDto,
  ) {
    return this.serviceService.getAiOverview(user.sub, query);
  }

  @Get("dashboard-metrics")
  @Permission("service:dashboard:view")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "service:dashboard-metrics", ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 300, timeout: 5000 })
  getDashboardMetrics(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryServiceSessionsDto,
  ) {
    return this.serviceService.getAiOverview(user.sub, query);
  }

  @Get("loss-inquiries")
  @Permission("service:loss:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "service:loss-inquiries", ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 300, timeout: 5000 })
  queryLossInquiries(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryLossInquiriesDto,
  ) {
    return this.serviceService.queryLossInquiries(user.sub, query);
  }

  @Patch("loss-inquiries/:id/recovery")
  @Permission("service:loss:mark")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["service:loss-inquiries:*"] })
  updateLossRecovery(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: UpdateRecoveryStateDto,
  ) {
    return this.serviceService.updateLossRecovery(user.sub, id, dto);
  }

  @Get("faqs")
  @Permission("service:faq:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "service:faqs", ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  queryFaqStats(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryFaqStatsDto,
  ) {
    return this.serviceService.queryFaqStats(user.sub, query);
  }

  @Post("faqs")
  @Permission("service:faq:map")
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["service:faqs:*", "knowledge:articles:*"] })
  mapFaqArticle(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: MapFaqArticleDto,
  ) {
    return this.serviceService.mapFaqArticle(user.sub, dto);
  }

  @Get("tags/audit")
  @Permission("service:tag:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "service:tags:audit", ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  queryQualityTags(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryQualityTagsDto,
  ) {
    return this.serviceService.queryQualityTags(user.sub, query);
  }

  @Post("tags/audit/confirm")
  @Permission("service:tag:audit")
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["service:tags:*", "service:sessions:*"] })
  confirmQualityTags(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AuditTagsDto,
  ) {
    return this.serviceService.auditQualityTags(user.sub, dto, "confirm");
  }

  @Post("tags/audit/reject")
  @Permission("service:tag:audit")
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["service:tags:*", "service:sessions:*"] })
  rejectQualityTags(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AuditTagsDto,
  ) {
    return this.serviceService.auditQualityTags(user.sub, dto, "reject");
  }

  @Post("tags/dedup")
  @Permission("service:tag:dedup")
  @AntiShake(1000)
  @RateLimit({ limit: 5, window: 60 })
  @CacheEvict({ keys: ["service:tags:*", "service:sessions:*"] })
  dedupQualityTags(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: DedupTagsDto,
  ) {
    return this.serviceService.dedupQualityTags(user.sub, dto);
  }
}
