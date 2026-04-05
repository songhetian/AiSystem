import { IsArray, IsString } from 'class-validator';

export class AssignUserRolesDto {
  @IsString()
  user_id!: string;

  @IsArray()
  role_ids!: string[];
}
