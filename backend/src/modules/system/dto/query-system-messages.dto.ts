import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

function toNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

export class QuerySystemMessagesDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsIn([0, 1])
  read_status?: number;
}
