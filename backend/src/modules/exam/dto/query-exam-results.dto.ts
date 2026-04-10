import { IsOptional, IsString } from 'class-validator';

export class QueryExamResultsDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  plan_id?: string;
}
