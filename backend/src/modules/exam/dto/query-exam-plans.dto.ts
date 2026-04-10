import { IsOptional, IsString } from 'class-validator';

export class QueryExamPlansDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
