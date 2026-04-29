import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, Min, MaxLength } from 'class-validator';

export class CreateReimbursementDto {
  @ApiProperty({
    description: '费用类型ID',
    example: 'expense_type_001',
  })
  @IsString()
  expenseTypeId: string;

  @ApiProperty({
    description: '报销金额',
    example: 150.50,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: '报销原因',
    example: '出差北京产生的交通费用',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  reason: string;

  @ApiProperty({
    description: '附件URL列表',
    example: ['https://example.com/receipt1.jpg', 'https://example.com/receipt2.pdf'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];

  @ApiProperty({
    description: '平台ID',
    example: 'platform_001',
  })
  @IsString()
  platformId: string;

  @ApiProperty({
    description: '部门ID',
    example: 'dept_001',
  })
  @IsString()
  deptId: string;

  @ApiProperty({
    description: '门店ID',
    example: 'shop_001',
    required: false,
  })
  @IsOptional()
  @IsString()
  shopId?: string;
}
