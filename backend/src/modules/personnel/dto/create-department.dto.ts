import { IsString, IsOptional, IsNumber, IsArray } from "class-validator";

export class CreateDepartmentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  parent_id?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  leader_id?: string;

  @IsOptional()
  @IsNumber()
  status?: number;

  @IsOptional()
  @IsString()
  platform_id?: string;

  @IsOptional()
  @IsArray()
  platform_ids?: string[];

  @IsOptional()
  @IsNumber()
  sort?: number;
}
