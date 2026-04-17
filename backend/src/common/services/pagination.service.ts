import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  createPaginatedResponse,
  PaginatedResponse,
} from "../dto/pagination.dto";

/**
 * 分页服务（统一处理分页逻辑）
 */
@Injectable()
export class PaginationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 通用分页查询方法
   * @param model Prisma模型名称(如:'hr_employee')
   * @param where 查询条件
   * @param page 页码
   * @param pageSize 每页数量
   * @param orderBy 排序条件
   * @param include 关联查询
   */
  async paginate<T>(
    model: string,
    where: Record<string, any>,
    page: number = 1,
    pageSize: number = 20,
    orderBy?: Record<string, any>,
    include?: Record<string, any>,
  ): Promise<PaginatedResponse<T>> {
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // 使用类型安全的动态访问
    const delegate = this.prisma[model as keyof typeof this.prisma] as any;

    // 并行查询数据和总数
    const [data, total] = await Promise.all([
      delegate.findMany({
        where,
        skip,
        take,
        orderBy,
        include,
      }),
      delegate.count({ where }),
    ]);

    return createPaginatedResponse<T>(data, total, page, pageSize);
  }

  /**
   * 手动创建分页响应（用于已查询的数据）
   */
  createResponse<T>(
    data: T[],
    total: number,
    page: number = 1,
    pageSize: number = 20,
  ): PaginatedResponse<T> {
    return createPaginatedResponse<T>(data, total, page, pageSize);
  }

  /**
   * 计算分页参数
   */
  calculatePagination(page: number = 1, pageSize: number = 20) {
    return {
      skip: (page - 1) * pageSize,
      take: pageSize,
    };
  }
}
