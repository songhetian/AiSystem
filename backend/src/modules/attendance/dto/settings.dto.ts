import { IsOptional, IsObject } from 'class-validator';

export class UpdateAiConfigDto {
  @IsOptional()
  @IsObject()
  conflict_rules?: any;

  @IsOptional()
  @IsObject()
  emp_preferences?: any;

  @IsOptional()
  @IsObject()
  shift_priority?: any;

  @IsOptional()
  @IsObject()
  algorithm_params?: any;

  @IsOptional()
  @IsObject()
  ui_settings?: any;
}
