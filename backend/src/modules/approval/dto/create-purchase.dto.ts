import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseItemDto {
  @ApiProperty({
    description: '物品名称',
    example: '办公椅',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: '数量',
    example: 5,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: '单价',
    example: 299.99,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  unitPrice: number;

  @ApiProperty({
    description: '总价',
    example: 1499.95,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  totalPrice: number;

  @ApiProperty({
    description: '规格',
    example: '黑色真皮',
    required: false,
  })
  @IsOptional()
  @IsString()
  specification?: string;

  @ApiProperty({
    description: '品牌',
    example: '某某品牌',
    required: false,
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({
    description: '型号',
    example: 'ABC-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  model?: string;
}

export class CreatePurchaseDto {
  @ApiProperty({
    description: '采购项目列表',
    type: [PurchaseItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];

  @ApiProperty({
    description: '采购原因',
    example: '办公室扩建需要增加办公设备',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  reason: string;

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
