import { IsDateString, IsEmail, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  name!: string;

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
  employee_no?: string;

  @IsOptional()
  @IsString()
  job_no?: string;

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
}
