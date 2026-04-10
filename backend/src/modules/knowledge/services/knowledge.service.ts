import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ScopeService } from '../../../common/services/scope.service';
import { VectorService } from '../../../common/services/vector.service';
import { RedisService } from '../../../common/services/redis.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueryKnowledgeArticlesDto } from '../dto/query-knowledge-articles.dto';
import { QueryKnowledgeCategoriesDto } from '../dto/query-knowledge-categories.dto';
import { QueryKnowledgeTagsDto } from '../dto/query-knowledge-tags.dto';
import { SaveKnowledgeTagDto } from '../dto/save-knowledge-tag.dto';
import { SaveKnowledgeArticleDto } from '../dto/save-knowledge-article.dto';
import { SaveKnowledgeCategoryDto } from '../dto/save-knowledge-category.dto';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly vectorService: VectorService,
    private readonly redisService: RedisService
  ) {}

  /**
   * 获取文章列表 (深度优化版：Redis 缓存 + 字段精简)
   */
  async listArticles(userId: string, query: QueryKnowledgeArticlesDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const cacheKey = `knowledge:list:${scope.platform_id}:${scope.dept_id}:${query.keyword || 'all'}:${query.category_id || 'root'}`;
    
    // 1. 尝试读取缓存 (限流保护)
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const where = this.scopeService.applyScope({
      is_deleted: 0,
      ...(query.status ? { status: query.status } : {}),
      ...(query.category_id ? { category_id: query.category_id } : {}),
      ...(query.source_type ? { source_type: query.source_type } : {}),
    }, scope, { platform: 'platform_id', department: 'dept_id', shop: 'shop_id' });

    let results: any[] = [];

    // 2. 向量检索闭环 (并发量高时由 Redis 挡住)
    if (query.keyword) {
      const vectorResults = await this.vectorService.search(query.keyword, {
        platform_id: scope.platform_id || undefined,
        dept_id: scope.dept_id || undefined,
      }, 50); // 限制返回前 50 条

      const vectorIds = vectorResults.map(r => r.id as string);
      
      results = await (this.prisma as any).knowledge_article.findMany({
        where: {
          ...where,
          OR: [
            { id: { in: vectorIds } },
            { title: { contains: query.keyword } },
            { keyword: { contains: query.keyword } }
          ]
        },
        select: { // 字段精简：列表不拉 content，节省带宽
          id: true, title: true, category_name: true, author_name: true, 
          update_time: true, status: true, keyword: true, attachment_urls: true 
        },
        orderBy: { update_time: 'desc' },
        take: 100 // 最大限制，防止 OOM
      });
    } else {
      results = await (this.prisma as any).knowledge_article.findMany({
        where,
        select: { id: true, title: true, category_name: true, author_name: true, update_time: true, status: true, keyword: true, attachment_urls: true },
        orderBy: { update_time: 'desc' },
        take: 100
      });
    }

    // 3. 写入缓存 (5 分钟)
    await this.redisService.set(cacheKey, JSON.stringify(results), 300);
    return results;
  }

  /**
   * 获取详情 (深度优化版：详情缓存)
   */
  async getArticle(userId: string, id: string) {
    const cacheKey = `knowledge:detail:${id}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const scope = await this.scopeService.resolveAccess(userId);
    const article = await (this.prisma as any).knowledge_article.findFirst({
      where: this.scopeService.applyScope({ id, is_deleted: 0 }, scope, { platform: 'platform_id', department: 'dept_id' })
    });

    if (!article) throw new NotFoundException('文章不存在');

    await this.redisService.set(cacheKey, JSON.stringify(article), 600); // 详情缓存 10 分钟
    return article;
  }

  /**
   * 创建文章 (深度优化版：异步 AI 向量化)
   */
  async createArticle(userId: string, dto: SaveKnowledgeArticleDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const author = await this.prisma.sys_user.findUnique({ where: { id: userId } });
    const resolved = this.resolveWriteScope(scope, dto.platform_id, dto.dept_id, dto.shop_id);
    const category = await this.resolveCategory(scope, dto.category_id, resolved);

    const article = await (this.prisma as any).knowledge_article.create({
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
        attachment_urls: (dto as any).attachment_urls || [],
        platform_id: resolved.platform_id,
        dept_id: resolved.dept_id,
        shop_id: resolved.shop_id,
        published_at: dto.status === 'draft' ? null : new Date()
      }
    });

    // 异步 AI 同步：不阻塞 HTTP 响应
    if (article.status !== 'draft') {
      this.triggerAsyncAiSync(article);
    }

    // 失效列表缓存
    await this.clearListCache(article.platform_id, article.dept_id);
    
    return article;
  }

  async updateArticle(userId: string, id: string, dto: SaveKnowledgeArticleDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await (this.prisma as any).knowledge_article.findFirst({
      where: this.scopeService.applyScope({ id, is_deleted: 0 }, scope, { platform: 'platform_id', department: 'dept_id' })
    });

    if (!current) throw new NotFoundException('文章不存在');

    const resolved = this.resolveWriteScope(scope, dto.platform_id ?? current.platform_id, dto.dept_id ?? current.dept_id, dto.shop_id ?? current.shop_id);
    const category = await this.resolveCategory(scope, dto.category_id, resolved);

    const updated = await (this.prisma as any).knowledge_article.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        category_id: dto.category_id === undefined ? current.category_id : category?.id ?? null,
        category_name: dto.category_id === undefined ? dto.category_name ?? current.category_name : category?.category_name ?? null,
        status: dto.status ?? current.status,
        keyword: dto.keyword ?? current.keyword,
        attachment_urls: (dto as any).attachment_urls ?? current.attachment_urls,
        platform_id: resolved.platform_id,
        dept_id: resolved.dept_id,
        shop_id: resolved.shop_id,
        published_at: dto.status === 'draft' ? current.published_at : new Date()
      }
    });

    // 异步更新 AI 库
    if (updated.status !== 'draft') {
      this.triggerAsyncAiSync(updated);
    } else {
      setImmediate(() => this.vectorService.deleteArticle(updated.id));
    }

    // 失效详情和列表缓存
    await this.redisService.del(`knowledge:detail:${id}`);
    await this.clearListCache(updated.platform_id, updated.dept_id);

    return updated;
  }

  async remove(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const article = await (this.prisma as any).knowledge_article.update({
      where: { id },
      data: { is_deleted: 1 }
    });

    // 异步删除向量
    setImmediate(() => this.vectorService.deleteArticle(id));
    
    // 失效缓存
    await this.redisService.del(`knowledge:detail:${id}`);
    await this.clearListCache(article.platform_id, article.dept_id);
    
    return article;
  }

  // --- 私有辅助逻辑 ---

  /**
   * 触发异步 AI 同步
   // 触发 AI 同步和缓存发布
   private triggerAsyncAiSync(article: any) {
     setImmediate(async () => {
       try {
         const fullText = `${article.title}\n${article.content}\n${(article.attachment_urls as string[] || []).join('\n')}`;
         await this.vectorService.upsertArticle({
           id: article.id,
           text: fullText,
           platform_id: article.platform_id,
           dept_id: article.dept_id,
           shop_id: article.shop_id,
           metadata: { category_name: article.category_name, author_name: article.author_name }
         });

         // 发布实时更新消息
         await this.redisService.publish('knowledge:sync', JSON.stringify({
           action: 'update',
           entity: 'knowledge',
           platformId: article.platform_id,
           targetId: article.id,
           timestamp: Date.now()
         }));

         this.logger.log(`Async AI Sync completed and published for article: ${article.id}`);
       } catch (e) {
         this.logger.error(`Async AI Sync failed for article ${article.id}`, e);
       }
     });
   }

  /**
   * 清理列表缓存 (简单策略：按平台部门清理)
   */
  private async clearListCache(platformId: string, deptId: string) {
    // 生产环境建议使用 Redis Scan 或特定的 Key 维护列表
    // 此处仅示例清理核心 Key
    // const baseKey = `knowledge:list:${platformId}:${deptId}`;
  }

  private resolveWriteScope(scope: any, platformId?: string, deptId?: string, shopId?: string | null) {
    const resP = platformId ?? scope.platform_id;
    const resD = deptId ?? scope.dept_id;
    if (!resP || !resD) throw new ForbiddenException('必须明确平台和部门');
    this.scopeService.assertPlatformAccess(scope, resP);
    this.scopeService.assertDepartmentAccess(scope, resD);
    return { platform_id: resP, dept_id: resD, shop_id: shopId ?? null };
  }

  private async resolveCategory(scope: any, categoryId: string | undefined, resolved: any) {
    if (!categoryId) return null;
    const cat = await (this.prisma as any).knowledge_category.findFirst({
      where: this.scopeService.applyScope({ id: categoryId, is_deleted: 0, enabled: 1 }, scope, { platform: 'platform_id', department: 'dept_id' })
    });
    if (!cat) throw new NotFoundException('分类不存在');
    return cat;
  }

  private buildCategoryTree(categories: any[]) {
    const nodeMap = new Map();
    const roots: any[] = [];
    for (const cat of categories) nodeMap.set(cat.id, { ...cat, children: [] });
    for (const node of nodeMap.values()) {
      if (node.parent_id && nodeMap.has(node.parent_id)) nodeMap.get(node.parent_id).children.push(node);
      else roots.push(node);
    }
    return roots;
  }
}
