import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class QueryFaqStatsDto {
  @IsOptional()
  @IsString()
  faq_type?: string; // 'general' or 'product'
}

export class MapFaqArticleDto {
  @IsNotEmpty()
  @IsString()
  faq_content: string;

  @IsNotEmpty()
  @IsString()
  article_id: string;

  @IsOptional()
  @IsString()
  faq_type?: string;

  @IsOptional()
  @IsString()
  product_id?: string;
}
