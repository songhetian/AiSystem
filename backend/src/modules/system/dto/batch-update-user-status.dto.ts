import { IsArray, IsInt } from 'class-validator';

export class BatchUpdateUserStatusDto {
  @IsArray()
  ids!: string[];

  @IsInt()
  status!: number;
}
