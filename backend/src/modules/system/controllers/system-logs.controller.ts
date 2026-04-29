import { Controller, Get, Query, Res, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth, ApiProduces } from '@nestjs/swagger';
import { Permission } from '../../../common/permission.decorator';
import { Public } from '../../../common/public.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/current-user.decorator';
import { QuerySystemLogsDto } from '../dto/query-system-logs.dto';
import { FrontendErrorReportDto } from '../dto/frontend-error-report.dto';
import { LoginLogResponseDto, OperationLogResponseDto } from '../dto/system-logs-response.dto';
import { SystemLogsService } from '../services/system-logs.service';
import { Response } from 'express';
import { Throttle } from '../../../common/decorators/throttle.decorator';
import { DistributedLock } from '../../../common/decorators/distributed-lock.decorator';

/**
 * 系统日志管理控制器 (API v1)
 *
 * 提供操作日志和登录日志的查询、导出功能
 *
 * 功能特性:
 * - 支持多条件组合查询
 * - 支持分页查看
 * - 支持Excel格式导出
 * - 基于角色的权限控制
 * - 日志数据不可删除或修改
 *
 * Requirements: 13.1, 17.1, 23.1
 */
@ApiTags('系统日志管理')
@ApiBearerAuth()
@Controller({ path: 'system/logs', version: '1' })
export class SystemLogsController {
  constructor(private readonly systemLogsService: SystemLogsService) {}

  /**
   * 查询登录日志列表
   *
   * 支持多条件组合查询，包括用户名、时间范围、登录状态、平台等
   *
   * Requirements: 13.1 - 支持登录日志的多条件筛选查询
   *
   * @param user 当前登录用户
   * @param query 查询条件
   * @returns 登录日志列表（分页）
   */
  @Get('login')
  @Permission('system:logs:login:list')
  @ApiOperation({
    summary: '查询登录日志列表',
    description: '支持按用户名、时间范围、登录状态、平台、设备信息等多条件组合查询登录日志。支持分页查看，默认展示最近30天的日志记录。'
  })
  @ApiQuery({ name: 'username', required: false, description: '登录用户名（支持模糊搜索）', example: '张三' })
  @ApiQuery({ name: 'start_date', required: false, description: '开始时间（格式：YYYY-MM-DD）', example: '2024-01-01' })
  @ApiQuery({ name: 'end_date', required: false, description: '结束时间（格式：YYYY-MM-DD）', example: '2024-12-31' })
  @ApiQuery({ name: 'status', required: false, description: '登录状态（1=成功，0=失败）', enum: [0, 1] })
  @ApiQuery({ name: 'platform_id', required: false, description: '所属平台ID' })
  @ApiQuery({ name: 'user_agent', required: false, description: '设备信息（支持模糊搜索）', example: 'Chrome' })
  @ApiQuery({ name: 'keyword', required: false, description: '关键词（搜索用户名、IP、设备信息等）' })
  @ApiQuery({ name: 'page', required: false, description: '页码（默认1）', example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页条数（可选：10/20/50/100，默认20）', example: 20 })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: LoginLogResponseDto
  })
  @ApiResponse({ status: 403, description: '无权访问日志数据' })
  @ApiResponse({ status: 400, description: '查询参数无效' })
  listLoginLogs(@CurrentUser() user: CurrentUserPayload, @Query() query: QuerySystemLogsDto) {
    return this.systemLogsService.listLoginLogs(user, query);
  }

  /**
   * 查询操作日志列表
   *
   * 支持多条件组合查询，包括操作人、操作模块、时间范围、操作状态、平台、部门、店铺等
   *
   * Requirements: 13.1 - 支持操作日志的多条件筛选查询
   *
   * @param user 当前登录用户
   * @param query 查询条件
   * @returns 操作日志列表（分页）
   */
  @Get('operation')
  @Permission('system:logs:operation:list')
  @ApiOperation({
    summary: '查询操作日志列表',
    description: '支持按操作人、操作模块、时间范围、操作状态、平台、部门、店铺等多条件组合查询操作日志。支持分页查看，默认展示最近30天的日志记录。'
  })
  @ApiQuery({ name: 'username', required: false, description: '操作人用户名（支持模糊搜索）', example: '李四' })
  @ApiQuery({ name: 'module', required: false, description: '操作模块', example: '用户管理' })
  @ApiQuery({ name: 'start_date', required: false, description: '开始时间（格式：YYYY-MM-DD）', example: '2024-01-01' })
  @ApiQuery({ name: 'end_date', required: false, description: '结束时间（格式：YYYY-MM-DD）', example: '2024-12-31' })
  @ApiQuery({ name: 'status', required: false, description: '操作状态（1=成功，0=失败）', enum: [0, 1] })
  @ApiQuery({ name: 'platform_id', required: false, description: '所属平台ID' })
  @ApiQuery({ name: 'dept_id', required: false, description: '所属部门ID' })
  @ApiQuery({ name: 'shop_id', required: false, description: '所属店铺ID' })
  @ApiQuery({ name: 'keyword', required: false, description: '关键词（搜索操作人、模块、内容等）' })
  @ApiQuery({ name: 'page', required: false, description: '页码（默认1）', example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页条数（可选：10/20/50/100，默认20）', example: 20 })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: OperationLogResponseDto
  })
  @ApiResponse({ status: 403, description: '无权访问日志数据' })
  @ApiResponse({ status: 400, description: '查询参数无效' })
  listOperationLogs(@CurrentUser() user: CurrentUserPayload, @Query() query: QuerySystemLogsDto) {
    return this.systemLogsService.listOperationLogs(user, query);
  }

