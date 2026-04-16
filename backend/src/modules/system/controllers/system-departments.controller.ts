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
  CurrentUser,
  type CurrentUserPayload,
} from "../../../common/current-user.decorator";
import { Permission } from "../../../common/permission.decorator";
import { Public } from "../../../common/public.decorator";
import { Cache } from "../../../common/decorators/cache.decorator";
import {
  RateLimit,
  RateLimitType,
} from "../../../common/decorators/rate-limiter.decorator";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { BatchUpdateDepartmentStatusDto } from "../dto/batch-update-department-status.dto";
import { CreateDepartmentDto } from "../dto/create-department.dto";
import { UpdateDepartmentDto } from "../dto/update-department.dto";
import { SortDepartmentDto } from "../dto/sort-department.dto";
import { SystemDepartmentsService } from "../services/system-departments.service";

@Controller("system/departments")
export class SystemDepartmentsController {
  constructor(
    private readonly systemDepartmentsService: SystemDepartmentsService,
  ) {}

  /**
   * 获取公开部门列表（供注册页面使用，无需登录）
   * 优化点：缓存优化（10分钟）、IP级限流
   */
  @Public()
  @Get("public")
  @Cache({ ttl: 600, prefix: "public-departments" })
  @RateLimit({ type: RateLimitType.IP, limit: 20, window: 60 })
  async getPublicDepartments() {
    return this.systemDepartmentsService.getPublicDepartments();
  }

  @Get()
  @Permission("system:department:list")
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() pagination: PaginationDto,
  ) {
    return this.systemDepartmentsService.findAll(user.sub, pagination);
  }

  @Get("tree")
  @Permission("system:department:list")
  findTree(@CurrentUser() user: CurrentUserPayload) {
    return this.systemDepartmentsService.findTree(user.sub);
  }

  @Post()
  @Permission("system:department:create")
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.systemDepartmentsService.create(user.sub, dto);
  }

  @Patch("batch/status")
  @Permission("system:department:batch-status")
  batchUpdateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: BatchUpdateDepartmentStatusDto,
  ) {
    return this.systemDepartmentsService.batchUpdateStatus(
      user.sub,
      dto.ids,
      dto.status,
    );
  }

  @Patch(":id")
  @Permission("system:department:update")
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.systemDepartmentsService.update(user.sub, id, dto);
  }

  @Delete(":id")
  @Permission("system:department:delete")
  remove(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.systemDepartmentsService.remove(user.sub, id);
  }

  @Post("sort")
  @Permission("system:department:sort")
  sort(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SortDepartmentDto,
  ) {
    return this.systemDepartmentsService.sort(user.sub, dto.items);
  }
}
