import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SaveDepartmentPromptDto {
  @IsString()
  name!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  applicable_scenarios?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  enabled?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  parent_global_prompt_ids?: string[];

  @IsOptional()
  @IsString()
  remark?: string;
}
