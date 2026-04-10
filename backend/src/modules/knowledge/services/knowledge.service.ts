import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScopeService } from '../../../common/services/scope.service';
import { VectorService } from '../../../common/services/vector.service';

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly vectorService: VectorService,
  ) {}

  async create(userId: string, data: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    const article = await this.prisma.knowledge_article.create({
      data: {
        ...data,
        platform_id: scope.platform_id,
        dept_id: scope.dept_id,
        published_at: data.status === 'published' ? new Date() : null,
      }
    });

    // 补全：真实同步到向量数据库
    if (article.status === 'published') {
      await this.vectorService.upsertArticle({
        id: article.id,
        text: `${article.title}\n${article.content}`,
        platform_id: article.platform_id,
        dept_id: article.dept_id,
        metadata: {
          category: article.category_name,
          author: article.author_name
        }
      });
    }

    return article;
  }

  async update(userId: string, id: string, data: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.knowledge_article.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('文章不存在');

    const updated = await this.prisma.knowledge_article.update({
      where: { id },
      data
    });

    // 补全：状态变更同步向量库
    if (updated.status === 'published') {
      await this.vectorService.upsertArticle({
        id: updated.id,
        text: `${updated.title}\n${updated.content}`,
        platform_id: updated.platform_id,
        dept_id: updated.dept_id,
        metadata: { category: updated.category_name }
      });
    } else {
      await this.vectorService.deleteArticle(updated.id);
    }

    return updated;
  }

  async search(userId: string, query: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    // 补全：调用真实的向量搜索
    const vectorResults = await this.vectorService.search(query, {
      platform_id: scope.platform_id as string,
      dept_id: scope.dept_id as string
    });

    if (vectorResults.length === 0) {
      return this.prisma.knowledge_article.findMany({
        where: { title: { contains: query }, is_deleted: 0 }
      });
    }

    const ids = vectorResults.map(r => r.id);
    return this.prisma.knowledge_article.findMany({
      where: { id: { in: ids }, is_deleted: 0 }
    });
  }
}
