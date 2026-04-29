import { IsOptional, IsString, IsInt, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryActivityDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: '活动名称（模糊搜索）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '活动类型' })
  @IsOptional()
  @IsString()
  activity_type?: string;

  @ApiPropertyOptional({ description: '平台ID' })
  @IsOptional()
  @IsString()
  platform_id?: string;

  @ApiPropertyOptional({ description: '部门ID' })
  @IsOptional()
  @IsString()
  dept_id?: string;

  @ApiPropertyOptional({ description: '店铺ID' })
  @IsOptional()
  @IsString()
  shop_id?: string;

  @ApiPropertyOptional({ description: '状态', enum: [0, 1] })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;

  @ApiPropertyOptional({ description: '开始时间（起）' })
  @IsOptional()
  @IsDateString()
  start_time_from?: string;

  @ApiPropertyOptional({ description: '开始时间（止）' })
  @IsOptional()
  @IsDateString()
  start_time_to?: string;
}
