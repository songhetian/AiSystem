import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseItemDto } from './create-purchase.dto';

export class UpdatePurchaseDto {
  @ApiProperty({
    description: '采购项目列表',
    type: [PurchaseItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items?: PurchaseItemDto[];

  @ApiProperty({
    description: '采购原因',
    example: '办公室扩建需要增加办公设备',
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiProperty({
    description: '附件URL列表',
    example: ['https://example.com/quote1.pdf', 'https://example.com/spec2.pdf'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];

  @ApiProperty({
    description: '供应商信息',
    example: '某某办公用品有限公司',
    required: false,
  })
  @IsOptional()
  @IsString()
  supplierInfo?: string;

  @ApiProperty({
    description: '实际金额',
    example: 1450.00,
    minimum: 0.01,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  actualAmount?: number;
}
