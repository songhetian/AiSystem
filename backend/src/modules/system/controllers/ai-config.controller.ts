import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { CurrentUser } from '../../../common/current-user.decorator';
import { AIConfigService } from '../../../common/services/ai-config.service';
import { UpsertAIConfigDto, ListAIConfigDto, UpdateAIConfigStatusDto } from '../dto/ai-config.dto';

@ApiTags('AI配置管理')
@ApiBearerAuth()
@Controller('system/ai-config')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AIConfigController {
  constructor(private readonly aiConfigService: AIConfigService) {}

  @Get('list')
  @ApiOperation({ summary: '获取AI配置列表' })
  async listAIConfigs(@Query() dto: ListAIConfigDto) {
    return this.aiConfigService.listAIConfigs(
      dto.platformId,
      dto.deptId,
      dto.page || 1,
      dto.pageSize || 20,
    );
  }

  @Get('detail/:id')
  @ApiOperation({ summary: '获取AI配置详情' })
  async getAIConfigDetail(@Param('id') id: string) {
    return this.aiConfigService.getAIConfigDetail(id);
  }

  @Get('current')
  @ApiOperation({ summary: '获取当前生效的AI配置' })
  async getCurrentAIConfig(
    @Query('platformId') platformId?: string,
    @Query('deptId') deptId?: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.aiConfigService.getAIConfig(platformId, deptId, shopId);
  }

  @Post('upsert')
  @ApiOperation({ summary: '创建或更新AI配置' })
  async upsertAIConfig(
    @CurrentUser('id') userId: string,
    @Body() dto: UpsertAIConfigDto,
  ) {
    return this.aiConfigService.upsertAIConfig(
      dto.scopeType,
      dto.scopeId || null,
      {
        provider: dto.provider,
        apiKey: dto.apiKey,
        apiBaseUrl: dto.apiBaseUrl,
        model: dto.model,
        maxTokens: dto.maxTokens,
        temperature: dto.temperature,
        extraConfig: dto.extraConfig,
      },
      userId,
      dto.remark,
    );
  }

  @Put('status')
  @ApiOperation({ summary: '更新AI配置状态' })
  async updateAIConfigStatus(@Body() dto: UpdateAIConfigStatusDto) {
    return this.aiConfigService.updateAIConfigStatus(dto.id, dto.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除AI配置' })
  async deleteAIConfig(@Param('id') id: string) {
    const config = await this.aiConfigService.getAIConfigDetail(id);
    if (!config) {
      throw new Error('配置不存在');
    }
    return this.aiConfigService.deleteAIConfig(config.scopeType, config.scopeId);
  }
}
