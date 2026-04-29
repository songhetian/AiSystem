import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryFinancialRecordDto {
  @ApiProperty({
    description: '记录类型',
    example: 'income',
    enum: ['income', 'expense'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['income', 'expense'])
  type?: 'income' | 'expense';

  @ApiProperty({
    description: '分类',
    example: 'project',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: '关联类型',
    example: 'reimbursement',
    enum: ['reimbursement', 'purchase', 'manual'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['reimbursement', 'purchase', 'manual'])
  relatedType?: 'reimbursement' | 'purchase' | 'manual';

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
  departmentId?: string;

  @ApiProperty({
    description: '操作人ID',
    example: 'user_001',
    required: false,
  })
  @IsOptional()
  @IsString()
  operatorId?: string;

  @ApiProperty({
    description: '开始日期',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: '结束日期',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: '最小金额',
    example: 100,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiProperty({
    description: '最大金额',
    example: 10000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @ApiProperty({
    description: '关键词搜索（来源、分类、描述）',
    example: '项目收入',
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
