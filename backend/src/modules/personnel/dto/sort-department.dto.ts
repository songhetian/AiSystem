import { IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class DepartmentSortItem {
  id: string;
  sort: number;
  parent_id?: string;
}

export class SortDepartmentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DepartmentSortItem)
  items: DepartmentSortItem[];
}
