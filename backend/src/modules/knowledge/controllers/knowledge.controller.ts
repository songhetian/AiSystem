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
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
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

  @Get('documents')
  @Permission('knowledge:document:list')
  listDocuments(@CurrentUser() user: CurrentUserPayload) {
    return this.knowledgeService.listDocuments(user.sub);
  }

  @Post('documents/upload')
  @Permission('knowledge:document:create')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadDocuments(
    @CurrentUser() user: CurrentUserPayload,
    @Body('is_public') isPublic: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /.(pdf|docx|xlsx|pptx|jpg|jpeg|png|bmp|gif)$/ }),
        ],
      }),
    )
    files: Express.Multer.File[],
  ) {
    const results: any[] = [];
    for (const file of files) {
      const res = await this.knowledgeService.uploadDocument(user.sub, file, isPublic === '1' ? 1 : 0);
      results.push(res);
    }
    return results;
  }

  @Post('documents/:id/toggle-public')
  @Permission('knowledge:document:update')
  togglePublic(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body('is_public') isPublic: number) {
    return this.knowledgeService.togglePublicDocument(user.sub, id, isPublic);
  }

  @Delete('documents/:id')
  @Permission('knowledge:document:delete')
  deleteDocument(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.knowledgeService.deleteDocument(user.sub, id);
  }

  @Get('documents/:id/content')
  @Permission('knowledge:document:list')
  async getDocumentContent(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.knowledgeService.getDocumentContent(user.sub, id);
  }

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

  @Get('tags/ai-suggestions')
  @Permission('knowledge:tag:list')
  getAiTagSuggestions(@CurrentUser() user: CurrentUserPayload) {
    return this.knowledgeService.getAiTagSuggestions(user.sub);
  }

  @Post('tags/batch-create')
  @Permission('knowledge:tag:create')
  batchCreateTags(@CurrentUser() user: CurrentUserPayload, @Body() body: { tag_names: string[] }) {
    return this.knowledgeService.batchCreateTags(user.sub, body.tag_names ?? []);
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
