import { IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class ShopSortItem {
  id!: string;
  sort!: number;
}

export class SortShopDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShopSortItem)
  items!: ShopSortItem[];
}
