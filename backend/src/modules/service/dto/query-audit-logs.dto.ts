import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * 查询审计日志DTO
 * **Validates: Requirements 11.5**
 */
export class QueryAuditLogsDto {
  @IsOptional()
  @IsString()
  operator_id?: string;

  @IsOptional()
  @IsString()
  operator_name?: string;

  @IsOptional()
  @IsString()
  operation_type?: string;

  @IsOptional()
  @IsString()
  prompt_id?: string;

  @IsOptional()
  @IsString()
  prompt_type?: string;

  @IsOptional()
  @IsString()
  platform_id?: string;

  @IsOptional()
  @IsString()
  dept_id?: string;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
