import { IsArray, IsInt } from 'class-validator';

export class BatchUpdatePlatformStatusDto {
  @IsArray()
  ids!: string[];

  @IsInt()
  status!: number;
}
