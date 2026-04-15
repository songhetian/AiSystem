import { IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class DepartmentSortItem {
  id!: string;
  parent_id?: string | null;
  sort!: number;
}

export class SortDepartmentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DepartmentSortItem)
  items!: DepartmentSortItem[];
}
