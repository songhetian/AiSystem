/**
 * 分页功能使用示例
 *
 * 本文件展示如何在控制器和服务中使用统一的分页功能
 */

import { Controller, Get, Query } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { PaginationDto, PaginatedResponse } from "../dto/pagination.dto";
import { PaginationService } from "../services/pagination.service";
import { PrismaService } from "../../prisma/prisma.service";

// ==================== 示例1：在控制器中使用 PaginationDto ====================

@Controller("examples/pagination")
export class PaginationExampleController {
  constructor(private readonly exampleService: PaginationExampleService) {}

  /**
   * 示例：员工列表查询（带分页）
   * GET /examples/pagination/employees?page=1&pageSize=20
   */
  @Get("employees")
  async getEmployees(@Query() pagination: PaginationDto) {
    // PaginationDto 会自动验证和转换参数
    // page 默认为 1，pageSize 默认为 20
    return this.exampleService.getEmployees(pagination);
  }

  /**
   * 示例：带筛选条件的分页查询
   * GET /examples/pagination/employees/search?keyword=张三&status=1&page=2&pageSize=10
   */
  @Get("employees/search")
  async searchEmployees(
    @Query() pagination: PaginationDto,
    @Query("keyword") keyword?: string,
    @Query("status") status?: string,
  ) {
    return this.exampleService.searchEmployees(
      pagination,
      keyword,
      status ? parseInt(status) : undefined,
    );
  }
}

// ==================== 示例2：在服务中使用 PaginationService ====================

@Injectable()
export class PaginationExampleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paginationService: PaginationService,
  ) {}

  /**
   * 方法1：使用 PaginationService.paginate（推荐）
   * 自动处理分页查询和总数统计
   */
  async getEmployees(
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    return this.paginationService.paginate(
      "hr_employee", // Prisma 模型名称
      { is_deleted: 0 }, // 查询条件
      pagination.page, // 页码
      pagination.pageSize, // 每页数量
      { create_time: "desc" }, // 排序
      {
        // 关联查询
        biz_department: {
          select: { id: true, name: true },
        },
      },
    );
  }

  /**
   * 方法2：手动查询 + 使用 createResponse
   * 适用于复杂查询场景
   */
  async searchEmployees(
    pagination: PaginationDto,
    keyword?: string,
    status?: number,
  ): Promise<PaginatedResponse<any>> {
    // 构建查询条件
    const where: any = { is_deleted: 0 };
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { employee_no: { contains: keyword } },
      ];
    }
    if (status !== undefined) {
      where.status = status;
    }

    // 计算分页参数
    const { skip, take } = this.paginationService.calculatePagination(
      pagination.page,
      pagination.pageSize,
    );

    // 并行查询数据和总数
    const [data, total] = await Promise.all([
      this.prisma.hr_employee.findMany({
        where,
        skip,
        take,
        orderBy: { create_time: "desc" },
        include: {
          biz_department: {
            select: { id: true, name: true },
          },
        },
      } as any),
      this.prisma.hr_employee.count({ where }),
    ]);

    // 创建分页响应
    return this.paginationService.createResponse(
      data,
      total,
      pagination.page,
      pagination.pageSize,
    );
  }

  /**
   * 方法3：直接使用 Prisma + 手动构建响应
   * 适用于需要完全自定义的场景
   */
  async getEmployeesManual(
    page: number = 1,
    pageSize: number = 20,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * pageSize;
    const where = { is_deleted: 0 };

    const [data, total] = await Promise.all([
      this.prisma.hr_employee.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { create_time: "desc" },
      }),
      this.prisma.hr_employee.count({ where }),
    ]);

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
}

// ==================== 响应格式示例 ====================

/**
 * 标准分页响应格式：
 * {
 *   "data": [
 *     { "id": "1", "name": "张三", ... },
 *     { "id": "2", "name": "李四", ... }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "pageSize": 20,
 *     "total": 100,
 *     "totalPages": 5
 *   }
 * }
 */

// ==================== 前端调用示例 ====================

/**
 * 前端调用示例（TypeScript）：
 *
 * import { request } from '@/utils/request';
 *
 * interface PaginationParams {
 *   page?: number;
 *   pageSize?: number;
 * }
 *
 * interface PaginatedResponse<T> {
 *   data: T[];
 *   pagination: {
 *     page: number;
 *     pageSize: number;
 *     total: number;
 *     totalPages: number;
 *   };
 * }
 *
 * // 调用分页接口
 * const getEmployees = async (params: PaginationParams) => {
 *   return request.get<PaginatedResponse<Employee>>('/examples/pagination/employees', {
 *     params: {
 *       page: params.page || 1,
 *       pageSize: params.pageSize || 20,
 *     },
 *   });
 * };
 *
 * // 使用示例
 * const { data, pagination } = await getEmployees({ page: 1, pageSize: 20 });
 * console.log('数据:', data);
 * console.log('总数:', pagination.total);
 * console.log('总页数:', pagination.totalPages);
 */

// ==================== 注意事项 ====================

/**
 * 1. 分页参数验证：
 *    - page 最小为 1
 *    - pageSize 最小为 1，最大为 100
 *    - 默认值：page=1, pageSize=20
 *
 * 2. 性能优化：
 *    - 使用 Promise.all 并行查询数据和总数
 *    - 避免查询不必要的字段（使用 select）
 *    - 为常用查询字段添加数据库索引
 *
 * 3. 缓存策略：
 *    - 列表查询可添加 @Cache 装饰器
 *    - 缓存 Key 需包含分页参数
 *    - 写操作需清除相关缓存
 *
 * 4. 大数据量处理：
 *    - 总数超过 10000 时考虑使用游标分页
 *    - 导出功能使用异步任务
 *    - 避免深度分页（page > 100）
 */
