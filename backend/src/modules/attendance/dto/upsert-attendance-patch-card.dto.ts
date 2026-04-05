import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class UpsertAttendancePatchCardDto {
  @IsOptional()
  @IsString()
  patch_no?: string;

  @IsString()
  employee_id!: string;

  @IsString()
  patch_date!: string;

  @IsString()
  patch_type!: string;

  @IsString()
  target_time!: string;

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
  @IsArray()
  attachment_urls?: string[];
}
