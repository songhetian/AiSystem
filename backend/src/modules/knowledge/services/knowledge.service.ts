import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { MinioService } from "../../../common/services/minio.service";
import { RedisService } from "../../../common/services/redis.service";
import { ScopeService } from "../../../common/services/scope.service";
import { VectorService } from "../../../common/services/vector.service";
import { EnhancedFileService } from "../../../common/services/enhanced-file.service";
import { FilePathService } from "../../../common/services/file-path.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { QueryKnowledgeArticlesDto } from "../dto/query-knowledge-articles.dto";
import { QueryKnowledgeCategoriesDto } from "../dto/query-knowledge-categories.dto";
import { QueryKnowledgeTagsDto } from "../dto/query-knowledge-tags.dto";
import { SaveKnowledgeArticleDto } from "../dto/save-knowledge-article.dto";
import { SaveKnowledgeCategoryDto } from "../dto/save-knowledge-category.dto";
import { SaveKnowledgeTagDto } from "../dto/save-knowledge-tag.dto";
import { Cacheable } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly vectorService: VectorService,
    private readonly redisService: RedisService,
    private readonly minioService: MinioService,
    private readonly enhancedFileService: EnhancedFileService,
    private readonly filePathService: FilePathService,
    @InjectQueue("ai-analysis-queue") private readonly aiAnalysisQueue: Queue,
  ) {}

  private get knowledgeTagDelegate() {
    return this.prisma["knowledge_tag" as keyof typeof this.prisma] as any;
  }

  private get serviceSessionDelegate() {
    return this.prisma["service_session" as keyof typeof this.prisma] as any;
  }

  private get knowledgeDocumentDelegate() {
    return this.prisma["knowledge_document" as keyof typeof this.prisma] as any;
  }

  private buildCategoryTree<
    T extends { id: string; parent_id?: string | null; children?: T[] },
  >(items: T[]) {
    const nodeMap = new Map<string, T & { children: T[] }>();
    const roots: Array<T & { children: T[] }> = [];

    for (const item of items) {
      nodeMap.set(item.id, { ...item, children: [] });
    }

    for (const item of nodeMap.values()) {
      if (item.parent_id && nodeMap.has(item.parent_id)) {
        nodeMap.get(item.parent_id)!.children.push(item);
      } else {
        roots.push(item);
      }
    }

    return roots;
  }

  private normalizeTagCode(value: string) {
    return value.trim().replace(/\s+/g, "_").toLowerCase();
  }

  // --- Articles ---
  @Cacheable({
    prefix: "kb:articles",
    ttl: 300, // 5分钟
    keyGenerator: (userId: string, query: QueryKnowledgeArticlesDto) =>
      `${userId}:${query.keyword || ""}:${query.category_id || ""}:${query.status || ""}:${query.source_type || ""}`,
  })
  @QueryOptimize()
  async listArticles(userId: string, query: QueryKnowledgeArticlesDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const where: any = this.scopeService.applyScope(
      scope,
      { is_deleted: 0 },
      { platform: "platform_id", department: "dept_id" },
    );

    if (query.keyword) {
      where.OR = [
        { title: { contains: query.keyword } },
        { keyword: { contains: query.keyword } },
      ];
    }
    if (query.category_id) where.category_id = query.category_id;
    if (query.status) where.status = query.status;
    if (query.source_type) where.source_type = query.source_type;

    return this.prisma.knowledge_article.findMany({
      where,
      // ✅ 优化：列表不查询 content 大字段，减少数据传输量
      select: {
        id: true,
        title: true,
        category_id: true,
        category_name: true,
        status: true,
        author_id: true,
        author_name: true,
        source_type: true,
        source_ref: true,
        keyword: true,
        is_public: true,
        platform_id: true,
        dept_id: true,
        shop_id: true,
        published_at: true,
        update_time: true,
        create_time: true,
        sort: true,
      },
      orderBy: [{ sort: "asc" }, { update_time: "desc" }],
    });
  }

  @QueryOptimize()
  async getArticle(_userId: string, id: string) {
    const article = await this.prisma.knowledge_article.findUnique({
      where: { id },
    });
    if (!article || article.is_deleted === 1)
      throw new NotFoundException("文章不存在");
    return article;
  }

  @CacheEvict({
    prefix: "kb:articles",
    pattern: "*",
  })
  async createArticle(userId: string, dto: SaveKnowledgeArticleDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const article = await this.prisma.knowledge_article.create({
      data: {
        ...dto,
        platform_id: scope.platform_id as string,
        dept_id: scope.dept_id as string,
        published_at: dto.status === "published" ? new Date() : undefined,
      } as any,
    });
    this.triggerAsyncAiSync(article);
    return article;
  }

  @CacheEvict({
    prefix: "kb:articles",
    pattern: "*",
  })
  async updateArticle(
    _userId: string,
    id: string,
    dto: SaveKnowledgeArticleDto,
  ) {
    const updated = await this.prisma.knowledge_article.update({
      where: { id },
      data: dto as any,
    });
    this.triggerAsyncAiSync(updated);
    return updated;
  }

  /**
   * 文章排序（V2.0 性能优化）
   * 优化点：
   * 1. 使用事务批量更新
   * 2. 权限校验
   * 3. 数据一致性保证
   */
  async sortArticles(
    userId: string,
    items: Array<{ id: string; sort: number }>,
  ) {
    const scope = await this.scopeService.resolveAccess(userId);

    // 获取所有文章并校验权限
    const articleIds = items.map((item) => item.id);
    const articles = await this.prisma.knowledge_article.findMany({
      where: { id: { in: articleIds }, is_deleted: 0 },
    });

    // 校验所有文章的权限
    for (const article of articles) {
      this.scopeService.assertPlatformAccess(scope, article.platform_id);
      this.scopeService.assertDepartmentAccess(scope, article.dept_id);
    }

    if (articles.length !== articleIds.length) {
      throw new Error("部分文章不存在或无权限访问");
    }

    // 使用事务批量更新排序
    return this.prisma.$transaction(
      items.map((item) =>
        this.prisma.knowledge_article.update({
          where: { id: item.id },
          data: { sort: item.sort },
        }),
      ),
    );
  }

  // --- FAQ Candidates ---
  async listFaqCandidates(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const analyses = await (
      this.prisma as any
    ).service_session_analysis.findMany({
      where: this.scopeService.applyScope(
        scope,
        { is_deleted: 0 },
        { platform: "platform_id", department: "dept_id" },
      ),
      select: {
        platform_id: true,
        dept_id: true,
        shop_id: true,
        analyzed_at: true,
        top_faqs: true,
      },
      orderBy: { analyzed_at: "desc" },
      take: 200,
    });

    const summary = new Map<
      string,
      {
        question: string;
        count: number;
        platform_id: string;
        dept_id: string;
        shop_id?: string;
        latest_analyzed_at: string;
        source_ref: string;
      }
    >();

    for (const analysis of analyses) {
      const topFaqs = Array.isArray(analysis.top_faqs) ? analysis.top_faqs : [];
      for (const faq of topFaqs as Array<{
        question?: string;
        count?: number;
      }>) {
        const question = faq?.question?.trim();
        if (!question) continue;
        const source_ref = `faq:${question}`;
        const current = summary.get(question);
        if (!current) {
          summary.set(question, {
            question,
            count: Number(faq.count ?? 1),
            platform_id: analysis.platform_id,
            dept_id: analysis.dept_id,
            shop_id: analysis.shop_id ?? undefined,
            latest_analyzed_at: analysis.analyzed_at.toISOString(),
            source_ref,
          });
          continue;
        }

        current.count += Number(faq.count ?? 1);
        if (
          analysis.analyzed_at.getTime() >
          new Date(current.latest_analyzed_at).getTime()
        ) {
          current.latest_analyzed_at = analysis.analyzed_at.toISOString();
        }
      }
    }

    const sourceRefs = Array.from(summary.values()).map(
      (item) => item.source_ref,
    );
    const archived = sourceRefs.length
      ? await this.prisma.knowledge_article.findMany({
          where: {
            is_deleted: 0,
            source_type: "service_faq",
            source_ref: { in: sourceRefs },
          },
          select: { source_ref: true },
        })
      : [];
    const archivedSet = new Set(
      archived.map((item) => item.source_ref).filter(Boolean),
    );

    return Array.from(summary.values())
      .map((item) => ({
        ...item,
        already_archived: archivedSet.has(item.source_ref),
      }))
      .sort((a, b) => b.count - a.count);
  }

  // --- Tags ---
  @Cacheable({
    prefix: "kb:tags",
    ttl: 600, // 10分钟
    keyGenerator: (userId: string, query: QueryKnowledgeTagsDto) =>
      `${userId}:${query.keyword || ""}:${query.source_type || ""}:${query.enabled || ""}`,
  })
  @QueryOptimize()
  async listTags(userId: string, query: QueryKnowledgeTagsDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const where: any = this.scopeService.applyScope(
      scope,
      { is_deleted: 0 },
      { platform: "platform_id", department: "dept_id" },
    );
    if (query.keyword) where.tag_name = { contains: query.keyword };
    if (query.source_type) where.source_type = query.source_type;
    if (query.enabled === "0") where.is_deleted = 1;
    if (query.enabled === "1") where.is_deleted = 0;

    return this.knowledgeTagDelegate().findMany({
      where,
      orderBy: [{ sort: "asc" }, { update_time: "desc" }],
    });
  }

  @CacheEvict({
    prefix: "kb:tags",
    pattern: "*",
  })
  async createTag(userId: string, dto: SaveKnowledgeTagDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const tag_name = dto.tag_name.trim();
    const tag_code = dto.tag_code?.trim() || this.normalizeTagCode(tag_name);

    return this.knowledgeTagDelegate().create({
      data: {
        ...dto,
        tag_name,
        tag_code,
        platform_id: scope.platform_id as string,
        dept_id: scope.dept_id as string,
        created_by: userId,
      } as any,
    });
  }

  @CacheEvict({
    prefix: "kb:tags",
    pattern: "*",
  })
  async updateTag(_userId: string, id: string, dto: SaveKnowledgeTagDto) {
    const tag_name = dto.tag_name.trim();
    return this.knowledgeTagDelegate().update({
      where: { id },
      data: {
        ...dto,
        tag_name,
        tag_code: dto.tag_code?.trim() || this.normalizeTagCode(tag_name),
      } as any,
    });
  }

  async getTagImpact(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const tag = await this.knowledgeTagDelegate().findUnique({
      where: { id },
    });
    if (!tag) throw new NotFoundException("标签不存在");

    const sessions = await this.serviceSessionDelegate().findMany({
      where: this.scopeService.applyScope(
        scope,
        { is_deleted: 0 },
        { platform: "platform_id", department: "dept_id" },
      ),
      select: { id: true, session_no: true, tags: true },
    });
    const matchedSessions = sessions.filter((item: any) => {
      const tags = Array.isArray(item.tags) ? item.tags : [];
      return tags.includes(tag.tag_name) || tags.includes(tag.tag_code);
    });

    const articles = await this.prisma.knowledge_article.findMany({
      where: this.scopeService.applyScope(
        scope,
        { is_deleted: 0 },
        { platform: "platform_id", department: "dept_id" },
      ) as any,
      select: { id: true, title: true, keyword: true, source_type: true },
    });
    const matchedArticles = articles.filter((item) => {
      const keyword = item.keyword ?? "";
      return keyword.includes(tag.tag_name) || keyword.includes(tag.tag_code);
    });

    return {
      tag: {
        id: tag.id,
        tag_name: tag.tag_name,
        is_deleted: tag.is_deleted,
      },
      session_count: matchedSessions.length,
      article_count: matchedArticles.length,
      sample_sessions: matchedSessions.slice(0, 5).map((item: any) => ({
        id: item.id,
        session_no: item.session_no,
      })),
      sample_articles: matchedArticles.slice(0, 5).map((item) => ({
        id: item.id,
        title: item.title,
        source_type: item.source_type,
      })),
    };
  }

  async getAiTagSuggestions(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const [sessions, existedTags] = await Promise.all([
      this.serviceSessionDelegate().findMany({
        where: this.scopeService.applyScope(
          scope,
          { is_deleted: 0 },
          { platform: "platform_id", department: "dept_id" },
        ),
        select: { tags: true },
        orderBy: { update_time: "desc" },
        take: 200,
      }),
      this.knowledgeTagDelegate().findMany({
        where: this.scopeService.applyScope(
          scope,
          { is_deleted: 0 },
          { platform: "platform_id", department: "dept_id" },
        ) as any,
        select: { tag_name: true, tag_code: true },
      }),
    ]);

    const existedSet = new Set(
      existedTags
        .flatMap((item) => [item.tag_name, item.tag_code])
        .filter(Boolean)
        .map((item) => item.toLowerCase()),
    );
    const counter = new Map<string, number>();

    for (const session of sessions) {
      const tags = Array.isArray(session.tags) ? session.tags : [];
      for (const rawTag of tags) {
        if (typeof rawTag !== "string") continue;
        const tag = rawTag.trim();
        if (!tag || existedSet.has(tag.toLowerCase())) continue;
        counter.set(tag, (counter.get(tag) ?? 0) + 1);
      }
    }

    return Array.from(counter.entries())
      .map(([suggested_name, hit_count]) => ({ suggested_name, hit_count }))
      .sort((a, b) => b.hit_count - a.hit_count)
      .slice(0, 20);
  }

  @CacheEvict({
    prefix: "kb:tags",
    pattern: "*",
  })
  async batchCreateTags(userId: string, names: string[]) {
    const scope = await this.scopeService.resolveAccess(userId);
    const normalizedNames = names.map((item) => item.trim()).filter(Boolean);
    const existed = await this.knowledgeTagDelegate().findMany({
      where: {
        platform_id: scope.platform_id as string,
        dept_id: scope.dept_id as string,
        tag_name: { in: normalizedNames },
      },
      select: { tag_name: true },
    });
    const existedSet = new Set(existed.map((item) => item.tag_name));
    const results: Array<{
      tag_name: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const name of normalizedNames) {
      if (existedSet.has(name)) {
        results.push({ tag_name: name, success: false, error: "标签已存在" });
        continue;
      }

      await this.knowledgeTagDelegate().create({
        data: {
          tag_name: name,
          tag_code: this.normalizeTagCode(name),
          source_type: "service_quality",
          platform_id: scope.platform_id as string,
          dept_id: scope.dept_id as string,
          created_by: userId,
        },
      });
      existedSet.add(name);
      results.push({ tag_name: name, success: true });
    }

    return results;
  }

  @CacheEvict({
    prefix: "kb:tags",
    pattern: "*",
  })
  async mergeTag(userId: string, id: string, targetId: string) {
    if (id === targetId) {
      return { success: false, message: "不能合并到自身" };
    }

    const scope = await this.scopeService.resolveAccess(userId);
    const [sourceTag, targetTag] = await Promise.all([
      this.knowledgeTagDelegate().findUnique({ where: { id } }),
      this.knowledgeTagDelegate().findUnique({
        where: { id: targetId },
      }),
    ]);
    if (!sourceTag || !targetTag) {
      throw new NotFoundException("标签不存在");
    }

    const sessions = await this.serviceSessionDelegate().findMany({
      where: this.scopeService.applyScope(
        scope,
        { is_deleted: 0 },
        { platform: "platform_id", department: "dept_id" },
      ),
      select: { id: true, tags: true },
    });
    let affected_sessions = 0;
    for (const session of sessions) {
      const tags = Array.isArray(session.tags) ? session.tags : [];
      if (
        !tags.includes(sourceTag.tag_name) &&
        !tags.includes(sourceTag.tag_code)
      )
        continue;

      const uniqueNewTags: any[] = Array.from(
        new Set(
          tags.map((item: string) =>
            item === sourceTag.tag_name || item === sourceTag.tag_code
              ? targetTag.tag_name
              : item,
          ),
        ),
      );
      await this.serviceSessionDelegate().update({
        where: { id: session.id },
        data: { tags: uniqueNewTags },
      });
      affected_sessions += 1;
    }

    const articles = await this.prisma.knowledge_article.findMany({
      where: this.scopeService.applyScope(
        scope,
        { is_deleted: 0 },
        { platform: "platform_id", department: "dept_id" },
      ) as any,
      select: { id: true, keyword: true, attachment_urls: true },
    });
    let affected_articles = 0;
    for (const article of articles) {
      const keyword = article.keyword ?? "";
      if (
        !keyword.includes(sourceTag.tag_name) &&
        !keyword.includes(sourceTag.tag_code)
      )
        continue;
      await this.prisma.knowledge_article.update({
        where: { id: article.id },
        data: {
          keyword: keyword
            .split(",")
            .filter((k) => k !== sourceTag.tag_name && k !== sourceTag.tag_code)
            .join(","),
        },
      });
      affected_articles += 1;
    }

    await this.knowledgeTagDelegate().update({
      where: { id },
      data: { is_deleted: 1 },
    });

    return { success: true, affected_sessions, affected_articles };
  }

  @CacheEvict({
    prefix: "kb:tags",
    pattern: "*",
  })
  async toggleTag(_userId: string, id: string, status: number) {
    return this.knowledgeTagDelegate().update({
      where: { id },
      data: { is_deleted: status === 1 ? 0 : 1 },
    });
  }

  // --- Categories ---
  @Cacheable({
    prefix: "kb:categories",
    ttl: 600, // 10分钟
    keyGenerator: (userId: string, query: QueryKnowledgeCategoriesDto) =>
      `${userId}:${query.keyword || ""}:${query.enabled || ""}`,
  })
  @QueryOptimize()
  async listCategories(userId: string, query: QueryKnowledgeCategoriesDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const items = await this.prisma.knowledge_category.findMany({
      where: this.scopeService.applyScope(
        scope,
        {
          is_deleted: 0,
          ...(query.keyword
            ? { category_name: { contains: query.keyword } }
            : {}),
          ...(query.enabled ? { enabled: Number(query.enabled) } : {}),
        },
        { platform: "platform_id", department: "dept_id" },
      ),
      orderBy: [{ sort: "asc" }, { create_time: "asc" }],
    });
    return this.buildCategoryTree(items as any);
  }

  @CacheEvict({
    prefix: "kb:categories",
    pattern: "*",
  })
  async createCategory(userId: string, dto: SaveKnowledgeCategoryDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.knowledge_category.create({
      data: {
        ...dto,
        platform_id: scope.platform_id as string,
        dept_id: scope.dept_id as string,
      } as any,
    });
  }

  @CacheEvict({
    prefix: "kb:categories",
    pattern: "*",
  })
  async updateCategory(
    _userId: string,
    id: string,
    dto: SaveKnowledgeCategoryDto,
  ) {
    return this.prisma.knowledge_category.update({
      where: { id },
      data: dto as any,
    });
  }

  @CacheEvict({
    prefix: "kb:categories",
    pattern: "*",
  })
  async toggleCategory(_userId: string, id: string, status: number) {
    return this.prisma.knowledge_category.update({
      where: { id },
      data: { enabled: status },
    });
  }

  private triggerAsyncAiSync(article: any) {
    this.aiAnalysisQueue.add("upsert-article", { article });
  }

  // --- Documents ---
  @Cacheable({
    prefix: "kb:docs",
    ttl: 300, // 5分钟
    keyGenerator: (userId: string) => userId,
  })
  @QueryOptimize()
  async listDocuments(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const where = this.scopeService.applyScope(
      scope,
      { is_deleted: 0 },
      { platform: "platform_id", department: "dept_id" },
    );
    return this.knowledgeDocumentDelegate().findMany({
      where,
      orderBy: { create_time: "desc" },
    });
  }

  @CacheEvict({
    prefix: "kb:docs",
    pattern: "*",
  })
  async uploadDocument(
    userId: string,
    file: Express.Multer.File,
    isPublic = 0,
  ) {
    const scope = await this.scopeService.resolveAccess(userId);
    const ext = file.originalname.split(".").pop()?.toLowerCase() || "";

    // 使用增强文件服务上传
    const uploadResult = await this.enhancedFileService.uploadFile(file, {
      platformId: scope.platform_id as string,
      departmentId: scope.dept_id ?? undefined,
      category: this.filePathService.getFileTypeCategory(file.mimetype) === 'image' 
        ? 'knowledge-image' as any
        : this.filePathService.getFileTypeCategory(file.mimetype) === 'video'
        ? 'knowledge-video' as any
        : 'knowledge-document' as any,
      entityType: 'knowledge_document',
      uploadedBy: userId,
      isPublic: isPublic === 1,
      metadata: {
        fileType: ext,
        originalSize: file.size,
      },
    });

    const doc = await this.knowledgeDocumentDelegate().create({
      data: {
        file_name: file.originalname,
        file_path: uploadResult.storedPath,
        file_size: file.size,
        file_type: ext,
        status: "pending",
        is_public: isPublic,
        platform_id: scope.platform_id as string,
        dept_id: scope.dept_id as string,
        uploader_id: userId,
      },
    });

    await this.aiAnalysisQueue.add("process-document", { documentId: doc.id });
    return doc;
  }

  @CacheEvict({
    prefix: "kb:docs",
    pattern: "*",
  })
  async deleteDocument(_userId: string, id: string) {
    const doc = await this.knowledgeDocumentDelegate().findUnique({
      where: { id },
    });
    if (!doc) throw new NotFoundException("文档不存在");

    if (doc.vector_ids) {
      const ids = doc.vector_ids as string[];
      for (const vectorId of ids) {
        await this.vectorService.deleteArticle(vectorId);
      }
    }

    return this.knowledgeDocumentDelegate().update({
      where: { id },
      data: { is_deleted: 1 },
    });
  }

  @CacheEvict({
    prefix: "kb:docs",
    pattern: "*",
  })
  async togglePublicDocument(_userId: string, id: string, isPublic: number) {
    const doc = await this.knowledgeDocumentDelegate().update({
      where: { id },
      data: { is_public: isPublic },
    });
    await this.aiAnalysisQueue.add("process-document", { documentId: id });
    return doc;
  }

  async getDocumentContent(_userId: string, id: string) {
    const doc = await this.knowledgeDocumentDelegate().findUnique({
      where: { id },
    });
    if (!doc) throw new NotFoundException("文档不存在");
    return { content: doc.content || "" };
  }

  // --- Vector Management ---
  async listVectors(userId: string, limit = 20, offset?: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const results = await this.vectorService.scroll(
      {
        platform_id: scope.platform_id as string,
        dept_id: scope.dept_id as string,
      },
      limit,
      offset,
    );

    return {
      points: results.points.map((p) => {
        const payload: any = p.payload || {};
        return {
          id: p.id,
          file_name: payload.file_name || payload.title || "未知片段",
          doc_id: payload.doc_id || payload.article_id,
          vector_size: 1536,
          import_time: new Date().toISOString(), // Qdrant doesn't store time, returning current or document time
        };
      }),
      next_page_offset: results.next_page_offset,
    };
  }

  async deleteVector(_userId: string, id: string) {
    await this.vectorService.deleteArticle(id);
    return { success: true };
  }

  async reimportDocument(_userId: string, docId: string) {
    const doc = await this.knowledgeDocumentDelegate().findUnique({
      where: { id: docId },
    });
    if (!doc) throw new NotFoundException("归属源不存在，无法重新生维度提取");

    // 把记录倒车回 pending，给系统重新抓取的余地
    await this.knowledgeDocumentDelegate().update({
      where: { id: docId },
      data: { status: "pending", vector_ids: [] },
    });

    await this.aiAnalysisQueue.add("process-document", { documentId: docId });
    return { success: true };
  }
}
