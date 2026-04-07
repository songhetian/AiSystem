import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ScopeService } from '../../../common/services/scope.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueryKnowledgeArticlesDto } from '../dto/query-knowledge-articles.dto';
import { QueryKnowledgeCategoriesDto } from '../dto/query-knowledge-categories.dto';
import { QueryKnowledgeTagsDto } from '../dto/query-knowledge-tags.dto';
import { SaveKnowledgeTagDto } from '../dto/save-knowledge-tag.dto';
import { SaveKnowledgeArticleDto } from '../dto/save-knowledge-article.dto';
import { SaveKnowledgeCategoryDto } from '../dto/save-knowledge-category.dto';

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService
  ) {}

  async listArticles(userId: string, query: QueryKnowledgeArticlesDto) {
    const scope = await this.scopeService.resolveAccess(userId);

    return (this.prisma as any).knowledge_article.findMany({
      where: this.scopeService.applyScope(
        scope,
        {
          is_deleted: 0,
          ...(query.status ? { status: query.status } : {}),
          ...(query.category_id ? { category_id: query.category_id } : {}),
          ...(query.source_type ? { source_type: query.source_type } : {}),
          ...(query.keyword
            ? {
                OR: [
                  { title: { contains: query.keyword } },
                  { content: { contains: query.keyword } },
                  { keyword: { contains: query.keyword } }
                ]
              }
            : {})
        },
        { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
      ),
      orderBy: { update_time: 'desc' }
    });
  }

  async getArticle(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const article = await (this.prisma as any).knowledge_article.findFirst({
      where: this.scopeService.applyScope(
        scope,
        { id, is_deleted: 0 },
        { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
      )
    });

    if (!article) {
      throw new NotFoundException('知识库文章不存在');
    }

    return article;
  }

  async createArticle(userId: string, dto: SaveKnowledgeArticleDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const author = await this.prisma.sys_user.findUnique({ where: { id: userId } });
    const resolved = this.resolveWriteScope(scope, dto.platform_id, dto.dept_id, dto.shop_id);
    const category = await this.resolveCategory(scope, dto.category_id, resolved);

    return (this.prisma as any).knowledge_article.create({
      data: {
        title: dto.title,
        content: dto.content,
        category_id: category?.id,
        category_name: category?.category_name ?? dto.category_name,
        status: dto.status ?? 'published',
        author_id: userId,
        author_name: author?.name ?? author?.username ?? userId,
        source_type: dto.source_type,
        source_ref: dto.source_ref,
        keyword: dto.keyword,
        platform_id: resolved.platform_id,
        dept_id: resolved.dept_id,
        shop_id: resolved.shop_id,
        published_at: dto.status === 'draft' ? null : new Date()
      }
    });
  }

  async updateArticle(userId: string, id: string, dto: SaveKnowledgeArticleDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await (this.prisma as any).knowledge_article.findFirst({
      where: this.scopeService.applyScope(
        scope,
        { id, is_deleted: 0 },
        { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
      )
    });

    if (!current) {
      throw new NotFoundException('知识库文章不存在');
    }

    if (!scope.isSuperAdmin && current.author_id && current.author_id !== userId) {
      throw new ForbiddenException('仅作者或管理员可编辑文章');
    }

    const resolved = this.resolveWriteScope(
      scope,
      dto.platform_id ?? current.platform_id,
      dto.dept_id ?? current.dept_id,
      dto.shop_id ?? current.shop_id
    );
    const category = await this.resolveCategory(scope, dto.category_id, resolved);

    return (this.prisma as any).knowledge_article.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        category_id: dto.category_id === undefined ? current.category_id : category?.id ?? null,
        category_name: dto.category_id === undefined ? dto.category_name ?? current.category_name : category?.category_name ?? null,
        status: dto.status ?? current.status,
        source_type: dto.source_type ?? current.source_type,
        source_ref: dto.source_ref ?? current.source_ref,
        keyword: dto.keyword ?? current.keyword,
        platform_id: resolved.platform_id,
        dept_id: resolved.dept_id,
        shop_id: resolved.shop_id,
        published_at: dto.status === 'draft' ? current.published_at : new Date()
      }
    });
  }

  async listCategories(userId: string, query: QueryKnowledgeCategoriesDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const categories = await (this.prisma as any).knowledge_category.findMany({
      where: this.scopeService.applyScope(
        scope,
        {
          is_deleted: 0,
          ...(query.enabled !== undefined ? { enabled: Number(query.enabled) } : {}),
          ...(query.keyword
            ? {
                OR: [
                  { category_name: { contains: query.keyword } },
                  { category_code: { contains: query.keyword } }
                ]
              }
            : {})
        },
        { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
      ),
      orderBy: [{ level: 'asc' }, { sort: 'asc' }, { create_time: 'asc' }]
    });

    return this.buildCategoryTree(categories);
  }

  async createCategory(userId: string, dto: SaveKnowledgeCategoryDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const resolved = this.resolveWriteScope(scope, dto.platform_id, dto.dept_id, dto.shop_id);
    const parent = await this.resolveParentCategory(scope, dto.parent_id, resolved);
    const level = parent ? parent.level + 1 : dto.level ?? 1;

    if (level > 3) {
      throw new BadRequestException('知识库分类最多支持三级');
    }

    return (this.prisma as any).knowledge_category.create({
      data: {
        category_name: dto.category_name,
        category_code: dto.category_code,
        parent_id: parent?.id,
        level,
        sort: dto.sort ?? 0,
        enabled: dto.enabled ?? 1,
        description: dto.description,
        platform_id: resolved.platform_id,
        dept_id: resolved.dept_id,
        shop_id: resolved.shop_id
      }
    });
  }

  async updateCategory(userId: string, id: string, dto: SaveKnowledgeCategoryDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await (this.prisma as any).knowledge_category.findFirst({
      where: this.scopeService.applyScope(
        scope,
        { id, is_deleted: 0 },
        { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
      )
    });

    if (!current) {
      throw new NotFoundException('知识库分类不存在');
    }

    const resolved = this.resolveWriteScope(
      scope,
      dto.platform_id ?? current.platform_id,
      dto.dept_id ?? current.dept_id,
      dto.shop_id ?? current.shop_id
    );
    const parent = await this.resolveParentCategory(scope, dto.parent_id, resolved, id);
    const level = parent ? parent.level + 1 : dto.level ?? 1;

    if (level > 3) {
      throw new BadRequestException('知识库分类最多支持三级');
    }

    return (this.prisma as any).knowledge_category.update({
      where: { id },
      data: {
        category_name: dto.category_name,
        category_code: dto.category_code,
        parent_id: dto.parent_id === undefined ? current.parent_id : parent?.id ?? null,
        level,
        sort: dto.sort ?? current.sort,
        enabled: dto.enabled ?? current.enabled,
        description: dto.description ?? current.description,
        platform_id: resolved.platform_id,
        dept_id: resolved.dept_id,
        shop_id: resolved.shop_id
      }
    });
  }

  async toggleCategory(userId: string, id: string, enabled: number) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await (this.prisma as any).knowledge_category.findFirst({
      where: this.scopeService.applyScope(
        scope,
        { id, is_deleted: 0 },
        { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
      )
    });

    if (!current) {
      throw new NotFoundException('知识库分类不存在');
    }

    return (this.prisma as any).knowledge_category.update({
      where: { id },
      data: { enabled, update_time: new Date() }
    });
  }

  async listFaqCandidates(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const analyses = await (this.prisma as any).service_session_analysis.findMany({
      where: this.scopeService.applyScope(
        scope,
        { is_deleted: 0 },
        { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
      ),
      orderBy: { analyzed_at: 'desc' }
    });

    const articleDelegate = (this.prisma as any).knowledge_article;
    const existingArticles = await articleDelegate.findMany({
      where: this.scopeService.applyScope(
        scope,
        { is_deleted: 0, source_type: 'service_faq' },
        { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
      )
    });
    const existingKeywords = new Set(existingArticles.map((item: any) => item.keyword).filter(Boolean));

    const candidateMap = new Map<string, any>();

    for (const analysis of analyses) {
      const faqs = ((analysis.top_faqs as Array<{ question?: string; count?: number }>) ?? []).filter((item) => item.question);
      for (const faq of faqs) {
        const question = String(faq.question).trim();
        if (!question) {
          continue;
        }

        const existing = candidateMap.get(question);
        const payload = {
          question,
          count: Number(faq.count ?? 0),
          platform_id: analysis.platform_id,
          dept_id: analysis.dept_id,
          shop_id: analysis.shop_id,
          latest_analyzed_at: analysis.analyzed_at,
          source_ref: analysis.session_id,
          already_archived: existingKeywords.has(question)
        };

        if (!existing) {
          candidateMap.set(question, payload);
          continue;
        }

        existing.count += payload.count;
        if (new Date(payload.latest_analyzed_at).getTime() > new Date(existing.latest_analyzed_at).getTime()) {
          existing.latest_analyzed_at = payload.latest_analyzed_at;
          existing.source_ref = payload.source_ref;
          existing.platform_id = payload.platform_id;
          existing.dept_id = payload.dept_id;
          existing.shop_id = payload.shop_id;
        }
      }
    }

    return [...candidateMap.values()].sort((a, b) => b.count - a.count).slice(0, 20);
  }

  async listTags(userId: string, query: QueryKnowledgeTagsDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    return (this.prisma as any).knowledge_tag.findMany({
      where: this.scopeService.applyScope(
        scope,
        {
          ...(query.enabled === '1' ? { is_deleted: 0 } : {}),
          ...(query.enabled === '0' ? { is_deleted: 1 } : {}),
          ...(query.source_type ? { source_type: query.source_type } : {}),
          ...(query.keyword
            ? {
                OR: [{ tag_name: { contains: query.keyword } }, { tag_code: { contains: query.keyword } }]
              }
            : {})
        },
        { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
      ),
      orderBy: [{ sort: 'asc' }, { create_time: 'asc' }]
    });
  }

  async getTagImpact(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const tag = await (this.prisma as any).knowledge_tag.findFirst({
      where: this.scopeService.applyScope(
        scope,
        { id },
        { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
      )
    });

    if (!tag) {
      throw new NotFoundException('知识标签不存在');
    }

    const sessionWhere = this.scopeService.applyScope(
      scope,
      { is_deleted: 0 },
      { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
    );
    const articleWhere = this.scopeService.applyScope(
      scope,
      { is_deleted: 0 },
      { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
    );

    const [sessions, articles] = await Promise.all([
      (this.prisma as any).service_session.findMany({
        where: sessionWhere,
        select: { id: true, session_no: true, tags: true }
      }),
      (this.prisma as any).knowledge_article.findMany({
        where: articleWhere,
        select: { id: true, title: true, keyword: true, source_type: true }
      })
    ]);

    const linkedSessions = sessions.filter((item: any) => this.normalizeJsonTags(item.tags).includes(tag.tag_name));
    const linkedArticles = articles.filter((item: any) => this.normalizeKeywordTags(item.keyword).includes(tag.tag_name));

    return {
      tag: {
        id: tag.id,
        tag_name: tag.tag_name,
        is_deleted: tag.is_deleted
      },
      session_count: linkedSessions.length,
      article_count: linkedArticles.length,
      sample_sessions: linkedSessions.slice(0, 5).map((item: any) => ({
        id: item.id,
        session_no: item.session_no
      })),
      sample_articles: linkedArticles.slice(0, 5).map((item: any) => ({
        id: item.id,
        title: item.title,
        source_type: item.source_type
      }))
    };
  }

  async createTag(userId: string, dto: SaveKnowledgeTagDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const resolved = this.resolveWriteScope(scope, dto.platform_id, dto.dept_id, dto.shop_id);

    return (this.prisma as any).knowledge_tag.create({
      data: {
        tag_name: dto.tag_name,
        tag_code: dto.tag_code || this.buildTagCode(dto.tag_name),
        source_type: dto.source_type,
        color: dto.color,
        sort: dto.sort ?? 0,
        platform_id: resolved.platform_id,
        dept_id: resolved.dept_id,
        shop_id: resolved.shop_id,
        created_by: userId
      }
    });
  }

  async updateTag(userId: string, id: string, dto: SaveKnowledgeTagDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await (this.prisma as any).knowledge_tag.findFirst({
      where: this.scopeService.applyScope(
        scope,
        { id, is_deleted: 0 },
        { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
      )
    });

    if (!current) {
      throw new NotFoundException('知识标签不存在');
    }

    const resolved = this.resolveWriteScope(
      scope,
      dto.platform_id ?? current.platform_id,
      dto.dept_id ?? current.dept_id,
      dto.shop_id ?? current.shop_id
    );

    return (this.prisma as any).knowledge_tag.update({
      where: { id },
      data: {
        tag_name: dto.tag_name,
        tag_code: dto.tag_code || current.tag_code || this.buildTagCode(dto.tag_name),
        source_type: dto.source_type ?? current.source_type,
        color: dto.color ?? current.color,
        sort: dto.sort ?? current.sort,
        platform_id: resolved.platform_id,
        dept_id: resolved.dept_id,
        shop_id: resolved.shop_id
      }
    });
  }

  async toggleTag(userId: string, id: string, enabled: number) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await (this.prisma as any).knowledge_tag.findFirst({
      where: this.scopeService.applyScope(
        scope,
        { id },
        { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
      )
    });

    if (!current) {
      throw new NotFoundException('知识标签不存在');
    }

    return (this.prisma as any).knowledge_tag.update({
      where: { id },
      data: {
        is_deleted: enabled ? 0 : 1
      }
    });
  }

  async mergeTag(userId: string, sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      throw new BadRequestException('不能将标签合并到自己');
    }

    const scope = await this.scopeService.resolveAccess(userId);
    const [sourceTag, targetTag] = await Promise.all([
      (this.prisma as any).knowledge_tag.findFirst({
        where: this.scopeService.applyScope(
          scope,
          { id: sourceId },
          { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
        )
      }),
      (this.prisma as any).knowledge_tag.findFirst({
        where: this.scopeService.applyScope(
          scope,
          { id: targetId },
          { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
        )
      })
    ]);

    if (!sourceTag || !targetTag) {
      throw new NotFoundException('知识标签不存在');
    }

    if (
      sourceTag.platform_id !== targetTag.platform_id ||
      sourceTag.dept_id !== targetTag.dept_id ||
      (sourceTag.shop_id ?? null) !== (targetTag.shop_id ?? null)
    ) {
      throw new ForbiddenException('仅支持合并同一数据隔离范围内的标签');
    }

    const sessionWhere = this.scopeService.applyScope(
      scope,
      { is_deleted: 0 },
      { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
    );
    const articleWhere = this.scopeService.applyScope(
      scope,
      { is_deleted: 0 },
      { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
    );

    const [sessions, articles] = await Promise.all([
      (this.prisma as any).service_session.findMany({
        where: sessionWhere,
        select: { id: true, tags: true }
      }),
      (this.prisma as any).knowledge_article.findMany({
        where: articleWhere,
        select: { id: true, keyword: true }
      })
    ]);

    await this.prisma.$transaction(async (tx) => {
      for (const session of sessions) {
        const currentTags = this.normalizeJsonTags(session.tags);
        const nextTags = this.replaceTags(currentTags, sourceTag.tag_name, targetTag.tag_name);
        if (!this.sameStringArray(nextTags, currentTags)) {
          await (tx as any).service_session.update({
            where: { id: session.id },
            data: { tags: nextTags }
          });
        }
      }

      for (const article of articles) {
        const currentTags = this.normalizeKeywordTags(article.keyword);
        const nextTags = this.replaceTags(currentTags, sourceTag.tag_name, targetTag.tag_name);
        const nextKeyword = nextTags.join(', ');
        if (nextKeyword !== (article.keyword ?? '')) {
          await (tx as any).knowledge_article.update({
            where: { id: article.id },
            data: { keyword: nextKeyword || null }
          });
        }
      }

      await (tx as any).knowledge_tag.update({
        where: { id: sourceTag.id },
        data: {
          is_deleted: 1,
          update_time: new Date()
        }
      });
    });

    return {
      source_tag_id: sourceTag.id,
      source_tag_name: sourceTag.tag_name,
      target_tag_id: targetTag.id,
      target_tag_name: targetTag.tag_name
    };
  }

  private resolveWriteScope(scope: any, platformId?: string, deptId?: string, shopId?: string | null) {
    const resolvedPlatformId = platformId ?? scope.platform_id;
    const resolvedDeptId = deptId ?? scope.dept_id;
    const resolvedShopId = shopId ?? scope.shop_id ?? null;

    if (!resolvedPlatformId || !resolvedDeptId) {
      throw new ForbiddenException('写入知识库文章时必须明确平台和部门');
    }

    this.scopeService.assertPlatformAccess(scope, resolvedPlatformId);
    this.scopeService.assertDepartmentAccess(scope, resolvedDeptId);
    if (resolvedShopId) {
      this.scopeService.assertShopAccess(scope, resolvedShopId);
    }

    return {
      platform_id: resolvedPlatformId,
      dept_id: resolvedDeptId,
      shop_id: resolvedShopId
    };
  }

  private async resolveCategory(scope: any, categoryId: string | undefined, resolved: { platform_id: string; dept_id: string; shop_id: string | null }) {
    if (!categoryId) {
      return null;
    }

    const category = await (this.prisma as any).knowledge_category.findFirst({
      where: this.scopeService.applyScope(
        scope,
        { id: categoryId, is_deleted: 0, enabled: 1 },
        { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
      )
    });

    if (!category) {
      throw new NotFoundException('知识库分类不存在或不可用');
    }

    if (category.platform_id !== resolved.platform_id || category.dept_id !== resolved.dept_id || (category.shop_id ?? null) !== resolved.shop_id) {
      throw new ForbiddenException('文章和分类必须在同一数据隔离范围内');
    }

    return category;
  }

  private async resolveParentCategory(
    scope: any,
    parentId: string | undefined,
    resolved: { platform_id: string; dept_id: string; shop_id: string | null },
    currentId?: string
  ) {
    if (!parentId) {
      return null;
    }

    if (currentId && parentId === currentId) {
      throw new BadRequestException('分类不能挂到自己下面');
    }

    const parent = await (this.prisma as any).knowledge_category.findFirst({
      where: this.scopeService.applyScope(
        scope,
        { id: parentId, is_deleted: 0 },
        { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' }
      )
    });

    if (!parent) {
      throw new NotFoundException('父级分类不存在');
    }

    if (parent.platform_id !== resolved.platform_id || parent.dept_id !== resolved.dept_id || (parent.shop_id ?? null) !== resolved.shop_id) {
      throw new ForbiddenException('父级分类必须在同一数据隔离范围内');
    }

    return parent;
  }

  private buildCategoryTree(categories: any[]) {
    const nodeMap = new Map<string, any>();
    const roots: any[] = [];

    for (const category of categories) {
      nodeMap.set(category.id, { ...category, children: [] });
    }

    for (const category of nodeMap.values()) {
      if (category.parent_id && nodeMap.has(category.parent_id)) {
        nodeMap.get(category.parent_id).children.push(category);
        continue;
      }

      roots.push(category);
    }

    return roots;
  }

  private buildTagCode(tag: string) {
    return tag
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
  }

  private normalizeJsonTags(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }

    return [...new Set(value.map((item) => String(item ?? '').trim()).filter(Boolean))];
  }

  private normalizeKeywordTags(keyword: unknown) {
    if (typeof keyword !== 'string') {
      return [];
    }

    return [...new Set(keyword.split(/[;,，]/).map((item) => item.trim()).filter(Boolean))];
  }

  private replaceTags(tags: string[], sourceTag: string, targetTag: string) {
    return [...new Set(tags.map((item) => (item === sourceTag ? targetTag : item)).filter(Boolean))];
  }

  private sameStringArray(left: string[], right: string[]) {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((item, index) => item === right[index]);
  }
}
