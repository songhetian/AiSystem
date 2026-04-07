import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { Permission } from '../../../common/permission.decorator';
import { AnalyzeServiceSessionDto } from '../dto/analyze-service-session.dto';
import { ArchiveServiceCaseDto } from '../dto/archive-service-case.dto';
import { GenerateServiceCaseDraftDto } from '../dto/generate-service-case-draft.dto';
import { QueryServiceSessionsDto } from '../dto/query-service-sessions.dto';
import { SaveServiceQualityRuleDto } from '../dto/save-service-quality-rule.dto';
import { SaveServiceSensitiveTermDto } from '../dto/save-service-sensitive-term.dto';
import { ServiceService } from '../services/service.service';

@Controller('service')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get('sessions')
  @Permission('service:session:list')
  listSessions(@CurrentUser() user: CurrentUserPayload, @Query() query: QueryServiceSessionsDto) {
    return this.serviceService.listSessions(user.sub, query);
  }

  @Get('sessions/:id')
  @Permission('service:session:list')
  getSession(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.serviceService.getSession(user.sub, id);
  }

  @Post('sessions/:id/analyze')
  @Permission('service:quality:analyze')
  analyzeSession(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: AnalyzeServiceSessionDto
  ) {
    return this.serviceService.analyzeSession(user.sub, id, dto);
  }

  @Post('sessions/:id/case-draft')
  @Permission('service:session:list')
  generateCaseDraft(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: GenerateServiceCaseDraftDto
  ) {
    return this.serviceService.generateCaseDraft(user.sub, id, dto);
  }

  @Post('sessions/:id/archive-case')
  @Permission('knowledge:article:create')
  archiveCase(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ArchiveServiceCaseDto
  ) {
    return this.serviceService.archiveCase(user.sub, id, dto);
  }

  @Get('quality-rules')
  @Permission('service:quality-rule:list')
  listQualityRules(@CurrentUser() user: CurrentUserPayload) {
    return this.serviceService.listQualityRules(user.sub);
  }

  @Post('quality-rules')
  @Permission('service:quality-rule:create')
  createQualityRule(@CurrentUser() user: CurrentUserPayload, @Body() dto: SaveServiceQualityRuleDto) {
    return this.serviceService.createQualityRule(user.sub, dto);
  }

  @Put('quality-rules/:id')
  @Permission('service:quality-rule:update')
  updateQualityRule(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: SaveServiceQualityRuleDto
  ) {
    return this.serviceService.updateQualityRule(user.sub, id, dto);
  }

  @Patch('quality-rules/:id/enable')
  @Permission('service:quality-rule:update')
  enableQualityRule(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.serviceService.toggleQualityRule(user.sub, id, 1);
  }

  @Patch('quality-rules/:id/disable')
  @Permission('service:quality-rule:update')
  disableQualityRule(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.serviceService.toggleQualityRule(user.sub, id, 0);
  }

  @Get('sensitive-terms')
  @Permission('service:sensitive-term:list')
  listSensitiveTerms(@CurrentUser() user: CurrentUserPayload) {
    return this.serviceService.listSensitiveTerms(user.sub);
  }

  @Post('sensitive-terms')
  @Permission('service:sensitive-term:create')
  createSensitiveTerm(@CurrentUser() user: CurrentUserPayload, @Body() dto: SaveServiceSensitiveTermDto) {
    return this.serviceService.createSensitiveTerm(user.sub, dto);
  }

  @Put('sensitive-terms/:id')
  @Permission('service:sensitive-term:update')
  updateSensitiveTerm(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: SaveServiceSensitiveTermDto
  ) {
    return this.serviceService.updateSensitiveTerm(user.sub, id, dto);
  }

  @Get('ai-overview')
  @Permission('service:dashboard:view')
  getAiOverview(@CurrentUser() user: CurrentUserPayload, @Query() query: QueryServiceSessionsDto) {
    return this.serviceService.getAiOverview(user.sub, query);
  }
}
