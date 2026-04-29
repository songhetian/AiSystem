import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsIn, Min, MaxLength } from 'class-validator';

export class CreateFinancialRecordDto {
  @ApiProperty({
    description: '记录类型',
    example: 'income',
    enum: ['income', 'expense'],
  })
  @IsString()
  @IsIn(['income', 'expense'])
  type: 'income' | 'expense';

  @ApiProperty({
    description: '金额',
    example: 5000.00,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: '来源/用途',
    example: '项目收入',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @ApiProperty({
    description: '分类',
    example: 'project',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiProperty({
    description: '描述',
    example: 'XX项目第一期款项',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

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
}
