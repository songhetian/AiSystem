import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class CreateShiftDto {
  @ApiProperty({ description: '班次名称', example: '早班' })
  @IsString()
  name: string;

  @ApiProperty({ description: '上班时间', example: '09:00' })
  @Matches(/^\d{2}:\d{2}$/)
  on_duty_time: string;

  @ApiProperty({ description: '下班时间', example: '18:00' })
  @Matches(/^\d{2}:\d{2}$/)
  off_duty_time: string;

  @ApiPropertyOptional({ description: '迟到阈值 (分钟)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  late_threshold?: number;

  @ApiPropertyOptional({ description: '早退阈值 (分钟)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  early_threshold?: number;

  @ApiPropertyOptional({ description: '旷工阈值 (分钟)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  absenteeism_threshold?: number;

  @ApiPropertyOptional({ description: '平台 ID' })
  @IsOptional()
  @IsString()
  platform_id?: string;

  @ApiPropertyOptional({ description: '部门 ID' })
  @IsOptional()
  @IsString()
  dept_id?: string;

  @ApiPropertyOptional({ description: '状态 (1: 启用, 0: 禁用)', default: 1 })
  @IsOptional()
  @IsInt()
  status?: number;
}
