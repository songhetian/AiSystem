import {
  Body,
  Controller,
  Get,
  Param,
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
import { AttendanceRecordsService } from "../services/attendance-records.service";
import { QueryAttendanceRecordsDto } from "../dto/query-attendance-records.dto";
import { Idempotent } from "../../../common/decorators/idempotent.decorator";
import { AntiShake } from "../../../common/decorators/antishake.decorator";
import { RateLimit } from "../../../common/decorators/rate-limiter.decorator";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";

@Controller("attendance/records")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AttendanceRecordsController {
  constructor(private readonly recordsService: AttendanceRecordsService) {}

  @Post("clock-in")
  @Permission("attendance:records:update")
  @AntiShake(5000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["attendance:records:*", "attendance:stats:*"] })
  async clockIn(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { type: "on" | "off"; location?: string },
  ) {
    return this.recordsService.clockIn(user.sub, body);
  }

  @Get()
  @Permission("attendance:records:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "attendance:records", ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 300, timeout: 5000 })
  async findAll(
    @CurrentUser("id") userId: string,
    @Query() pagination: PaginationDto,
    @Query() query: QueryAttendanceRecordsDto,
  ) {
    return this.recordsService.findAll(userId, pagination, query);
  }

  @Get("export")
  @Permission("attendance:records:export")
  @RateLimit({ limit: 5, window: 60 })
  async export(
    @CurrentUser("id") userId: string,
    @Query() query: QueryAttendanceRecordsDto,
  ) {
    return this.recordsService.export(userId, query);
  }

  @Get("statistics")
  @Permission("attendance:records:stats")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "attendance:stats", ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 300, timeout: 5000 })
  async getStatistics(
    @CurrentUser("id") userId: string,
    @Query() query: { month: string; dept_id?: string; platform_id?: string },
  ) {
    return this.recordsService.getStatistics(userId, query);
  }

  @Get(":id")
  @Permission("attendance:records:query")
  @RateLimit({ limit: 50, window: 60 })
  @Cache({ key: "attendance:records:detail", ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  async findOne(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.recordsService.findOne(userId, id);
  }

  @Post(":id/recalculate")
  @Permission("attendance:records:update")
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["attendance:records:*", "attendance:stats:*"] })
  async reCalculate(@Param("id") id: string) {
    return this.recordsService.reCalculate(id);
  }

  @Post("batch-approve")
  @Permission("attendance:records:approve")
  @AntiShake(1000)
  @RateLimit({ limit: 5, window: 60 })
  @CacheEvict({ keys: ["attendance:records:*", "attendance:stats:*"] })
  async batchApprove(
    @CurrentUser("id") userId: string,
    @Body() body: { ids: string[]; status: number },
  ) {
    return this.recordsService.batchApprove(userId, body.ids, body.status);
  }
}
