import { IsArray } from 'class-validator';

export class SortMenuDto {
  @IsArray()
  items!: Array<{
    id: string;
    parent_id?: string | null;
    sort: number;
  }>;
}
