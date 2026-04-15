import { Type } from "class-transformer";
import { IsArray, IsNumber, IsString, ValidateNested } from "class-validator";

/**
 * 岗位排序项
 */
export class PositionSortItem {
  @IsString()
  id!: string;

  @IsNumber()
  sort!: number;
}

/**
 * 岗位排序DTO
 */
export class SortPositionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PositionSortItem)
  items!: PositionSortItem[];
}
