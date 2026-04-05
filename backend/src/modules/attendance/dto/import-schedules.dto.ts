import { ArrayMaxSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ImportScheduleRowDto {
  @IsOptional()
  @IsString()
  employee_no?: string;

  @IsOptional()
  @IsString()
  employee_name?: string;

  @IsOptional()
  @IsString()
  department_name?: string;

  @IsString()
  schedule_date: string;

  @IsString()
  shift_name: string;
}

export class ImportSchedulesDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => ImportScheduleRowDto)
  rows: ImportScheduleRowDto[];
}
