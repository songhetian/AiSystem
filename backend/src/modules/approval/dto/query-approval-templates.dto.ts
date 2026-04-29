import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryApprovalTemplatesDto {
  @ApiPropertyOptional({ description: '模板类型筛选' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: '模板状态筛选', enum: ['enabled', 'disabled'] })
  @IsOptional()
  @IsIn(['enabled', 'disabled'])
  status?: 'enabled' | 'disabled';

  @ApiPropertyOptional({ description: '关键词搜索（模板名称、描述、类型）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '平台ID筛选' })
  @IsOptional()
  @IsString()
  platformId?: string;

  @ApiPropertyOptional({ description: '部门ID筛选' })
  @IsOptional()
  @IsString()
  deptId?: string;

  @ApiPropertyOptional({ description: '页码', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
