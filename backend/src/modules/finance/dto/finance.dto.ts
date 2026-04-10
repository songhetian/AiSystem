import { IsNotEmpty, IsNumber, IsOptional, IsString, IsArray } from 'class-validator';

export class CreateReimbursementDto {
  @IsNotEmpty()
  @IsString()
  expense_type_id: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsArray()
  attachment_urls?: string[];

  @IsNotEmpty()
  @IsString()
  platform_id: string;

  @IsNotEmpty()
  @IsString()
  department_id: string;

  @IsOptional()
  @IsString()
  shop_id?: string;
}

export class CreatePurchaseDto {
  @IsNotEmpty()
  @IsArray()
  items: any[];

  @IsNotEmpty()
  @IsNumber()
  total_amount: number;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsArray()
  attachment_urls?: string[];

  @IsNotEmpty()
  @IsString()
  platform_id: string;

  @IsNotEmpty()
  @IsString()
  department_id: string;

  @IsOptional()
  @IsString()
  shop_id?: string;
}
