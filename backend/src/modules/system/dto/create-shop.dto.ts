import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateShopDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsOptional()
  @IsInt()
  type?: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  platform_id!: string;

  @IsString()
  department_id!: string;

  @IsOptional()
  @IsString()
  owner_id?: string;

  @IsOptional()
  @IsInt()
  status?: number;
}
