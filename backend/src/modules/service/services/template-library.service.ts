import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScopeService } from '../../../common/services/scope.service';

/**
 * 模板库服�?
 * 负责管理Prompt模板的CRUD操作
 */
@Injectable()
export class TemplateLibraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  // Delegate methods for type-safe table access
  private get templateDelegate() {
    return this.prisma['service_quality_prompt_template' as keyof typeof this.prisma] as any;
  }

  /**
   * 初始化内置模板（系统启动时调用）
   */
  async initializeBuiltinTemplates(platformId: string) {
    const builtinTemplates = this.getBuiltinTemplates();

    for (const template of builtinTemplates) {
      const existing = await this.templateDelegate().findFirst({
        where: {
          name: template.name,
          platform_id: platformId,
          is_builtin: 1,
        },
      });

      if (!existing) {
        await this.templateDelegate().create({
          data: {
            ...template,
            platform_id: platformId,
            is_builtin: 1,
          },
        });
      }
    }
  }

  /**
   * 获取内置模板定义
   */
  private getBuiltinTemplates() {
    return [
      {
        name: '礼貌用语规范',
        content: `# 礼貌用语规范

## 基本要求
1. 使用"�?而非"�?称呼客户
2. 开场必须包含问候语�?您好"�?欢迎咨询"�?
3. 结束时必须包含感谢语�?感谢您的咨询"�?祝您生活愉快"�?

## 禁止用语
- 不得使用"不知�?�?不清�?等推诿性语言
- 不得使用"随便"�?无所�?等不负责任的表达
- 不得使用"你自己看"�?说了多少遍了"等不耐烦的语�?

## 建议用语
- 遇到问题时使用："我帮您查询一�?�?请稍等，我为您核�?
- 无法解决时使用："非常抱歉，这个问题我需要为您转接专业同事处�?`,
        category: 'politeness',
        industry: 'general',
        description: '通用礼貌用语规范模板，适用于所有客服场�?,
        sort: 1,
      },
      {
        name: '合规性检�?,
        content: `# 合规性检�?

## 法律合规
1. 不得承诺超出公司政策的退换货条件
2. 不得泄露客户个人信息
3. 不得发布虚假宣传信息

## 平台规则合规
1. 严格遵守平台交易规则
2. 不得诱导客户线下交易
3. 不得恶意差评竞争对手

## 敏感词检�?
- 禁止使用"最�?�?第一"等绝对化用语
- 禁止使用"保证"�?承诺"等过度承诺词�?
- 禁止使用涉及政治、宗教、种族歧视的敏感词`,
        category: 'compliance',
        industry: 'general',
        description: '合规性检查模板，确保客服对话符合法律法规和平台规�?,
        sort: 2,
      },
      {
        name: '流程规范',
        content: `# 流程规范

## 接待流程
1. 问候客�?
2. 了解客户需�?
3. 提供解决方案
4. 确认客户满意�?
5. 结束对话并感�?

## 响应时效
- 首次响应时间不超�?0�?
- 每次回复间隔不超�?分钟
- 如需查询信息，提前告知客户等待时�?

## 转接规则
- 超出权限范围的问题及时转�?
- 转接前向客户说明原因
- 转接后跟进处理结果`,
        category: 'process',
        industry: 'general',
        description: '客服流程规范模板，规范客服接待流程和响应时效',
        sort: 3,
      },
      {
        name: '电商售前咨询',
        content: `# 电商售前咨询

## 商品介绍
1. 准确描述商品规格、材质、尺寸等信息
2. 主动告知商品优惠活动和促销政策
3. 提供商品使用场景和搭配建�?

## 库存查询
- 及时查询商品库存情况
- 缺货时推荐替代商�?
- 告知补货时间或到货通知服务

## 价格说明
- 明确标注商品价格和运�?
- 说明优惠券使用规�?
- 解释价格差异原因`,
        category: 'pre_sales',
        industry: 'ecommerce',
        description: '电商售前咨询模板，规范商品咨询和推荐话术',
        sort: 4,
      },
      {
        name: '电商售后服务',
        content: `# 电商售后服务

## 退换货处理
1. 了解退换货原因
2. 核实订单信息和商品状�?
3. 说明退换货政策和流�?
4. 协助客户提交退换货申请
5. 跟进退换货进度

## 物流查询
- 提供物流单号和查询链�?
- 解释物流延迟原因
- 协调物流异常问题

## 投诉处理
- 耐心倾听客户诉求
- 表达歉意和理�?
- 提供合理的解决方�?
- 记录投诉内容并上报`,
        category: 'after_sales',
        industry: 'ecommerce',
        description: '电商售后服务模板，规范退换货和投诉处理流�?,
        sort: 5,
      },
      {
        name: '金融产品咨询',
        content: `# 金融产品咨询

## 产品介绍
1. 详细说明产品类型、期限、收益率等关键信�?
2. 明确告知产品风险等级
3. 说明产品适用人群和投资门�?

## 风险提示
- 必须进行风险提示�?投资有风险，入市需谨慎"
- 不得承诺保本保收�?
- 说明可能的损失情�?

## 合规要求
- 不得诱导客户购买超出风险承受能力的产�?
- 不得隐瞒产品费用和手续费
- 必须记录客户风险评估结果`,
        category: 'product_consultation',
        industry: 'finance',
        description: '金融产品咨询模板，确保金融服务合规�?,
        sort: 6,
      },
    ];
  }

  /**
   * 查询模板列表
   */
  async queryTemplates(userId: string, query: { category?: string; industry?: string; keyword?: string }) {
    const scope = await this.scopeService.resolveAccess(userId);

    const where: any = {
      platform_id: scope.platform_id,
      is_deleted: 0,
    };

    if (query.category) {
      where.category = query.category;
    }

    if (query.industry) {
      where.industry = query.industry;
    }

    if (query.keyword) {
      where.OR = [{ name: { contains: query.keyword } }, { description: { contains: query.keyword } }];
    }

    const templates = await this.templateDelegate().findMany({
      where,
      orderBy: [{ is_builtin: 'desc' }, { sort: 'asc' }, { create_time: 'desc' }],
    });

    return templates;
  }

  /**
   * 获取模板详情
   */
  async getTemplateById(id: string, userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    const template = await this.templateDelegate().findFirst({
      where: {
        id,
        platform_id: scope.platform_id,
        is_deleted: 0,
      },
    });

    if (!template) {
      throw new NotFoundException('模板不存�?);
    }

    return template;
  }

  /**
   * 创建自定义模�?
   */
  async createTemplate(
    dto: {
      name: string;
      content: string;
      category: string;
      industry?: string;
      description?: string;
    },
    userId: string,
  ) {
    const scope = await this.scopeService.resolveAccess(userId);

    // 检查名称是否重�?
    const existing = await this.templateDelegate().findFirst({
      where: {
        name: dto.name,
        platform_id: scope.platform_id,
        is_deleted: 0,
      },
    });

    if (existing) {
      throw new BadRequestException('模板名称已存�?);
    }

    const template = await this.templateDelegate().create({
      data: {
        ...dto,
        platform_id: scope.platform_id,
        is_builtin: 0,
        created_by: userId,
      },
    });

    return template;
  }

  /**
   * 更新自定义模�?
   */
  async updateTemplate(
    id: string,
    dto: {
      name?: string;
      content?: string;
      category?: string;
      industry?: string;
      description?: string;
    },
    userId: string,
  ) {
    const scope = await this.scopeService.resolveAccess(userId);

    const template = await this.templateDelegate().findFirst({
      where: {
        id,
        platform_id: scope.platform_id,
        is_deleted: 0,
      },
    });

    if (!template) {
      throw new NotFoundException('模板不存�?);
    }

    if (template.is_builtin === 1) {
      throw new BadRequestException('内置模板不允许修�?);
    }

    // 检查名称是否重复（排除自己�?
    if (dto.name && dto.name !== template.name) {
      const existing = await this.templateDelegate().findFirst({
        where: {
          name: dto.name,
          platform_id: scope.platform_id,
          is_deleted: 0,
          id: { not: id },
        },
      });

      if (existing) {
        throw new BadRequestException('模板名称已存�?);
      }
    }

    const updatedTemplate = await this.templateDelegate().update({
      where: { id },
      data: dto,
    });

    return updatedTemplate;
  }

  /**
   * 删除自定义模�?
   */
  async deleteTemplate(id: string, userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    const template = await this.templateDelegate().findFirst({
      where: {
        id,
        platform_id: scope.platform_id,
        is_deleted: 0,
      },
    });

    if (!template) {
      throw new NotFoundException('模板不存�?);
    }

    if (template.is_builtin === 1) {
      throw new BadRequestException('内置模板不允许删�?);
    }

    await this.templateDelegate().update({
      where: { id },
      data: { is_deleted: 1 },
    });

    return { success: true };
  }

  /**
   * 从现有Prompt创建模板
   */
  async createTemplateFromPrompt(
    promptData: {
      name: string;
      content: string;
      applicable_scenarios?: string;
    },
    category: string,
    industry: string | undefined,
    userId: string,
  ) {
    const scope = await this.scopeService.resolveAccess(userId);

    const template = await this.templateDelegate().create({
      data: {
        name: `${promptData.name} - 模板`,
        content: promptData.content,
        category,
        industry,
        description: promptData.applicable_scenarios || '从Prompt创建的自定义模板',
        platform_id: scope.platform_id,
        is_builtin: 0,
        created_by: userId,
      },
    });

    return template;
  }

  /**
   * 获取模板分类列表
   */
  getCategories() {
    return [
      { code: 'politeness', name: '礼貌用语' },
      { code: 'compliance', name: '合规�? },
      { code: 'process', name: '流程规范' },
      { code: 'pre_sales', name: '售前咨询' },
      { code: 'after_sales', name: '售后服务' },
      { code: 'product_consultation', name: '产品咨询' },
      { code: 'custom', name: '自定�? },
    ];
  }

  /**
   * 获取行业列表
   */
  getIndustries() {
    return [
      { code: 'general', name: '通用' },
      { code: 'ecommerce', name: '电商' },
      { code: 'finance', name: '金融' },
      { code: 'education', name: '教育' },
      { code: 'healthcare', name: '医疗' },
      { code: 'real_estate', name: '房地�? },
    ];
  }
}

