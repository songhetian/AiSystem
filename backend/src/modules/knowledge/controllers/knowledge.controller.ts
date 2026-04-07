import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { Permission } from '../../../common/permission.decorator';
import { QueryKnowledgeArticlesDto } from '../dto/query-knowledge-articles.dto';
import { QueryKnowledgeCategoriesDto } from '../dto/query-knowledge-categories.dto';
import { QueryKnowledgeTagsDto } from '../dto/query-knowledge-tags.dto';
import { MergeKnowledgeTagDto } from '../dto/merge-knowledge-tag.dto';
import { SaveKnowledgeTagDto } from '../dto/save-knowledge-tag.dto';
import { SaveKnowledgeArticleDto } from '../dto/save-knowledge-article.dto';
import { SaveKnowledgeCategoryDto } from '../dto/save-knowledge-category.dto';
import { KnowledgeService } from '../services/knowledge.service';

@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get('articles')
  @Permission('knowledge:article:list')
  listArticles(@CurrentUser() user: CurrentUserPayload, @Query() query: QueryKnowledgeArticlesDto) {
    return this.knowledgeService.listArticles(user.sub, query);
  }

  @Get('articles/:id')
  @Permission('knowledge:article:list')
  getArticle(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.knowledgeService.getArticle(user.sub, id);
  }

  @Post('articles')
  @Permission('knowledge:article:create')
  createArticle(@CurrentUser() user: CurrentUserPayload, @Body() dto: SaveKnowledgeArticleDto) {
    return this.knowledgeService.createArticle(user.sub, dto);
  }

  @Put('articles/:id')
  @Permission('knowledge:article:update')
  updateArticle(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: SaveKnowledgeArticleDto) {
    return this.knowledgeService.updateArticle(user.sub, id, dto);
  }

  @Get('faq-candidates')
  @Permission('knowledge:faq-candidate:list')
  listFaqCandidates(@CurrentUser() user: CurrentUserPayload) {
    return this.knowledgeService.listFaqCandidates(user.sub);
  }

  @Get('tags')
  @Permission('knowledge:tag:list')
  listTags(@CurrentUser() user: CurrentUserPayload, @Query() query: QueryKnowledgeTagsDto) {
    return this.knowledgeService.listTags(user.sub, query);
  }

  @Get('tags/:id/impact')
  @Permission('knowledge:tag:list')
  getTagImpact(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.knowledgeService.getTagImpact(user.sub, id);
  }

  @Post('tags')
  @Permission('knowledge:tag:create')
  createTag(@CurrentUser() user: CurrentUserPayload, @Body() dto: SaveKnowledgeTagDto) {
    return this.knowledgeService.createTag(user.sub, dto);
  }

  @Put('tags/:id')
  @Permission('knowledge:tag:update')
  updateTag(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: SaveKnowledgeTagDto) {
    return this.knowledgeService.updateTag(user.sub, id, dto);
  }

  @Post('tags/:id/merge')
  @Permission('knowledge:tag:update')
  mergeTag(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: MergeKnowledgeTagDto) {
    return this.knowledgeService.mergeTag(user.sub, id, dto.target_tag_id);
  }

  @Post('tags/:id/enable')
  @Permission('knowledge:tag:update')
  enableTag(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.knowledgeService.toggleTag(user.sub, id, 1);
  }

  @Post('tags/:id/disable')
  @Permission('knowledge:tag:update')
  disableTag(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.knowledgeService.toggleTag(user.sub, id, 0);
  }

  @Get('categories')
  @Permission('knowledge:category:list')
  listCategories(@CurrentUser() user: CurrentUserPayload, @Query() query: QueryKnowledgeCategoriesDto) {
    return this.knowledgeService.listCategories(user.sub, query);
  }

  @Post('categories')
  @Permission('knowledge:category:create')
  createCategory(@CurrentUser() user: CurrentUserPayload, @Body() dto: SaveKnowledgeCategoryDto) {
    return this.knowledgeService.createCategory(user.sub, dto);
  }

  @Put('categories/:id')
  @Permission('knowledge:category:update')
  updateCategory(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: SaveKnowledgeCategoryDto) {
    return this.knowledgeService.updateCategory(user.sub, id, dto);
  }

  @Post('categories/:id/enable')
  @Permission('knowledge:category:update')
  enableCategory(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.knowledgeService.toggleCategory(user.sub, id, 1);
  }

  @Post('categories/:id/disable')
  @Permission('knowledge:category:update')
  disableCategory(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.knowledgeService.toggleCategory(user.sub, id, 0);
  }
}
