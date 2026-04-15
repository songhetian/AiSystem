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

@Controller("service")
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get("sessions")
  @Permission("service:session:list")
  listSessions(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryServiceSessionsDto,
  ) {
    return this.serviceService.listSessions(user.sub, query);
  }

  @Get("sessions/:id")
  @Permission("service:session:list")
  getSession(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.serviceService.getSession(user.sub, id);
  }

  @Post("sessions/:id/analyze")
  @Permission("service:quality:analyze")
  analyzeSession(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: AnalyzeServiceSessionDto,
  ) {
    return this.serviceService.analyzeSession(user.sub, id, dto);
  }

  @Post("sessions/:id/case-draft")
  @Permission("service:session:list")
  generateCaseDraft(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: GenerateServiceCaseDraftDto,
  ) {
    return this.serviceService.generateCaseDraft(user.sub, id, dto);
  }

  @Post("sessions/:id/archive-case")
  @Permission("knowledge:article:create")
  archiveCase(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: ArchiveServiceCaseDto,
  ) {
    return this.serviceService.archiveCase(user.sub, id, dto);
  }

  @Get("quality-rules")
  @Permission("service:quality-rule:list")
  listQualityRules(@CurrentUser() user: CurrentUserPayload) {
    return this.serviceService.listQualityRules(user.sub);
  }

  @Post("quality-rules")
  @Permission("service:quality-rule:create")
  createQualityRule(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SaveServiceQualityRuleDto,
  ) {
    return this.serviceService.createQualityRule(user.sub, dto);
  }

  @Put("quality-rules/:id")
  @Permission("service:quality-rule:update")
  updateQualityRule(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: SaveServiceQualityRuleDto,
  ) {
    return this.serviceService.updateQualityRule(user.sub, id, dto);
  }

  @Patch("quality-rules/:id/enable")
  @Permission("service:quality-rule:update")
  enableQualityRule(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.serviceService.toggleQualityRule(user.sub, id, 1);
  }

  @Patch("quality-rules/:id/disable")
  @Permission("service:quality-rule:update")
  disableQualityRule(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.serviceService.toggleQualityRule(user.sub, id, 0);
  }

  @Post("quality-rules/sort")
  @Permission("service:quality-rule:sort")
  sortQualityRules(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SortQualityRuleDto,
  ) {
    return this.serviceService.sortQualityRules(user.sub, dto.items);
  }

  @Get("sensitive-terms")
  @Permission("service:sensitive-term:list")
  listSensitiveTerms(@CurrentUser() user: CurrentUserPayload) {
    return this.serviceService.listSensitiveTerms(user.sub);
  }

  @Post("sensitive-terms")
  @Permission("service:sensitive-term:create")
  createSensitiveTerm(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SaveServiceSensitiveTermDto,
  ) {
    return this.serviceService.createSensitiveTerm(user.sub, dto);
  }

  @Put("sensitive-terms/:id")
  @Permission("service:sensitive-term:update")
  updateSensitiveTerm(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: SaveServiceSensitiveTermDto,
  ) {
    return this.serviceService.updateSensitiveTerm(user.sub, id, dto);
  }

  @Get("ai-overview")
  @Permission("service:dashboard:view")
  getAiOverview(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryServiceSessionsDto,
  ) {
    return this.serviceService.getAiOverview(user.sub, query);
  }

  @Get("dashboard-metrics")
  @Permission("service:dashboard:view")
  getDashboardMetrics(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryServiceSessionsDto,
  ) {
    return this.serviceService.getAiOverview(user.sub, query);
  }

  @Get("loss-inquiries")
  @Permission("service:loss:list")
  queryLossInquiries(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryLossInquiriesDto,
  ) {
    return this.serviceService.queryLossInquiries(user.sub, query);
  }

  @Patch("loss-inquiries/:id/recovery")
  @Permission("service:loss:mark")
  updateLossRecovery(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: UpdateRecoveryStateDto,
  ) {
    return this.serviceService.updateLossRecovery(user.sub, id, dto);
  }

  @Get("faqs")
  @Permission("service:faq:list")
  queryFaqStats(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryFaqStatsDto,
  ) {
    return this.serviceService.queryFaqStats(user.sub, query);
  }

  @Post("faqs")
  @Permission("service:faq:map")
  mapFaqArticle(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: MapFaqArticleDto,
  ) {
    return this.serviceService.mapFaqArticle(user.sub, dto);
  }

  @Get("tags/audit")
  @Permission("service:tag:list")
  queryQualityTags(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryQualityTagsDto,
  ) {
    return this.serviceService.queryQualityTags(user.sub, query);
  }

  @Post("tags/audit/confirm")
  @Permission("service:tag:audit")
  confirmQualityTags(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AuditTagsDto,
  ) {
    return this.serviceService.auditQualityTags(user.sub, dto, "confirm");
  }

  @Post("tags/audit/reject")
  @Permission("service:tag:audit")
  rejectQualityTags(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AuditTagsDto,
  ) {
    return this.serviceService.auditQualityTags(user.sub, dto, "reject");
  }

  @Post("tags/dedup")
  @Permission("service:tag:dedup")
  dedupQualityTags(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: DedupTagsDto,
  ) {
    return this.serviceService.dedupQualityTags(user.sub, dto);
  }
}
