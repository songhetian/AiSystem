import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreatePositionDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  department_id!: string;

  @IsOptional()
  @IsInt()
  level?: number;

  @IsOptional()
  @IsString()
  sequence?: string;

  @IsOptional()
  @IsString()
  platform_id?: string;
}
