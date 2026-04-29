import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryReimbursementDto {
  @ApiProperty({
    description: '申请人ID',
    example: 'user_001',
    required: false,
  })
  @IsOptional()
  @IsString()
  applicantId?: string;

  @ApiProperty({
    description: '费用类型ID',
    example: 'expense_type_001',
    required: false,
  })
  @IsOptional()
  @IsString()
  expenseTypeId?: string;

  @ApiProperty({
    description: '状态：1审批中 2待打款 3已打款 4已驳回 5已撤回',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  status?: number;

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
    example: 1000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @ApiProperty({
    description: '关键词搜索（报销单号、原因）',
    example: '交通费',
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
