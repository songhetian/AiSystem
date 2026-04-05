import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

class ScheduleAssignmentItemDto {
  @IsString()
  employee_id: string;

  @IsDateString()
  schedule_date: string;
}

export class SaveScheduleDto {
  @IsOptional()
  @IsString()
  shift_id?: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ScheduleAssignmentItemDto)
  items: ScheduleAssignmentItemDto[];
}
