import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class CreateShiftDto {
  @IsString()
  name: string;

  @Matches(/^\d{2}:\d{2}$/)
  on_duty_time: string;

  @Matches(/^\d{2}:\d{2}$/)
  off_duty_time: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  late_threshold?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  early_threshold?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  absenteeism_threshold?: number;

  @IsOptional()
  @IsString()
  platform_id?: string;

  @IsOptional()
  @IsString()
  dept_id?: string;

  @IsOptional()
  @IsInt()
  status?: number;
}