  /**
   * 导出登录日志
   *
   * 将当前搜索结果导出为Excel文件，支持导出当前页或全部匹配结果
   *
   * Requirements: 17.1 - 导出当前搜索结果，支持当前页或全部匹配结果
   *
   * @param user 当前登录用户
   * @param query 查询条件
   * @param res Express响应对象
   */
  @Get('login/export')
  @Permission('system:logs:login:export')
  @Throttle(1, 10)
  @DistributedLock({ key: 'export:login:{user.sub}', ttl: 60 })
  @ApiOperation({
    summary: '导出登录日志',
    description: '将当前搜索结果导出为Excel文件。支持导出当前页或全部匹配结果。单次导出最多支持10万条记录，超过建议分批导出。'
  })
  @ApiQuery({ name: 'exportType', required: false, description: '导出类型（current=当前页，all=全部结果，默认all）', enum: ['current', 'all'] })
  @ApiQuery({ name: 'username', required: false, description: '登录用户名（支持模糊搜索）' })
  @ApiQuery({ name: 'start_date', required: false, description: '开始时间（格式：YYYY-MM-DD）' })
  @ApiQuery({ name: 'end_date', required: false, description: '结束时间（格式：YYYY-MM-DD）' })
  @ApiQuery({ name: 'status', required: false, description: '登录状态（1=成功，0=失败）' })
  @ApiQuery({ name: 'platform_id', required: false, description: '所属平台ID' })
  @ApiQuery({ name: 'page', required: false, description: '页码（仅exportType=current时有效）' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页条数（仅exportType=current时有效）' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiResponse({
    status: 200,
    description: '导出成功，返回Excel文件',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  @ApiResponse({ status: 403, description: '无权导出日志数据' })
  @ApiResponse({ status: 400, description: '导出参数无效或数据量过大（超过10万条）' })
  async exportLoginLogs(@CurrentUser() user: CurrentUserPayload, @Query() query: QuerySystemLogsDto, @Res() res: Response) {
    const { buffer, filename } = await this.systemLogsService.exportLogs(user, 'login', query);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);
    res.end(buffer);
  }

  /**
   * 导出操作日志
   *
   * 将当前搜索结果导出为Excel文件，支持导出当前页或全部匹配结果
   *
   * Requirements: 17.1 - 导出当前搜索结果，支持当前页或全部匹配结果
   *
   * @param user 当前登录用户
   * @param query 查询条件
   * @param res Express响应对象
   */
  @Get('operation/export')
  @Permission('system:logs:operation:export')
  @Throttle(1, 10)
  @DistributedLock({ key: 'export:operation:{user.sub}', ttl: 60 })
  @ApiOperation({
    summary: '导出操作日志',
    description: '将当前搜索结果导出为Excel文件。支持导出当前页或全部匹配结果。单次导出最多支持10万条记录，超过建议分批导出。'
  })
  @ApiQuery({ name: 'exportType', required: false, description: '导出类型（current=当前页，all=全部结果，默认all）', enum: ['current', 'all'] })
  @ApiQuery({ name: 'username', required: false, description: '操作人用户名（支持模糊搜索）' })
  @ApiQuery({ name: 'module', required: false, description: '操作模块' })
  @ApiQuery({ name: 'start_date', required: false, description: '开始时间（格式：YYYY-MM-DD）' })
  @ApiQuery({ name: 'end_date', required: false, description: '结束时间（格式：YYYY-MM-DD）' })
  @ApiQuery({ name: 'status', required: false, description: '操作状态（1=成功，0=失败）' })
  @ApiQuery({ name: 'platform_id', required: false, description: '所属平台ID' })
  @ApiQuery({ name: 'dept_id', required: false, description: '所属部门ID' })
  @ApiQuery({ name: 'shop_id', required: false, description: '所属店铺ID' })
  @ApiQuery({ name: 'page', required: false, description: '页码（仅exportType=current时有效）' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页条数（仅exportType=current时有效）' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiResponse({
    status: 200,
    description: '导出成功，返回Excel文件',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  @ApiResponse({ status: 403, description: '无权导出日志数据' })
  @ApiResponse({ status: 400, description: '导出参数无效或数据量过大（超过10万条）' })
  async exportOperationLogs(@CurrentUser() user: CurrentUserPayload, @Query() query: QuerySystemLogsDto, @Res() res: Response) {
    const { buffer, filename } = await this.systemLogsService.exportLogs(user, 'operation', query);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);
    res.end(buffer);
  }

  /**
   * 前端错误上报接口 (V1.0)
   * 职责：接收前端ErrorBoundary捕获的错误，持久化到sys_error_log
   *
   * 特性：
   * 1. Public接口，无需登录（避免登录失败时无法上报）
   * 2. 限流：10次/60秒（防止恶意刷接口）
   * 3. 自动记录用户信息（如果已登录）
   */
  @Post('frontend-error-report')
  @Public()
  @Throttle(10, 60)
  @ApiOperation({
    summary: '前端错误上报',
    description: '接收前端ErrorBoundary捕获的错误并持久化到系统错误日志。无需登录即可调用，限流10次/60秒。'
  })
  @ApiResponse({
    status: 201,
    description: '错误上报成功',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '错误已上报' }
      }
    }
  })
  @ApiResponse({ status: 429, description: '请求过于频繁，已触发限流' })
  async reportFrontendError(
    @Body() dto: FrontendErrorReportDto,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.systemLogsService.reportFrontendError(dto, user);
  }
}
