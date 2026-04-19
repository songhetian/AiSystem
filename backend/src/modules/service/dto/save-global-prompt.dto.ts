import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SaveGlobalPromptDto {
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
  @IsString()
  remark?: string;
}
