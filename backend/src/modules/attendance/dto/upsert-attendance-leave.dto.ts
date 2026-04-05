import { IsArray, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertAttendanceLeaveDto {
  @IsOptional()
  @IsString()
  leave_no?: string;

  @IsString()
  employee_id!: string;

  @IsString()
  leave_type!: string;

  @IsString()
  start_time!: string;

  @IsString()
  end_time!: string;

  @IsOptional()
  @IsNumber()
  duration_hours?: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsInt()
  approval_status?: number;

  @IsOptional()
  @IsString()
  approved_by?: string;

  @IsOptional()
  @IsString()
  approved_time?: string;

  @IsOptional()
  @IsInt()
  sync_attendance?: number;

  @IsOptional()
  @IsInt()
  sync_schedule?: number;

  @IsOptional()
  @IsArray()
  attachment_urls?: string[];
}
