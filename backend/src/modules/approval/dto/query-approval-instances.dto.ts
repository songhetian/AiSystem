import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryApprovalInstancesDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '查询视图类型',
    enum: ['my', 'pending', 'completed', 'all'],
    example: 'my',
  })
  @IsOptional()
  @IsString()
  @IsIn(['my', 'pending', 'completed', 'all'])
  view?: 'my' | 'pending' | 'completed' | 'all';

  @ApiPropertyOptional({
    description: '审批状态',
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    example: 'pending',
  })
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'approved', 'rejected', 'cancelled'])
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';

  @ApiPropertyOptional({
    description: '模板ID',
    example: 'template-123',
  })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({
    description: '申请人ID',
    example: 'user-123',
  })
  @IsOptional()
  @IsString()
  applicantId?: string;

  @ApiPropertyOptional({
    description: '优先级',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priority?: number;

  @ApiPropertyOptional({
    description: '平台ID',
    example: 'platform-123',
  })
  @IsOptional()
  @IsString()
  platformId?: string;

  @ApiPropertyOptional({
    description: '部门ID',
    example: 'dept-123',
  })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({
    description: '关键词搜索（标题、申请人姓名）',
    example: '请假',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: '开始日期',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: '结束日期',
    example: '2024-01-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
