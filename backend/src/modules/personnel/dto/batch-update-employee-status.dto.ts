import { IsArray, IsInt } from 'class-validator';

export class BatchUpdateEmployeeStatusDto {
  @IsArray()
  ids!: string[];

  @IsInt()
  status!: number;
}
