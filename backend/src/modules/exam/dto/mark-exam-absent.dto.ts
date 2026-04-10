import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MarkExamAbsentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
