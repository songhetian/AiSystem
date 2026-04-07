import { IsOptional, IsString } from 'class-validator';

export class AnalyzeServiceSessionDto {
  @IsOptional()
  @IsString()
  mode?: 'auto' | 'manual';

  @IsOptional()
  @IsString()
  comment?: string;
}
