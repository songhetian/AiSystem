import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  role_name!: string;

  @IsString()
  role_code!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  status?: number;
}
