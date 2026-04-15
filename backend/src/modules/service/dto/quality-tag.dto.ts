import { IsString, IsOptional, IsArray, IsNotEmpty } from 'class-validator';

export class QueryQualityTagsDto {
  @IsOptional()
  @IsString()
  status?: string; // 'pending', 'confirmed', 'rejected'
}

export class AuditTagsDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  ids: string[];

  @IsOptional()
  @IsString()
  reject_reason?: string;
}

export class DedupTagsDto {
  @IsNotEmpty()
  @IsString()
  target_tag_name: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  source_tag_names: string[];
}
