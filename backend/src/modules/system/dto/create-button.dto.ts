import { IsInt, IsString } from 'class-validator';

export class CreateButtonDto {
  @IsString()
  button_name!: string;

  @IsString()
  button_code!: string;

  @IsString()
  menu_id!: string;

  @IsInt()
  status!: number;
}
