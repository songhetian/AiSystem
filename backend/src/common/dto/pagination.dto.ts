import { Type } from "class-transformer";
import { IsInt, IsOptional, Min, Max } from "class-validator";

/**
 * 分页查询DTO（统一分页参数）
 * 默认配置：每页20条，最大支持100条/页
 */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "页码必须是整数" })
  @Min(1, { message: "页码最小为1" })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "每页数量必须是整数" })
  @Min(1, { message: "每页数量最小为1" })
  @Max(100, { message: "每页数量最大为100" })
  pageSize?: number = 20;

  /**
   * 计算跳过的记录数（用于数据库查询）
   */
  get skip(): number {
    return ((this.page || 1) - 1) * (this.pageSize || 20);
  }

  /**
   * 获取每页数量（用于数据库查询）
   */
  get take(): number {
    return this.pageSize || 20;
  }
}

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 创建分页响应
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number = 1,
  pageSize: number = 20,
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
