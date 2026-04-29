import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, MaxLength } from 'class-validator';

export class UpdateFinancialRecordDto {
  @ApiProperty({
    description: '金额',
    example: 5000.00,
    minimum: 0.01,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

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
}
