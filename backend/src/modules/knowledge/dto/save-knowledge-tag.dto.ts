import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SaveKnowledgeTagDto {
  @IsString()
  tag_name!: string;

  @IsOptional()
  @IsString()
  tag_code?: string;

  @IsOptional()
  @IsString()
  source_type?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsString()
  platform_id?: string;

  @IsOptional()
  @IsString()
  dept_id?: string;

  @IsOptional()
  @IsString()
  shop_id?: string;
}
