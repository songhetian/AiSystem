import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../../../common/current-user.decorator";
import { Permission } from "../../../common/permission.decorator";
import { AntiShake } from "../../../common/decorators/antishake.decorator";
import {
  RateLimit,
  RateLimitType,
} from "../../../common/decorators/rate-limiter.decorator";
import { ExpenseTypeService } from "../services/expense-type.service";
import { CreateExpenseTypeDto } from "../dto/create-expense-type.dto";
import { UpdateExpenseTypeDto } from "../dto/update-expense-type.dto";
import { QueryExpenseTypeDto } from "../dto/query-expense-type.dto";

@ApiTags("费用类型管理")
@ApiBearerAuth()
@Controller("approval/expense-types")
export class ExpenseTypeController {
  constructor(private readonly expenseTypeService: ExpenseTypeService) {}

  @Post()
  @ApiOperation({
    summary: "创建费用类型",
    description: "创建新的费用类型",
  })
  @ApiResponse({ status: 201, description: "费用类型创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @Permission("approval:expense-type:create")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateExpenseTypeDto,
  ) {
    return this.expenseTypeService.create(dto, user.sub);
  }

  @Get()
  @ApiOperation({
    summary: "获取费用类型列表",
    description: "查询费用类型列表，支持筛选和分页",
  })
  @ApiResponse({ status: 200, description: "成功返回费用类型列表" })
  @Permission("approval:expense-type:list")
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  findMany(@Query() query: QueryExpenseTypeDto) {
    return this.expenseTypeService.findMany(query);
  }

  @Get("by-scope")
  @ApiOperation({
    summary: "根据平台和部门获取费用类型",
    description: "获取指定平台和部门可用的费用类型",
  })
  @ApiResponse({ status: 200, description: "成功返回费用类型列表" })
  @Permission("approval:expense-type:list")
  @RateLimit({ type: RateLimitType.USER, limit: 50, window: 60 })
  findByScope(
    @Query("platformId") platformId: string,
    @Query("deptId") deptId?: string,
  ) {
    return this.expenseTypeService.findByScope(platformId, deptId);
  }

  @Get(":id")
  @ApiOperation({
    summary: "获取费用类型详情",
    description: "根据ID获取费用类型详细信息",
  })
  @ApiResponse({ status: 200, description: "成功返回费用类型详情" })
  @ApiResponse({ status: 404, description: "费用类型不存在" })
  @Permission("approval:expense-type:detail")
  @RateLimit({ type: RateLimitType.USER, limit: 50, window: 60 })
  findById(@Param("id") id: string) {
    return this.expenseTypeService.findById(id);
  }

  @Get(":id/stats")
  @ApiOperation({
    summary: "获取费用类型使用统计",
    description: "获取费用类型的使用统计信息",
  })
  @ApiResponse({ status: 200, description: "成功返回统计信息" })
  @Permission("approval:expense-type:stats")
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  getUsageStats(@Param("id") id: string) {
    return this.expenseTypeService.getUsageStats(id);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "更新费用类型",
    description: "更新费用类型信息",
  })
  @ApiResponse({ status: 200, description: "费用类型更新成功" })
  @ApiResponse({ status: 404, description: "费用类型不存在" })
  @Permission("approval:expense-type:update")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  update(@Param("id") id: string, @Body() dto: UpdateExpenseTypeDto) {
    return this.expenseTypeService.update(id, dto);
  }

  @Patch(":id/toggle-status")
  @ApiOperation({
    summary: "启用/禁用费用类型",
    description: "切换费用类型的启用状态",
  })
  @ApiResponse({ status: 200, description: "状态切换成功" })
  @Permission("approval:expense-type:update")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  toggleStatus(@Param("id") id: string) {
    return this.expenseTypeService.toggleStatus(id);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "删除费用类型",
    description: "删除费用类型（软删除）",
  })
  @ApiResponse({ status: 200, description: "费用类型删除成功" })
  @ApiResponse({ status: 400, description: "费用类型正在使用中，无法删除" })
  @Permission("approval:expense-type:delete")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  delete(@Param("id") id: string) {
    return this.expenseTypeService.delete(id);
  }

  @Post("batch-import")
  @ApiOperation({
    summary: "批量导入费用类型",
    description: "批量导入费用类型数据",
  })
  @ApiResponse({ status: 201, description: "批量导入完成" })
  @Permission("approval:expense-type:import")
  @AntiShake(2000)
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 300 })
  batchImport(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { items: Array<{
      name: string;
      code: string;
      description?: string;
      platformId: string;
      deptId?: string;
    }> },
  ) {
    return this.expenseTypeService.batchImport(dto.items, user.sub);
  }
}
