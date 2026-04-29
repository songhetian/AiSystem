import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryApprovalProcessDto {
  @ApiPropertyOptional({ description: '流程名称关键词' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '流程状态', enum: ['draft', 'active', 'archived'] })
  @IsOptional()
  @IsEnum(['draft', 'active', 'archived'])
  status?: 'draft' | 'active' | 'archived';

  @ApiPropertyOptional({ description: '创建人ID' })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({ description: '关联模板ID' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number;
}
