import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateApiPermissionDto {
  @IsString()
  api_path!: string;

  @IsString()
  request_method!: string;

  @IsString()
  api_name!: string;

  @IsArray()
  role_ids!: string[];

  @IsOptional()
  @IsInt()
  status?: number;

  @IsOptional()
  @IsString()
  platform_id?: string;

  @IsOptional()
  @IsString()
  dept_id?: string;

  @IsOptional()
  @IsString()
  shop_id?: string;
}
