import { IsArray, IsString } from "class-validator";

export class BatchUpdateDepartmentDto {
  @IsArray()
  ids: string[];

  @IsString()
  department_id: string;
}
