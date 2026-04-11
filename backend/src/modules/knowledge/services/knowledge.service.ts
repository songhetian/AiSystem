import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScopeService } from '../../../common/services/scope.service';
import { VectorService } from '../../../common/services/vector.service';
import { RedisService } from '../../../common/services/redis.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueryKnowledgeArticlesDto } from '../dto/query-knowledge-articles.dto';
import { QueryKnowledgeCategoriesDto } from '../dto/query-knowledge-categories.dto';
import { QueryKnowledgeTagsDto } from '../dto/query-knowledge-tags.dto';
import { SaveKnowledgeTagDto } from '../dto/save-knowledge-tag.dto';
import { SaveKnowledgeArticleDto } from '../dto/save-knowledge-article.dto';
import { SaveKnowledgeCategoryDto } from '../dto/save-knowledge-category.dto';

import { MinioService } from '../../../common/services/minio.service';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly vectorService: VectorService,
    private readonly redisService: RedisService,
    private readonly minioService: MinioService,
    @InjectQueue('ai-analysis-queue') private readonly aiAnalysisQueue: Queue
  ) {}

  // --- Articles ---
  async listArticles(userId: string, query: QueryKnowledgeArticlesDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const where: any = this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id', department: 'dept_id' });
    if (query.keyword) {
      where.OR = [{ title: { contains: query.keyword } }, { keyword: { contains: query.keyword } }];
    }
    if (query.category_id) where.category_id = query.category_id;
    return this.prisma.knowledge_article.findMany({ where, orderBy: { update_time: 'desc' } });
  }

  async getArticle(userId: string, id: string) {
    const article = await this.prisma.knowledge_article.findUnique({ where: { id } });
    if (!article || article.is_deleted === 1) throw new NotFoundException('文章不存在');
    return article;
  }

  async createArticle(userId: string, dto: SaveKnowledgeArticleDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const article = await this.prisma.knowledge_article.create({
      data: {
        ...dto,
        platform_id: scope.platform_id as string,
        dept_id: scope.dept_id as string,
        published_at: dto.status === 'published' ? new Date() : null,
      } as any
    });
    this.triggerAsyncAiSync(article);
    return article;
  }

  async updateArticle(userId: string, id: string, dto: SaveKnowledgeArticleDto) {
    const updated = await this.prisma.knowledge_article.update({ where: { id }, data: dto as any });
    this.triggerAsyncAiSync(updated);
    return updated;
  }

  // --- FAQ Candidates ---
  async listFaqCandidates(_userId: string) {
    return []; // Placeholder
  }

  // --- Tags ---
  async listTags(userId: string, query: QueryKnowledgeTagsDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const where: any = this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id', department: 'dept_id' });
    if (query.keyword) where.tag_name = { contains: query.keyword };
    return this.prisma.knowledge_tag.findMany({ where, orderBy: { sort: 'asc' } });
  }

  async createTag(userId: string, dto: SaveKnowledgeTagDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.knowledge_tag.create({
      data: { ...dto, platform_id: scope.platform_id as string, dept_id: scope.dept_id as string } as any
    });
  }

  async updateTag(_userId: string, id: string, dto: SaveKnowledgeTagDto) {
    return this.prisma.knowledge_tag.update({ where: { id }, data: dto as any });
  }

  async getTagImpact(_userId: string, id: string) {
    return { article_count: 0 };
  }

  async getAiTagSuggestions(_userId: string) {
    return [];
  }

  async batchCreateTags(userId: string, names: string[]) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.knowledge_tag.createMany({
      data: names.map(name => ({ tag_name: name, tag_code: name, platform_id: scope.platform_id as string, dept_id: scope.dept_id as string }))
    });
  }

  async mergeTag(_userId: string, id: string, _targetId: string) {
    return { success: true };
  }

  async toggleTag(_userId: string, id: string, status: number) {
    return this.prisma.knowledge_tag.update({ where: { id }, data: { is_deleted: status === 1 ? 0 : 1 } });
  }

  // --- Categories ---
  async listCategories(userId: string, _query: QueryKnowledgeCategoriesDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const items = await this.prisma.knowledge_category.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id', department: 'dept_id' }),
      orderBy: { sort: 'asc' }
    });
    return items; // Logic for tree can be added if needed
  }

  async createCategory(userId: string, dto: SaveKnowledgeCategoryDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.knowledge_category.create({
      data: { ...dto, platform_id: scope.platform_id as string, dept_id: scope.dept_id as string } as any
    });
  }

  async updateCategory(_userId: string, id: string, dto: SaveKnowledgeCategoryDto) {
    return this.prisma.knowledge_category.update({ where: { id }, data: dto as any });
  }

  async toggleCategory(_userId: string, id: string, status: number) {
    return this.prisma.knowledge_category.update({ where: { id }, data: { enabled: status } });
  }

  private triggerAsyncAiSync(article: any) {
    this.aiAnalysisQueue.add('upsert-article', { article });
  }

  // --- Documents ---
  async listDocuments(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const where = this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id', department: 'dept_id' });
    return this.prisma.knowledge_document.findMany({ where, orderBy: { create_time: 'desc' } });
  }

  async uploadDocument(userId: string, file: Express.Multer.File, isPublic = 0) {
    const scope = await this.scopeService.resolveAccess(userId);
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    const fileId = `kb-doc-${Date.now()}`;
    const objectName = `knowledge/${fileId}.${ext}`;

    const { url } = await this.minioService.uploadObject(objectName, file.buffer, file.mimetype);

    const doc = await this.prisma.knowledge_document.create({
      data: {
        file_name: file.originalname,
        file_path: objectName,
        file_size: file.size,
        file_type: ext,
        status: 'pending',
        is_public: isPublic,
        platform_id: scope.platform_id as string,
        dept_id: scope.dept_id as string,
        uploader_id: userId,
      }
    });

    await this.aiAnalysisQueue.add('process-document', { documentId: doc.id });
    return doc;
  }

  async deleteDocument(userId: string, id: string) {
    const doc = await this.prisma.knowledge_document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('文档不存在');
    if (doc.vector_ids) {
      const ids = doc.vector_ids as string[];
      for (const vid of ids) {
        await this.vectorService.deleteArticle(vid);
      }
    }
    return this.prisma.knowledge_document.update({ where: { id }, data: { is_deleted: 1 } });
  }

  async togglePublicDocument(userId: string, id: string, isPublic: number) {
    const doc = await this.prisma.knowledge_document.update({
      where: { id },
      data: { is_public: isPublic }
    });

    // 同时更新向量库中的元数据（Qdrant 不支持直接更新部分 metadata，通常需要重新 upsert，
    // 但由于内容没变，我们可以简单触发一次重新向量化或者写一个 metadata 更新逻辑）
    // 为了简单起见，重新发送解析任务
    await this.aiAnalysisQueue.add('process-document', { documentId: id });
    return doc;
  }

  async getDocumentContent(_userId: string, id: string) {
    const doc = await this.prisma.knowledge_document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('文档不存在');
    return { content: doc.content || '' };
  }
}
