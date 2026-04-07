import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SaveServiceQualityRuleDto {
  @IsString()
  rule_name!: string;

  @IsString()
  rule_type!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  deduct_score!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  pass_threshold!: number;

  @IsOptional()
  @IsArray()
  trigger_keywords?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  response_timeout_sec?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  enabled?: number;

  @IsOptional()
  @Type(() => Number)
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
