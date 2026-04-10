import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitExamAnswerDto {
  @IsString()
  question_id!: string;

  answer!: string | string[] | boolean;
}

export class SubmitExamDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitExamAnswerDto)
  answers!: SubmitExamAnswerDto[];
}
