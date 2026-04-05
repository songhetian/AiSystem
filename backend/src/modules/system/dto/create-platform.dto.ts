import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreatePlatformDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  status?: number;

  @IsOptional()
  @IsString()
  owner_id?: string;
}
