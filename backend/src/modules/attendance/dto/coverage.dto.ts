import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CheckCoverageDto {
  @IsNotEmpty()
  @IsString()
  check_date: string; // YYYY-MM-DD

  @IsNotEmpty()
  @IsString()
  start_time: string; // YYYY-MM-DD HH:mm:ss

  @IsNotEmpty()
  @IsString()
  end_time: string; // YYYY-MM-DD HH:mm:ss

  @IsArray()
  @IsString({ each: true })
  shift_ids: string[];
}
