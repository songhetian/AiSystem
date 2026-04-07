import { IsOptional, IsString } from 'class-validator';

export class QueryKnowledgeTagsDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  source_type?: string;

  @IsOptional()
  @IsString()
  enabled?: string;
}
