import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../../common/guards/permission.guard";
import { Permission } from "../../../common/permission.decorator";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../../../common/current-user.decorator";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { ShiftsService } from "../services/shifts.service";
import { CreateShiftDto } from "../dto/create-shift.dto";
import { UpdateShiftDto } from "../dto/update-shift.dto";
import { AntiShake } from "../../../common/decorators/antishake.decorator";
import { Idempotent } from "../../../common/decorators/idempotent.decorator";
import { RateLimit } from "../../../common/decorators/rate-limiter.decorator";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";

@Controller("attendance/shifts")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  @Permission("attendance:shifts:create")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["shifts:list:*", "shifts:detail:*"] })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() createShiftDto: CreateShiftDto,
  ) {
    return this.shiftsService.create(user.sub, createShiftDto);
  }

  @Get()
  @Permission("attendance:shifts:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "shifts:list", ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() pagination: PaginationDto,
    @Query("platform_id") platformId?: string,
    @Query("dept_id") deptId?: string,
    @Query("name") name?: string,
  ) {
    return this.shiftsService.findAll(user.sub, pagination, {
      platform_id: platformId,
      dept_id: deptId,
      name,
    });
  }

  @Get("export")
  @Permission("attendance:shifts:export")
  @RateLimit({ limit: 5, window: 60 })
  async export(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: { platform_id?: string; dept_id?: string },
  ) {
    return this.shiftsService.export(user.sub, query);
  }

  @Get(":id")
  @Permission("attendance:shifts:query")
  @RateLimit({ limit: 50, window: 60 })
  @Cache({ key: "shifts:detail", ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  async findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.shiftsService.findOne(user.sub, id);
  }

  @Patch(":id")
  @Permission("attendance:shifts:update")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["shifts:list:*", "shifts:detail:*"] })
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() updateShiftDto: UpdateShiftDto,
  ) {
    return this.shiftsService.update(user.sub, id, updateShiftDto);
  }

  @Delete(":id")
  @Permission("attendance:shifts:delete")
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["shifts:list:*", "shifts:detail:*"] })
  async remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.shiftsService.remove(user.sub, id);
  }

  @Post("batch-update-status")
  @Permission("attendance:shifts:update")
  @AntiShake(1000)
  @RateLimit({ limit: 5, window: 60 })
  @CacheEvict({ keys: ["shifts:list:*", "shifts:detail:*"] })
  async batchUpdateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { ids: string[]; status: number },
  ) {
    return this.shiftsService.batchUpdateStatus(
      user.sub,
      body.ids,
      body.status,
    );
  }
}
