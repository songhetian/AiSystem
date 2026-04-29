import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * 系统日志查询DTO
 *
 * 支持操作日志和登录日志的多条件组合查询
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */
export class QuerySystemLogsDto {
  @ApiProperty({
    description: '关键词（模糊搜索用户名、模块、内容、IP、设备信息等）',
    required: false,
    example: '张三'
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({
    description: '用户名（支持模糊搜索）',
    required: false,
    example: '李四'
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({
    description: '开始时间（格式：YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss）',
    required: false,
    example: '2024-01-01'
  })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiProperty({
    description: '结束时间（格式：YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss）',
    required: false,
    example: '2024-12-31'
  })
  @IsOptional()
  @IsString()
  end_date?: string;

  @ApiProperty({
    description: '状态（1=成功，0=失败）',
    required: false,
    enum: [0, 1],
    example: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;

  @ApiProperty({
    description: '所属平台ID',
    required: false,
    example: 'platform-001'
  })
  @IsOptional()
  @IsString()
  platform_id?: string;

  @ApiProperty({
    description: '所属部门ID（仅操作日志）',
    required: false,
    example: 'dept-001'
  })
  @IsOptional()
  @IsString()
  dept_id?: string;

  @ApiProperty({
    description: '所属店铺ID（仅操作日志）',
    required: false,
    example: 'shop-001'
  })
  @IsOptional()
  @IsString()
  shop_id?: string;

  @ApiProperty({
    description: '操作模块（仅操作日志）',
    required: false,
    example: '用户管理'
  })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiProperty({
    description: '设备信息（支持模糊搜索，仅登录日志）',
    required: false,
    example: 'Chrome 120.0'
  })
  @IsOptional()
  @IsString()
  user_agent?: string;

  @ApiProperty({
    description: '页码（默认1）',
    required: false,
    minimum: 1,
    example: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: '每页条数（可选：10/20/50/100，默认20）',
    required: false,
    minimum: 1,
    enum: [10, 20, 50, 100],
    example: 20
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  @ApiProperty({
    description: '导出类型（current=当前页，all=全部结果，默认all）',
    required: false,
    enum: ['current', 'all'],
    example: 'all'
  })
  @IsOptional()
  @IsString()
  exportType?: 'current' | 'all' = 'all';
}
