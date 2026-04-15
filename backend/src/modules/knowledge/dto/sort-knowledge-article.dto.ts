import { IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class ArticleSortItem {
  id!: string;
  sort!: number;
}

export class SortKnowledgeArticleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleSortItem)
  items!: ArticleSortItem[];
}
