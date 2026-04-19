import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../../../common/current-user.decorator';
import { Permission } from '../../../common/permission.decorator';
import { AntiShake } from '../../../common/decorators/antishake.decorator';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';
import { RateLimit } from '../../../common/decorators/rate-limiter.decorator';
import { Cache } from '../../../common/decorators/cache.decorator';
import { CacheEvict } from '../../../common/decorators/cache-evict.decorator';
import { QueryOptimize } from '../../../common/decorators/query-optimize.decorator';
import { QualityPromptService } from '../services/quality-prompt.service';
import { TemplateLibraryService } from '../services/template-library.service';
import { VersionManagerService } from '../services/version-manager.service';
import { SaveGlobalPromptDto } from '../dto/save-global-prompt.dto';
import { SaveDepartmentPromptDto } from '../dto/save-department-prompt.dto';
import { QueryPromptsDto } from '../dto/query-prompts.dto';
import { BatchPromptOperationDto } from '../dto/batch-prompt-operation.dto';
import { SavePromptTemplateDto } from '../dto/save-prompt-template.dto';
import { PreviewPromptDto } from '../dto/preview-prompt.dto';
import { QueryAuditLogsDto } from '../dto/query-audit-logs.dto';
import { QualityInspectionHelperService } from '../services/quality-inspection-helper.service';
import type { Request } from 'express';

/**
 * 质检Prompt管理控制器
 * 实现全局Prompt、部门Prompt、模板库、版本管理、批量操作等功能
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8**
 */
@Controller('quality-prompts')
export class QualityPromptController {
  constructor(
    private readonly qualityPromptService: QualityPromptService,
    private readonly templateLibraryService: TemplateLibraryService,
    private readonly versionManagerService: VersionManagerService,
    private readonly qualityInspectionHelperService: QualityInspectionHelperService,
  ) {}

  // ==================== 全局Prompt管理 (11个端点) ====================

