import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsObject, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateApprovalInstanceDto {
  @ApiProperty({
    description: '审批模板ID',
    example: 'template-123',
  })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({
    description: '审批标题',
    example: '请假申请 - 张三',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: '表单数据',
    example: {
      leaveType: '年假',
      startDate: '2024-01-15',
      endDate: '2024-01-17',
      reason: '家庭事务',
      days: 3,
    },
  })
  @IsObject()
  formData: Record<string, any>;

  @ApiPropertyOptional({
    description: '优先级：1普通 2紧急 3特急',
    example: 1,
    minimum: 1,
    maximum: 3,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(3)
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
}
