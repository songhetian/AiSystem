import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateExamPlanDto {
  @IsString()
  plan_name!: string;

  @IsString()
  paper_id!: string;

  @IsDateString()
  start_time!: string;

  @IsDateString()
  end_time!: string;

  @IsOptional()
  @IsString()
  reminder_mode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  force_enter?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  pass_score!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration_min!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  max_attempts?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  allow_retake?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  absent_mark_minutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  allow_makeup?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  makeup_limit?: number;

  @IsOptional()
  @IsArray()
  dept_ids?: string[];

  @IsOptional()
  @IsArray()
  employee_ids?: string[];

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