  /**
   * 查询全局Prompt列表
   * **Validates: Requirements 3.8, 23.7**
   */
  @Get('global')
  @Permission('service:quality-prompt:global:list')
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: 'quality-prompts:global', ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 1000, timeout: 5000 })
  queryGlobalPrompts(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryPromptsDto,
  ) {
    return this.qualityPromptService.queryGlobalPrompts(query, user.sub);
  }

  /**
   * 获取全局Prompt详情
   * **Validates: Requirements 3.1**
   */
  @Get('global/:id')
  @Permission('service:quality-prompt:global:view')
  @RateLimit({ limit: 50, window: 60 })
  @Cache({ key: 'quality-prompts:global:detail', ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  getGlobalPromptById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.qualityPromptService.getGlobalPromptById(id, user.sub);
  }

  /**
   * 创建全局Prompt
   * **Validates: Requirements 3.1, 3.2**
   */
  @Post('global')
  @Permission('service:quality-prompt:global:create')
  @AntiShake(1000)
  @Idempotent({ mode: 'active', ttl: 300 })
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ['quality-prompts:global:*', 'quality-prompt:*'] })
  createGlobalPrompt(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SaveGlobalPromptDto,
    @Req() req: Request,
  ) {
    const userName = user.username || 'Unknown';
    const requestIp = req.ip || req.socket.remoteAddress;
    return this.qualityPromptService.createGlobalPrompt(
      dto,
      user.sub,
      userName,
      requestIp,
    );
  }

  /**
   * 更新全局Prompt
   * **Validates: Requirements 3.3**
   */
  @Put('global/:id')
  @Permission('service:quality-prompt:global:update')
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ['quality-prompts:global:*', 'quality-prompt:*'] })
  updateGlobalPrompt(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: SaveGlobalPromptDto,
    @Req() req: Request,
  ) {
    const userName = user.username || 'Unknown';
    const requestIp = req.ip || req.socket.remoteAddress;
    return this.qualityPromptService.updateGlobalPrompt(
      id,
      dto,
      user.sub,
      userName,
      requestIp,
    );
  }

  /**
   * 删除全局Prompt
   * **Validates: Requirements 3.4, 3.5**
   */
  @Delete('global/:id')
  @Permission('service:quality-prompt:global:delete')
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ['quality-prompts:global:*', 'quality-prompt:*'] })
  deleteGlobalPrompt(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userName = user.username || 'Unknown';
    const requestIp = req.ip || req.socket.remoteAddress;
    return this.qualityPromptService.deleteGlobalPrompt(
      id,
      user.sub,
      userName,
      undefined,
      requestIp,
    );
  }

  /**
   * 启用全局Prompt
   * **Validates: Requirements 3.6, 3.7**
   */
  @Patch('global/:id/enable')
  @Permission('service:quality-prompt:global:update')
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ['quality-prompts:global:*', 'quality-prompt:*'] })
  enableGlobalPrompt(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userName = user.username || 'Unknown';
    const requestIp = req.ip || req.socket.remoteAddress;
    return this.qualityPromptService.toggleGlobalPromptStatus(
      id,
      1,
      user.sub,
      userName,
      requestIp,
    );
  }

  /**
   * 禁用全局Prompt
   * **Validates: Requirements 3.6, 3.7**
   */
  @Patch('global/:id/disable')
  @Permission('service:quality-prompt:global:update')
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ['quality-prompts:global:*', 'quality-prompt:*'] })
  disableGlobalPrompt(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userName = user.username || 'Unknown';
    const requestIp = req.ip || req.socket.remoteAddress;
    return this.qualityPromptService.toggleGlobalPromptStatus(
      id,
      0,
      user.sub,
      userName,
      requestIp,
    );
  }

  /**
   * 获取全局Prompt版本历史
   * **Validates: Requirements 6.3, 6.4**
   */
  @Get('global/:id/versions')
  @Permission('service:quality-prompt:global:view')
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: 'quality-prompts:global:versions', ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  getGlobalPromptVersions(@Param('id') id: string) {
    return this.versionManagerService.getVersionHistory(id, 'global');
  }

  /**
   * 回滚全局Prompt到指定版本
   * **Validates: Requirements 6.5, 6.6**
   */
  @Post('global/:id/rollback')
  @Permission('service:quality-prompt:global:update')
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ['quality-prompts:global:*', 'quality-prompt:*'] })
  rollbackGlobalPrompt(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body('version') version: number,
  ) {
    const userName = user.username || 'Unknown';
    return this.versionManagerService.rollbackToVersion(
      id,
      version,
      'global',
      user.sub,
      userName,
    );
  }

  /**
   * 导出全局Prompt
   * **Validates: Requirements 9.1, 9.2**
   */
  @Get('global/export')
  @Permission('service:quality-prompt:global:export')
  @RateLimit({ limit: 10, window: 60 })
  @QueryOptimize({ slowQueryThreshold: 500, timeout: 10000 })
  async exportGlobalPrompts(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryPromptsDto,
    @Res() res: Response,
  ) {
    const buffer = await this.qualityPromptService.exportGlobalPrompts(query, user.sub);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=global_prompts_${Date.now()}.xlsx`);
    res.end(buffer);
  }

  /**
   * 导入全局Prompt
   * **Validates: Requirements 9.3, 9.4, 9.5**
   */
  @Post('global/import')
  @Permission('service:quality-prompt:global:import')
  @AntiShake(2000)
  @RateLimit({ limit: 5, window: 60 })
  @CacheEvict({ keys: ['quality-prompts:global:*', 'quality-prompt:*'] })
  @UseInterceptors(FileInterceptor('file'))
  async importGlobalPrompts(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const userName = user.username || 'Unknown';
    const requestIp = req.ip || req.socket.remoteAddress;
    return this.qualityPromptService.importGlobalPrompts(file, user.sub, userName, requestIp);
  }

  // ==================== 部门Prompt管理 (11个端点) ====================

  /**
   * 查询部门Prompt列表
   * **Validates: Requirements 4.8, 23.7**
   */
  @Get('department')
  @Permission('service:quality-prompt:department:list')
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: 'quality-prompts:department', ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 1000, timeout: 5000 })
  queryDepartmentPrompts(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryPromptsDto,
  ) {
    return this.qualityPromptService.queryDepartmentPrompts(query, user.sub);
  }

  /**
   * 获取部门Prompt详情
   * **Validates: Requirements 4.1**
   */
  @Get('department/:id')
  @Permission('service:quality-prompt:department:view')
  @RateLimit({ limit: 50, window: 60 })
  @Cache({ key: 'quality-prompts:department:detail', ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  getDepartmentPromptById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.qualityPromptService.getDepartmentPromptById(id, user.sub);
  }

  /**
   * 创建部门Prompt
   * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
   */
  @Post('department')
  @Permission('service:quality-prompt:department:create')
  @AntiShake(1000)
  @Idempotent({ mode: 'active', ttl: 300 })
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ['quality-prompts:department:*', 'quality-prompt:*'] })
  createDepartmentPrompt(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SaveDepartmentPromptDto,
    @Req() req: Request,
  ) {
    const userName = user.username || 'Unknown';
    const requestIp = req.ip || req.socket.remoteAddress;
    return this.qualityPromptService.createDepartmentPrompt(
      dto,
      user.sub,
      userName,
      requestIp,
    );
  }

  /**
   * 更新部门Prompt
   * **Validates: Requirements 4.5, 4.6**
   */
  @Put('department/:id')
  @Permission('service:quality-prompt:department:update')
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ['quality-prompts:department:*', 'quality-prompt:*'] })
  updateDepartmentPrompt(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: SaveDepartmentPromptDto,
    @Req() req: Request,
  ) {
    const userName = user.username || 'Unknown';
    const requestIp = req.ip || req.socket.remoteAddress;
    return this.qualityPromptService.updateDepartmentPrompt(
      id,
      dto,
      user.sub,
      userName,
      requestIp,
    );
  }

  /**
   * 删除部门Prompt
   * **Validates: Requirements 4.7**
   */
  @Delete('department/:id')
  @Permission('service:quality-prompt:department:delete')
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ['quality-prompts:department:*', 'quality-prompt:*'] })
  deleteDepartmentPrompt(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userName = user.username || 'Unknown';
    const requestIp = req.ip || req.socket.remoteAddress;
    return this.qualityPromptService.deleteDepartmentPrompt(
      id,
      user.sub,
      userName,
      undefined,
      requestIp,
    );
  }

  /**
   * 启用部门Prompt
   * **Validates: Requirements 4.6**
   */
  @Patch('department/:id/enable')
  @Permission('service:quality-prompt:department:update')
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ['quality-prompts:department:*', 'quality-prompt:*'] })
  enableDepartmentPrompt(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userName = user.username || 'Unknown';
    const requestIp = req.ip || req.socket.remoteAddress;
    return this.qualityPromptService.toggleDepartmentPromptStatus(
      id,
      1,
      user.sub,
      userName,
      requestIp,
    );
  }

  /**
   * 禁用部门Prompt
   * **Validates: Requirements 4.6**
   */
  @Patch('department/:id/disable')
  @Permission('service:quality-prompt:department:update')
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ['quality-prompts:department:*', 'quality-prompt:*'] })
  disableDepartmentPrompt(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userName = user.username || 'Unknown';
    const requestIp = req.ip || req.socket.remoteAddress;
    return this.qualityPromptService.toggleDepartmentPromptStatus(
      id,
      0,
      user.sub,
      userName,
      requestIp,
    );
  }

  /**
   * 获取部门Prompt版本历史
   * **Validates: Requirements 6.3, 6.4**
   */
  @Get('department/:id/versions')
  @Permission('service:quality-prompt:department:view')
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: 'quality-prompts:department:versions', ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  getDepartmentPromptVersions(@Param('id') id: string) {
    return this.versionManagerService.getVersionHistory(id, 'department');
  }

  /**
   * 回滚部门Prompt到指定版本
   * **Validates: Requirements 6.5, 6.6**
   */
  @Post('department/:id/rollback')
  @Permission('service:quality-prompt:department:update')
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ['quality-prompts:department:*', 'quality-prompt:*'] })
  rollbackDepartmentPrompt(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body('version') version: number,
  ) {
    const userName = user.username || 'Unknown';
    return this.versionManagerService.rollbackToVersion(
      id,
      version,
      'department',
      user.sub,
      userName,
    );
  }

  /**
   * 导出部门Prompt
   * **Validates: Requirements 9.1, 9.2**
   */
  @Get('department/export')
  @Permission('service:quality-prompt:department:export')
  @RateLimit({ limit: 10, window: 60 })
  @QueryOptimize({ slowQueryThreshold: 500, timeout: 10000 })
  async exportDepartmentPrompts(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryPromptsDto,
    @Res() res: Response,
  ) {
    const buffer = await this.qualityPromptService.exportDepartmentPrompts(query, user.sub);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=department_prompts_${Date.now()}.xlsx`);
    res.end(buffer);
  }

  /**
   * 导入部门Prompt
   * **Validates: Requirements 9.3, 9.4, 9.5**
   */
  @Post('department/import')
  @Permission('service:quality-prompt:department:import')
  @AntiShake(2000)
  @RateLimit({ limit: 5, window: 60 })
  @CacheEvict({ keys: ['quality-prompts:department:*', 'quality-prompt:*'] })
  @UseInterceptors(FileInterceptor('file'))
  async importDepartmentPrompts(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const userName = user.username || 'Unknown';
    const requestIp = req.ip || req.socket.remoteAddress;
    return this.qualityPromptService.importDepartmentPrompts(file, user.sub, userName, requestIp);
  }

  // ==================== 模板库管理 (7个端点) ====================

  /**
   * 查询模板列表
   * **Validates: Requirements 8.1, 8.2, 8.6**
   */
  @Get('templates')
  @Permission('service:quality-prompt:template:list')
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: 'quality-prompts:templates', ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  queryTemplates(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: { category?: string; industry?: string; keyword?: string },
  ) {
    return this.templateLibraryService.queryTemplates(user.sub, query);
  }

  /**
   * 获取模板详情
   * **Validates: Requirements 8.3**
   */
  @Get('templates/:id')
  @Permission('service:quality-prompt:template:view')
  @RateLimit({ limit: 50, window: 60 })
  @Cache({ key: 'quality-prompts:template:detail', ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  getTemplateById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.templateLibraryService.getTemplateById(id, user.sub);
  }

  /**
   * 创建自定义模板
   * **Validates: Requirements 8.5, 8.7**
   */
  @Post('templates')
  @Permission('service:quality-prompt:template:create')
  @AntiShake(1000)
  @Idempotent({ mode: 'active', ttl: 300 })
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ['quality-prompts:templates:*'] })
  createTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SavePromptTemplateDto,
  ) {
    return this.templateLibraryService.createTemplate(dto, user.sub);
  }

  /**
   * 更新自定义模板
   * **Validates: Requirements 8.7**
   */
  @Put('templates/:id')
  @Permission('service:quality-prompt:template:update')
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ['quality-prompts:templates:*'] })
  updateTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: SavePromptTemplateDto,
  ) {
    return this.templateLibraryService.updateTemplate(id, dto, user.sub);
  }

  /**
   * 删除自定义模板
   * **Validates: Requirements 8.7**
   */
  @Delete('templates/:id')
  @Permission('service:quality-prompt:template:delete')
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ['quality-prompts:templates:*'] })
  deleteTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.templateLibraryService.deleteTemplate(id, user.sub);
  }

  /**
   * 获取模板分类列表
   * **Validates: Requirements 8.6**
   */
  @Get('templates/categories')
  @Permission('service:quality-prompt:template:list')
  @RateLimit({ limit: 50, window: 60 })
  @Cache({ key: 'quality-prompts:template:categories', ttl: 3600 })
  getTemplateCategories() {
    return this.templateLibraryService.getCategories();
  }

  /**
   * 获取模板行业列表
   * **Validates: Requirements 8.6**
   */
  @Get('templates/industries')
  @Permission('service:quality-prompt:template:list')
  @RateLimit({ limit: 50, window: 60 })
  @Cache({ key: 'quality-prompts:template:industries', ttl: 3600 })
  getTemplateIndustries() {
    return this.templateLibraryService.getIndustries();
  }

  // ==================== 版本管理 (3个端点) ====================

  /**
   * 获取Prompt版本历史（通用）
   * **Validates: Requirements 6.3, 6.4**
   */
  @Get(':id/versions')
  @Permission('service:quality-prompt:version:list')
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: 'quality-prompts:versions', ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  getVersionHistory(
    @Param('id') id: string,
    @Query('type') type: 'global' | 'department',
  ) {
    return this.versionManagerService.getVersionHistory(id, type);
  }

  /**
   * 比较两个版本的差异
   * **Validates: Requirements 6.4**
   */
  @Get(':id/versions/:versionId/diff')
  @Permission('service:quality-prompt:version:view')
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: 'quality-prompts:version:diff', ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 300, timeout: 5000 })
  compareVersions(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Query('fromVersion') fromVersion: number,
    @Query('toVersion') toVersion: number,
    @Query('type') type: 'global' | 'department',
  ) {
    return this.versionManagerService.compareVersions(
      id,
      fromVersion,
      toVersion,
      type,
    );
  }

  /**
   * 回滚到指定版本（通用）
   * **Validates: Requirements 6.5, 6.6**
   */
  @Post(':id/versions/:versionId/rollback')
  @Permission('service:quality-prompt:version:rollback')
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ['quality-prompts:*', 'quality-prompt:*'] })
  rollbackToVersion(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Query('type') type: 'global' | 'department',
  ) {
    const userName = user.username || 'Unknown';
    const version = parseInt(versionId, 10);
    return this.versionManagerService.rollbackToVersion(
      id,
      version,
      type,
      user.sub,
      userName,
    );
  }

  // ==================== 批量操作 (2个端点) ====================

  /**
   * 批量启用Prompt
   * **Validates: Requirements 9.6, 9.7**
   */
  @Post('batch-enable')
  @Permission('service:quality-prompt:batch:update')
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ['quality-prompts:*', 'quality-prompt:*'] })
  batchEnablePrompts(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: BatchPromptOperationDto,
    @Query('type') type: 'global' | 'department',
    @Req() req: Request,
  ) {
    const userName = user.username || 'Unknown';
    const requestIp = req.ip || req.socket.remoteAddress;
    return this.qualityPromptService.batchEnablePrompts(
      dto,
      type,
      user.sub,
      userName,
      requestIp,
    );
  }

  /**
   * 批量禁用Prompt
   * **Validates: Requirements 9.6, 9.7**
   */
  @Post('batch-disable')
  @Permission('service:quality-prompt:batch:update')
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ['quality-prompts:*', 'quality-prompt:*'] })
  batchDisablePrompts(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: BatchPromptOperationDto,
    @Query('type') type: 'global' | 'department',
    @Req() req: Request,
  ) {
    const userName = user.username || 'Unknown';
    const requestIp = req.ip || req.socket.remoteAddress;
    return this.qualityPromptService.batchDisablePrompts(
      dto,
      type,
      user.sub,
      userName,
      requestIp,
    );
  }

  // ==================== 预览功能 (1个端点) ====================

  /**
   * 预览Prompt质检效果
   * 执行测试质检但不持久化结果
   * **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7**
   */
  @Post('preview')
  @Permission('service:quality-prompt:preview')
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @QueryOptimize({ slowQueryThreshold: 500, timeout: 5000 })
  async previewPrompt(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: PreviewPromptDto,
  ) {
    // 解析Prompt内容为临时的Prompt对象
    const tempPrompt = {
      id: 'preview-temp',
      name: 'Preview Prompt',
      content: dto.content,
      source: 'global' as const,
    };

    // 使用QualityInspectionHelperService执行质检
    const violations = this.qualityInspectionHelperService.checkPromptViolations(
      dto.test_conversation,
      {
        globalPrompts: [tempPrompt],
        departmentPrompts: [],
      },
    );

    // 计算质检分数 (基础分100分,每个违规扣除相应分数)
    const baseScore = 100;
    const totalDeduction = violations.reduce((sum, v) => sum + v.deduction, 0);
    const score = Math.max(0, baseScore - totalDeduction);

    // 生成建议
    const suggestions = this.qualityInspectionHelperService.generatePromptSuggestions(violations);

    // 返回预览结果
    return {
      score,
      violations: violations.map(v => ({
        source: v.source,
        rule: v.rule,
        deduction: v.deduction,
        promptId: v.promptId,
        promptName: v.promptName,
      })),
      suggestions,
      summary: {
        totalViolations: violations.length,
        totalDeduction,
        passed: score >= 60, // 60分及格
      },
    };
  }

  // ==================== 审计日志 (2个端点) ====================

  /**
   * 查询审计日志
   * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 23.7**
   */
  @Get('audit-logs')
  @Permission('service:quality-prompt:audit:list')
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: 'quality-prompts:audit-logs', ttl: 60 })
  @QueryOptimize({ slowQueryThreshold: 1000, timeout: 10000 })
  queryAuditLogs(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryAuditLogsDto,
  ) {
    return this.qualityPromptService.queryAuditLogs(query, user.sub);
  }

  /**
   * 导出审计日志
   * **Validates: Requirements 11.6, 11.7**
   */
  @Get('audit-logs/export')
  @Permission('service:quality-prompt:audit:export')
  @RateLimit({ limit: 5, window: 60 })
  @QueryOptimize({ slowQueryThreshold: 1000, timeout: 30000 })
  async exportAuditLogs(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryAuditLogsDto,
    @Res() res: Response,
  ) {
    const csvContent = await this.qualityPromptService.exportAuditLogs(query, user.sub);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${Date.now()}.csv`);
    res.end('\uFEFF' + csvContent); // Add BOM for Excel UTF-8 support
  }
}
