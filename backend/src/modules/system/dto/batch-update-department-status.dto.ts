import { IsArray, IsInt } from 'class-validator';

export class BatchUpdateDepartmentStatusDto {
  @IsArray()
  ids!: string[];

  @IsInt()
  status!: number;
}
