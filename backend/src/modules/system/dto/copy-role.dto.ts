import { IsOptional, IsString } from 'class-validator';

export class CopyRoleDto {
  @IsOptional()
  @IsString()
  role_name?: string;

  @IsOptional()
  @IsString()
  role_code?: string;
}
