import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateApiPermissionDto {
  @IsOptional()
  @IsString()
  api_name?: string;

  @IsOptional()
  @IsString()
  api_path?: string;

  @IsOptional()
  @IsString()
  request_method?: string;

  @IsOptional()
  @IsArray()
  role_ids?: string[];

  @IsOptional()
  @IsInt()
  status?: number;
}
