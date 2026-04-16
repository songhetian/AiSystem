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
import { BatchUpdateUserStatusDto } from "../dto/batch-update-user-status.dto";
import { Permission } from "../../../common/permission.decorator";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../../common/current-user.decorator";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { CreateUserDto } from "../dto/create-user.dto";
import { ResetUserPasswordDto } from "../dto/reset-user-password.dto";
import { UpdateUserDto } from "../dto/update-user.dto";
import { SystemUsersService } from "../services/system-users.service";
import { AntiShake } from "../../../common/decorators/antishake.decorator";
import { Idempotent } from "../../../common/decorators/idempotent.decorator";
import { RateLimit } from "../../../common/decorators/rate-limiter.decorator";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";

@Controller("system/users")
export class SystemUsersController {
  constructor(private readonly systemUsersService: SystemUsersService) {}

  @Get()
  @Permission("system:user:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "system:users", ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() pagination: PaginationDto,
  ) {
    return this.systemUsersService.findAll(user, pagination);
  }

  @Post()
  @Permission("system:user:create")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["system:users:*"] })
  create(@Body() dto: CreateUserDto) {
    return this.systemUsersService.create(dto);
  }

  @Patch(":id")
  @Permission("system:user:update")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["system:users:*"] })
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.systemUsersService.update(id, dto);
  }

  @Patch("profile")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["system:users:*"] })
  updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateUserDto,
  ) {
    return this.systemUsersService.update(user.sub, dto);
  }

  @Post("profile/password")
  @AntiShake(2000)
  @RateLimit({ limit: 5, window: 60 })
  updatePassword(@CurrentUser() user: CurrentUserPayload, @Body() data: any) {
    return this.systemUsersService.updatePassword(user.sub, data);
  }

  @Post(":id/reset-password")
  @Permission("system:user:reset-password")
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  resetPassword(@Param("id") id: string, @Body() dto: ResetUserPasswordDto) {
    return this.systemUsersService.resetPassword(id, dto.password);
  }

  @Patch("batch/status")
  @Permission("system:user:batch-status")
  @AntiShake(1000)
  @RateLimit({ limit: 5, window: 60 })
  @CacheEvict({ keys: ["system:users:*"] })
  batchUpdateStatus(@Body() dto: BatchUpdateUserStatusDto) {
    return this.systemUsersService.batchUpdateStatus(dto.ids, dto.status);
  }

  @Post("batch/reset-password")
  @Permission("system:user:batch-reset-password")
  @AntiShake(1000)
  @RateLimit({ limit: 5, window: 60 })
  batchResetPassword(@Body() dto: { ids: string[]; password: string }) {
    return this.systemUsersService.batchResetPassword(dto.ids, dto.password);
  }

  @Post("batch/assign-roles")
  @Permission("system:user:batch-assign-roles")
  @AntiShake(1000)
  @RateLimit({ limit: 5, window: 60 })
  @CacheEvict({ keys: ["system:users:*", "system:roles:*"] })
  batchAssignRoles(@Body() dto: { ids: string[]; role_ids: string[] }) {
    return this.systemUsersService.batchAssignRoles(dto.ids, dto.role_ids);
  }

  @Delete(":id")
  @Permission("system:user:delete")
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["system:users:*"] })
  remove(@Param("id") id: string) {
    return this.systemUsersService.remove(id);
  }
}
