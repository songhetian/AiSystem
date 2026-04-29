import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryExpenseTypeDto {
  @ApiProperty({
    description: '平台ID',
    example: 'platform_001',
    required: false,
  })
  @IsOptional()
  @IsString()
  platformId?: string;

  @ApiProperty({
    description: '部门ID',
    example: 'dept_001',
    required: false,
  })
  @IsOptional()
  @IsString()
  deptId?: string;

  @ApiProperty({
    description: '状态：1启用 0禁用',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  status?: number;

  @ApiProperty({
    description: '关键词搜索（名称、编码、描述）',
    example: '交通',
    required: false,
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({
    description: '页码',
    example: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: '每页数量',
    example: 20,
    default: 20,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
