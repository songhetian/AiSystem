import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface AIConfig {
  provider: string;
  apiKey: string;
  apiBaseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  extraConfig?: any;
}

@Injectable()
export class AIConfigService {
  private readonly logger = new Logger(AIConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 获取AI配置（支持多级配置）
   * 优先级: 店铺 > 部门 > 平台 > 全局 > 环境变量
   */
  async getAIConfig(
    platformId?: string,
    deptId?: string,
    shopId?: string,
  ): Promise<AIConfig> {
    try {
      // 1. 尝试获取店铺级配置
      if (shopId) {
        const shopConfig = await this.getConfigByScope('shop', shopId);
        if (shopConfig) {
          this.logger.debug(`使用店铺级AI配置: ${shopId}`);
          return shopConfig;
        }
      }

      // 2. 尝试获取部门级配置
      if (deptId) {
        const deptConfig = await this.getConfigByScope('department', deptId);
        if (deptConfig) {
          this.logger.debug(`使用部门级AI配置: ${deptId}`);
          return deptConfig;
        }
      }

      // 3. 尝试获取平台级配置
      if (platformId) {
        const platformConfig = await this.getConfigByScope('platform', platformId);
        if (platformConfig) {
          this.logger.debug(`使用平台级AI配置: ${platformId}`);
          return platformConfig;
        }
      }

      // 4. 尝试获取全局配置
      const globalConfig = await this.getConfigByScope('global', null);
      if (globalConfig) {
        this.logger.debug('使用全局AI配置');
        return globalConfig;
      }

      // 5. 使用环境变量配置（兜底）
      this.logger.debug('使用环境变量AI配置（兜底）');
      return this.getEnvConfig();
    } catch (error) {
      this.logger.error('获取AI配置失败，使用环境变量配置', error);
      return this.getEnvConfig();
    }
  }

  /**
   * 从数据库获取指定范围的配置
   */
  private async getConfigByScope(
    scopeType: string,
    scopeId: string | null,
  ): Promise<AIConfig | null> {
    const config = await this.prisma.sys_ai_config.findFirst({
      where: {
        scope_type: scopeType,
        scope_id: scopeId,
        status: 1,
        is_deleted: 0,
      },
      orderBy: {
        priority: 'desc',
      },
    });

    if (!config) return null;

    return {
      provider: config.provider,
      apiKey: config.api_key,
      apiBaseUrl: config.api_base_url || 'https://api.openai.com/v1',
      model: config.model,
      maxTokens: config.max_tokens,
      temperature: config.temperature,
      extraConfig: config.extra_config,
    };
  }

  /**
   * 从环境变量获取配置（兜底）
   */
  private getEnvConfig(): AIConfig {
    return {
      provider: 'openai',
      apiKey: this.configService.get<string>('OPENAI_API_KEY') || '',
      apiBaseUrl:
        this.configService.get<string>('OPENAI_API_BASE') ||
        'https://api.openai.com/v1',
      model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-3.5-turbo',
      maxTokens: parseInt(
        this.configService.get<string>('OPENAI_MAX_TOKENS') || '2000',
      ),
      temperature: parseFloat(
        this.configService.get<string>('OPENAI_TEMPERATURE') || '0.7',
      ),
    };
  }

  /**
   * 创建或更新AI配置
   */
  async upsertAIConfig(
    scopeType: string,
    scopeId: string | null,
    config: Partial<AIConfig>,
    createdBy: string,
    remark?: string,
  ) {
    return this.prisma.sys_ai_config.upsert({
      where: {
        unique_scope: {
          scope_type: scopeType,
          scope_id: scopeId as string,
        },
      },
      update: {
        provider: config.provider,
        api_key: config.apiKey,
        api_base_url: config.apiBaseUrl,
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        extra_config: config.extraConfig,
        remark,
      },
      create: {
        scope_type: scopeType,
        scope_id: scopeId,
        provider: config.provider || 'openai',
        api_key: config.apiKey || '',
        api_base_url: config.apiBaseUrl,
        model: config.model || 'gpt-3.5-turbo',
        max_tokens: config.maxTokens || 2000,
        temperature: config.temperature || 0.7,
        extra_config: config.extraConfig,
        created_by: createdBy,
        remark,
      },
    });
  }

  /**
   * 删除AI配置（软删除）
   */
  async deleteAIConfig(scopeType: string, scopeId: string | null) {
    return this.prisma.sys_ai_config.updateMany({
      where: {
        scope_type: scopeType,
        scope_id: scopeId,
      },
      data: {
        is_deleted: 1,
      },
    });
  }

  /**
   * 获取AI配置列表
   */
  async listAIConfigs(
    platformId?: string,
    deptId?: string,
    page = 1,
    pageSize = 20,
  ) {
    const where: any = {
      is_deleted: 0,
    };

    // 如果指定了平台或部门，只返回相关配置
    if (platformId || deptId) {
      where.OR = [
        { scope_type: 'global' },
        ...(platformId ? [{ scope_type: 'platform', scope_id: platformId }] : []),
        ...(deptId ? [{ scope_type: 'department', scope_id: deptId }] : []),
      ];
    }

    const [total, list] = await Promise.all([
      this.prisma.sys_ai_config.count({ where }),
      this.prisma.sys_ai_config.findMany({
        where,
        orderBy: [{ scope_type: 'asc' }, { priority: 'desc' }, { create_time: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      list: list.map((item) => ({
        id: item.id,
        scopeType: item.scope_type,
        scopeId: item.scope_id,
        provider: item.provider,
        apiBaseUrl: item.api_base_url,
        model: item.model,
        maxTokens: item.max_tokens,
        temperature: item.temperature,
        priority: item.priority,
        status: item.status,
        remark: item.remark,
        createdBy: item.created_by,
        createTime: item.create_time,
        updateTime: item.update_time,
        // 不返回API Key，安全考虑
        hasApiKey: !!item.api_key && item.api_key.length > 0,
      })),
    };
  }

  /**
   * 获取单个AI配置详情
   */
  async getAIConfigDetail(id: string) {
    const config = await this.prisma.sys_ai_config.findUnique({
      where: { id, is_deleted: 0 },
    });

    if (!config) return null;

    return {
      id: config.id,
      scopeType: config.scope_type,
      scopeId: config.scope_id,
      provider: config.provider,
      apiKey: config.api_key, // 详情页返回完整API Key
      apiBaseUrl: config.api_base_url,
      model: config.model,
      maxTokens: config.max_tokens,
      temperature: config.temperature,
      extraConfig: config.extra_config,
      priority: config.priority,
      status: config.status,
      remark: config.remark,
      createdBy: config.created_by,
      createTime: config.create_time,
      updateTime: config.update_time,
    };
  }

  /**
   * 更新AI配置状态
   */
  async updateAIConfigStatus(id: string, status: number) {
    return this.prisma.sys_ai_config.update({
      where: { id },
      data: { status },
    });
  }
}
