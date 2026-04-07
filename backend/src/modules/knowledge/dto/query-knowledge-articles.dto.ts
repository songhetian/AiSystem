import { IsOptional, IsString } from 'class-validator';

export class QueryKnowledgeArticlesDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  category_id?: string;

  @IsOptional()
  @IsString()
  source_type?: string;
}
