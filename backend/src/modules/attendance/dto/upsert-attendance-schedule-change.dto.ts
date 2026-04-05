import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpsertAttendanceScheduleChangeDto {
  @IsOptional()
  @IsString()
  change_no?: string;

  @IsString()
  employee_id!: string;

  @IsString()
  change_date!: string;

  @IsOptional()
  @IsString()
  before_shift_name?: string;

  @IsOptional()
  @IsString()
  after_shift_name?: string;

  @IsString()
  change_type!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  operator_id?: string;

  @IsOptional()
  @IsInt()
  notify_status?: number;
}
