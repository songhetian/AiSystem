import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateButtonDto {
  @IsOptional()
  @IsString()
  button_name?: string;

  @IsOptional()
  @IsString()
  menu_id?: string;

  @IsOptional()
  @IsInt()
  status?: number;
}
