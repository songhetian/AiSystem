import { IsArray, IsDateString, IsEmail, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  gender?: number;

  @IsOptional()
  @IsInt()
  age?: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  department_id?: string;

  @IsOptional()
  @IsString()
  position_id?: string;

  @IsOptional()
  @IsString()
  manager_employee_id?: string;

  @IsOptional()
  @IsString()
  platform_id?: string;

  @IsOptional()
  @IsInt()
  status?: number;

  @IsOptional()
  @IsDateString()
  join_date?: string;

  @IsOptional()
  @IsDateString()
  regularization_date?: string;

  @IsOptional()
  @IsDateString()
  contract_expire_time?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  role_ids?: string[];
}
