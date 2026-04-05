import { IsOptional, IsString } from 'class-validator';

export class MenuTreeQueryDto {
  @IsOptional()
  @IsString()
  role_id?: string;
}
