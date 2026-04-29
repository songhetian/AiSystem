import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, Min, MaxLength } from 'class-validator';

export class UpdateReimbursementDto {
  @ApiProperty({
    description: '报销金额',
    example: 150.50,
    minimum: 0.01,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @ApiProperty({
    description: '报销原因',
    example: '出差北京产生的交通费用',
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

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
    description: '打款方式',
    example: '银行转账',
    required: false,
  })
  @IsOptional()
  @IsString()
  payMethod?: string;

  @ApiProperty({
    description: '备注',
    example: '已核实发票真实性',
    required: false,
  })
  @IsOptional()
  @IsString()
  remark?: string;
}
