import { IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class QualityRuleSortItem {
  id!: string;
  sort!: number;
}

export class SortQualityRuleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QualityRuleSortItem)
  items!: QualityRuleSortItem[];
}
