import { IsOptional, IsString } from 'class-validator';

export class QueryKnowledgeCategoriesDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  enabled?: string;
}
