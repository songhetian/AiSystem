import { IsArray, IsString } from 'class-validator';

export class AssignRolePermissionsDto {
  @IsString()
  role_id!: string;

  @IsArray()
  menu_ids!: string[];

  @IsArray()
  button_ids!: string[];
}
