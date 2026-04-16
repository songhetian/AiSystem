import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../../../common/current-user.decorator";
import { Permission } from "../../../common/permission.decorator";
import { QueryKnowledgeArticlesDto } from "../dto/query-knowledge-articles.dto";
import { QueryKnowledgeCategoriesDto } from "../dto/query-knowledge-categories.dto";
import { QueryKnowledgeTagsDto } from "../dto/query-knowledge-tags.dto";
import { MergeKnowledgeTagDto } from "../dto/merge-knowledge-tag.dto";
import { SaveKnowledgeTagDto } from "../dto/save-knowledge-tag.dto";
import { SaveKnowledgeArticleDto } from "../dto/save-knowledge-article.dto";
import { SaveKnowledgeCategoryDto } from "../dto/save-knowledge-category.dto";
import { SortKnowledgeArticleDto } from "../dto/sort-knowledge-article.dto";
import { KnowledgeService } from "../services/knowledge.service";
import { AntiShake } from "../../../common/decorators/antishake.decorator";
import { Idempotent } from "../../../common/decorators/idempotent.decorator";
import { RateLimit } from "../../../common/decorators/rate-limiter.decorator";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";

@Controller("knowledge")
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get("documents")
  @Permission("knowledge:document:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "knowledge:documents", ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  listDocuments(@CurrentUser() user: CurrentUserPayload) {
    return this.knowledgeService.listDocuments(user.sub);
  }

  @Post("documents/upload")
  @Permission("knowledge:document:create")
  @UseInterceptors(FilesInterceptor("files"))
  @AntiShake(2000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["knowledge:documents:*"] })
  async uploadDocuments(
    @CurrentUser() user: CurrentUserPayload,
    @Body("is_public") isPublic: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /.(pdf|docx|xlsx|pptx|jpg|jpeg|png|bmp|gif)$/,
          }),
        ],
      }),
    )
    files: Express.Multer.File[],
  ) {
    const results: any[] = [];
    for (const file of files) {
      const res = await this.knowledgeService.uploadDocument(
        user.sub,
        file,
        isPublic === "1" ? 1 : 0,
      );
      results.push(res);
    }
    return results;
  }

  @Post("documents/:id/toggle-public")
  @Permission("knowledge:document:update")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["knowledge:documents:*"] })
  togglePublic(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body("is_public") isPublic: number,
  ) {
    return this.knowledgeService.togglePublicDocument(user.sub, id, isPublic);
  }

  @Delete("documents/:id")
  @Permission("knowledge:document:delete")
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["knowledge:documents:*", "knowledge:vectors:*"] })
  deleteDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.knowledgeService.deleteDocument(user.sub, id);
  }

  @Get("documents/:id/content")
  @Permission("knowledge:document:list")
  @RateLimit({ limit: 50, window: 60 })
  @Cache({ key: "knowledge:document:content", ttl: 600 })
  async getDocumentContent(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.knowledgeService.getDocumentContent(user.sub, id);
  }

  @Post("documents/:id/re-import")
  @Permission("knowledge:document:update")
  @AntiShake(2000)
  @RateLimit({ limit: 5, window: 60 })
  @CacheEvict({ keys: ["knowledge:documents:*", "knowledge:vectors:*"] })
  reimportDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.knowledgeService.reimportDocument(user.sub, id);
  }

  @Get("vectors")
  @Permission("knowledge:document:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "knowledge:vectors", ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  listVectors(
    @CurrentUser() user: CurrentUserPayload,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.knowledgeService.listVectors(
      user.sub,
      limit ? parseInt(limit, 10) : 20,
      offset,
    );
  }

  @Delete("vectors/:id")
  @Permission("knowledge:document:delete")
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["knowledge:vectors:*"] })
  deleteVector(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.knowledgeService.deleteVector(user.sub, id);
  }

  @Get("articles")
  @Permission("knowledge:article:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "knowledge:articles", ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  listArticles(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryKnowledgeArticlesDto,
  ) {
    return this.knowledgeService.listArticles(user.sub, query);
  }

  @Get("articles/:id")
  @Permission("knowledge:article:list")
  @RateLimit({ limit: 50, window: 60 })
  @Cache({ key: "knowledge:article:detail", ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  getArticle(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.knowledgeService.getArticle(user.sub, id);
  }

  @Post("articles")
  @Permission("knowledge:article:create")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["knowledge:articles:*"] })
  createArticle(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SaveKnowledgeArticleDto,
  ) {
    return this.knowledgeService.createArticle(user.sub, dto);
  }

  @Put("articles/:id")
  @Permission("knowledge:article:update")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["knowledge:articles:*"] })
  updateArticle(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: SaveKnowledgeArticleDto,
  ) {
    return this.knowledgeService.updateArticle(user.sub, id, dto);
  }

  @Post("articles/sort")
  @Permission("knowledge:article:sort")
  @AntiShake(500)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["knowledge:articles:*"] })
  sortArticles(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SortKnowledgeArticleDto,
  ) {
    return this.knowledgeService.sortArticles(user.sub, dto.items);
  }

  @Get("faq-candidates")
  @Permission("knowledge:faq-candidate:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "knowledge:faq-candidates", ttl: 600 })
  listFaqCandidates(@CurrentUser() user: CurrentUserPayload) {
    return this.knowledgeService.listFaqCandidates(user.sub);
  }

  @Get("tags")
  @Permission("knowledge:tag:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "knowledge:tags", ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  listTags(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryKnowledgeTagsDto,
  ) {
    return this.knowledgeService.listTags(user.sub, query);
  }

  @Get("tags/:id/impact")
  @Permission("knowledge:tag:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "knowledge:tag:impact", ttl: 300 })
  getTagImpact(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.knowledgeService.getTagImpact(user.sub, id);
  }

  @Get("tags/ai-suggestions")
  @Permission("knowledge:tag:list")
  @RateLimit({ limit: 10, window: 60 })
  getAiTagSuggestions(@CurrentUser() user: CurrentUserPayload) {
    return this.knowledgeService.getAiTagSuggestions(user.sub);
  }

  @Post("tags/batch-create")
  @Permission("knowledge:tag:create")
  @AntiShake(1000)
  @RateLimit({ limit: 5, window: 60 })
  @CacheEvict({ keys: ["knowledge:tags:*"] })
  batchCreateTags(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { tag_names: string[] },
  ) {
    return this.knowledgeService.batchCreateTags(
      user.sub,
      body.tag_names ?? [],
    );
  }

  @Post("tags")
  @Permission("knowledge:tag:create")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["knowledge:tags:*"] })
  createTag(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SaveKnowledgeTagDto,
  ) {
    return this.knowledgeService.createTag(user.sub, dto);
  }

  @Put("tags/:id")
  @Permission("knowledge:tag:update")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["knowledge:tags:*"] })
  updateTag(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: SaveKnowledgeTagDto,
  ) {
    return this.knowledgeService.updateTag(user.sub, id, dto);
  }

  @Post("tags/:id/merge")
  @Permission("knowledge:tag:update")
  @AntiShake(1000)
  @RateLimit({ limit: 5, window: 60 })
  @CacheEvict({ keys: ["knowledge:tags:*", "knowledge:articles:*"] })
  mergeTag(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: MergeKnowledgeTagDto,
  ) {
    return this.knowledgeService.mergeTag(user.sub, id, dto.target_tag_id);
  }

  @Post("tags/:id/enable")
  @Permission("knowledge:tag:update")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["knowledge:tags:*"] })
  enableTag(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.knowledgeService.toggleTag(user.sub, id, 1);
  }

  @Post("tags/:id/disable")
  @Permission("knowledge:tag:update")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["knowledge:tags:*"] })
  disableTag(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.knowledgeService.toggleTag(user.sub, id, 0);
  }

  @Get("categories")
  @Permission("knowledge:category:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "knowledge:categories", ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  listCategories(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryKnowledgeCategoriesDto,
  ) {
    return this.knowledgeService.listCategories(user.sub, query);
  }

  @Post("categories")
  @Permission("knowledge:category:create")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["knowledge:categories:*"] })
  createCategory(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SaveKnowledgeCategoryDto,
  ) {
    return this.knowledgeService.createCategory(user.sub, dto);
  }

  @Put("categories/:id")
  @Permission("knowledge:category:update")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["knowledge:categories:*"] })
  updateCategory(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: SaveKnowledgeCategoryDto,
  ) {
    return this.knowledgeService.updateCategory(user.sub, id, dto);
  }

  @Post("categories/:id/enable")
  @Permission("knowledge:category:update")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["knowledge:categories:*"] })
  enableCategory(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.knowledgeService.toggleCategory(user.sub, id, 1);
  }

  @Post("categories/:id/disable")
  @Permission("knowledge:category:update")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["knowledge:categories:*"] })
  disableCategory(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.knowledgeService.toggleCategory(user.sub, id, 0);
  }
}
