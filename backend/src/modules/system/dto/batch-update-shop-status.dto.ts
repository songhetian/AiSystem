import { IsArray, IsInt } from 'class-validator';

export class BatchUpdateShopStatusDto {
  @IsArray()
  ids!: string[];

  @IsInt()
  status!: number;
}
