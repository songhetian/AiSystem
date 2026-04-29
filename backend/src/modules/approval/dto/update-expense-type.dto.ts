import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Length, MaxLength } from 'class-validator';

export class UpdateExpenseTypeDto {
  @ApiProperty({
    description: '费用类型名称',
    example: '交通费',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiProperty({
    description: '费用类型编码',
    example: 'TRANSPORT',
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  code?: string;

  @ApiProperty({
    description: '费用类型描述',
    example: '员工出差、通勤等交通费用',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: '状态：1启用 0禁用',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  status?: number;
}
