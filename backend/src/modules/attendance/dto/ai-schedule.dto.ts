import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, IsObject } from 'class-validator';

export class GenerateAIScheduleDto {
  @IsNotEmpty()
  @IsString()
  start_date: string;

  @IsNotEmpty()
  @IsString()
  end_date: string;

  @IsNotEmpty()
  @IsString()
  dept_id: string;

  @IsOptional()
  @IsNumber()
  max_hours_per_week?: number;

  @IsOptional()
  @IsString()
  priority?: 'fairness' | 'coverage';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lock_employee_ids?: string[];

  // 新增控制台参数：
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  shift_ids?: string[];

  @IsOptional()
  @IsNumber()
  max_consecutive_days?: number;

  @IsOptional()
  @IsNumber()
  daily_max_hours?: number;

  @IsOptional()
  @IsNumber()
  min_shift_staff?: number;

  @IsOptional()
  @IsObject()
  config?: any;
}
