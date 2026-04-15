import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class GradeItemDto {
  @IsString()
  question_id: string;

  @IsNumber()
  score: number;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class ManualGradeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeItemDto)
  grades: GradeItemDto[];
}
