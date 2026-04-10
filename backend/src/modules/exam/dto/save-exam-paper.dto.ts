import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class SaveExamPaperQuestionDto {
  @IsString()
  question_type!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsArray()
  options?: Array<{ label: string; value: string }>;

  correct_answer!: string | string[] | boolean;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  score!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsString()
  explanation?: string;
}

export class SaveExamPaperDto {
  @IsString()
  paper_name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  total_score!: number;

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
  @Min(0)
  enabled?: number;

  @IsOptional()
  @IsString()
  platform_id?: string;

  @IsOptional()
  @IsString()
  dept_id?: string;

  @IsOptional()
  @IsString()
  shop_id?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaveExamPaperQuestionDto)
  questions!: SaveExamPaperQuestionDto[];
}
