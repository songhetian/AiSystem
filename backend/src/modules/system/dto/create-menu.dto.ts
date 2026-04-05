import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateMenuDto {
  @IsString()
  menu_name!: string;

  @IsString()
  menu_code!: string;

  @IsOptional()
  @IsString()
  parent_id?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @IsInt()
  sort?: number;

  @IsInt()
  type!: number;

  @IsOptional()
  @IsInt()
  status?: number;
}
