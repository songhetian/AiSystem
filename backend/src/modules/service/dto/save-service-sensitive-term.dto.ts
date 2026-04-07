import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SaveServiceSensitiveTermDto {
  @IsString()
  term!: string;

  @IsString()
  category!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  severity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  enabled?: number;

  @IsOptional()
  @IsString()
  replace_text?: string;

  @IsOptional()
  @IsString()
  description?: string;

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
