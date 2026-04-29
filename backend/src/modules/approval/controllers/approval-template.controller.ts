import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../../../common/current-user.decorator';
import { Permission } from '../../../common/permission.decorator';
import { AntiShake } from '../../../common/decorators/antishake.decorator';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';
import {
  RateLimit,
  RateLimitType,
} from '../../../common/decorators/rate-limiter.decorator';
import { SaveApprovalTemplateDto } from '../dto/save-approval-template.dto';
import { QueryApprovalTemplatesDto } from '../dto/query-approval-templates.dto';
import { ApprovalTemplateService } from '../services/approval-template.service';

@ApiTags('审批模板管理')
@ApiBearerAuth()
@Controller('approval/templates')
export class ApprovalTemplateController {
  constructor(private readonly approvalTemplateService: ApprovalTemplateService) {}

  @Get()
  @ApiOperation({
    summary: '获取审批模板列表',
    description: '查询审批模板列表，支持分页、筛选和搜索',
  })
  @ApiResponse({ status: 200, description: '成功返回审批模板列表' })
  @ApiQuery({ name: 'type', required: false, description: '模板类型筛选' })
  @ApiQuery({ name: 'status', required: false, description: '模板状态筛选', enum: ['enabled', 'disabled'] })
  @ApiQuery({ name: 'keyword', required: false, description: '关键词搜索' })
  @ApiQuery({ name: 'page', required: false, description: '页码', type: Number })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量', type: Number })
  @Permission('approval:template:list')
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  listTemplates(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryApprovalTemplatesDto,
  ) {
    return this.approvalTemplateService.listTemplates(user?.sub, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: '获取审批模板详情',
    description: '根据ID获取审批模板的详细配置信息',
  })
  @ApiParam({ name: 'id', description: '模板ID' })
  @ApiResponse({ status: 200, description: '成功返回审批模板详情' })
  @ApiResponse({ status: 404, description: '审批模板不存在' })
  @Permission('approval:template:detail')
  @RateLimit({ type: RateLimitType.USER, limit: 50, window: 60 })
  getTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.approvalTemplateService.getTemplate(user?.sub, id);
  }

  @Post()
  @ApiOperation({
    summary: '创建审批模板',
    description: '创建新的审批流程模板，包括表单配置和工作流配置',
  })
  @ApiResponse({ status: 201, description: '审批模板创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误或模板配置验证失败' })
  @Permission('approval:template:create')
  @AntiShake(1000)
  @Idempotent({ mode: 'active', ttl: 300 })
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  createTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SaveApprovalTemplateDto,
  ) {
    return this.approvalTemplateService.createTemplate(user?.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '更新审批模板',
    description: '更新现有审批模板的配置，会验证是否有活跃的审批实例使用此模板',
  })
  @ApiParam({ name: 'id', description: '模板ID' })
  @ApiResponse({ status: 200, description: '审批模板更新成功' })
  @ApiResponse({ status: 400, description: '请求参数错误或模板正在使用中' })
  @ApiResponse({ status: 404, description: '审批模板不存在' })
  @Permission('approval:template:update')
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  updateTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: SaveApprovalTemplateDto,
  ) {
    return this.approvalTemplateService.updateTemplate(user?.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '删除审批模板',
    description: '删除审批模板，会检查是否有活跃的审批实例使用此模板',
  })
  @ApiParam({ name: 'id', description: '模板ID' })
  @ApiResponse({ status: 200, description: '审批模板删除成功' })
  @ApiResponse({ status: 400, description: '模板正在使用中，无法删除' })
  @ApiResponse({ status: 404, description: '审批模板不存在' })
  @Permission('approval:template:delete')
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  deleteTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.approvalTemplateService.deleteTemplate(user?.sub, id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: '启用/禁用审批模板',
    description: '切换审批模板的启用状态，禁用时会检查是否有活跃的审批实例',
  })
  @ApiParam({ name: 'id', description: '模板ID' })
  @ApiResponse({ status: 200, description: '模板状态更新成功' })
  @ApiResponse({ status: 400, description: '模板正在使用中，无法禁用' })
  @ApiResponse({ status: 404, description: '审批模板不存在' })
  @Permission('approval:template:update')
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  toggleTemplateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { status: 'enabled' | 'disabled' },
  ) {
    return this.approvalTemplateService.toggleTemplateStatus(user?.sub, id, body.status);
  }

  @Post(':id/copy')
  @ApiOperation({
    summary: '复制审批模板',
    description: '复制现有审批模板创建新模板，副本默认为禁用状态',
  })
  @ApiParam({ name: 'id', description: '源模板ID' })
  @ApiResponse({ status: 201, description: '模板复制成功' })
  @ApiResponse({ status: 404, description: '源模板不存在' })
  @Permission('approval:template:create')
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  copyTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.approvalTemplateService.copyTemplate(user?.sub, id);
  }

  @Post(':id/validate')
  @ApiOperation({
    summary: '验证模板配置',
    description: '验证审批模板的表单配置和工作流配置是否正确',
  })
  @ApiParam({ name: 'id', description: '模板ID' })
  @ApiResponse({ status: 200, description: '验证结果' })
  @ApiResponse({ status: 404, description: '审批模板不存在' })
  @Permission('approval:template:detail')
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  async validateTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    const template = await this.approvalTemplateService.getTemplate(user?.sub, id);

    const formValidation = this.approvalTemplateService.validateFormConfig(template.formFields || []);
    const workflowValidation = this.approvalTemplateService.validateWorkflowConfig(template.nodes);

    return {
      isValid: formValidation.isValid && workflowValidation.isValid,
      formValidation,
      workflowValidation,
    };
  }

  @Post('validate-config')
  @ApiOperation({
    summary: '验证模板配置（不保存）',
    description: '验证提交的模板配置是否正确，用于创建/更新前的预检查',
  })
  @ApiResponse({ status: 200, description: '验证结果' })
  @Permission('approval:template:create')
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  validateTemplateConfig(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SaveApprovalTemplateDto,
  ) {
    const formValidation = this.approvalTemplateService.validateFormConfig(dto.formFields || []);
    const workflowValidation = this.approvalTemplateService.validateWorkflowConfig(dto.nodes);

    return {
      isValid: formValidation.isValid && workflowValidation.isValid,
      formValidation,
      workflowValidation,
    };
  }
}
