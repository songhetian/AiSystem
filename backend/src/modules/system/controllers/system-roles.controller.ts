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
import { CopyRoleDto } from "../dto/copy-role.dto";
import { Permission } from "../../../common/permission.decorator";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { CreateRoleDto } from "../dto/create-role.dto";
import { UpdateRoleDto } from "../dto/update-role.dto";
import { SystemRolesService } from "../services/system-roles.service";
import { AntiShake } from "../../../common/decorators/antishake.decorator";
import { Idempotent } from "../../../common/decorators/idempotent.decorator";
import { RateLimit } from "../../../common/decorators/rate-limiter.decorator";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";

@Controller("system/roles")
export class SystemRolesController {
  constructor(private readonly systemRolesService: SystemRolesService) {}

  @Get()
  @Permission("system:role:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "system:roles", ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  findAll(@Query() pagination: PaginationDto) {
    return this.systemRolesService.findAll(pagination);
  }

  @Post()
  @Permission("system:role:create")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["system:roles:*"] })
  create(@Body() dto: CreateRoleDto) {
    return this.systemRolesService.create(dto);
  }

  @Post(":id/copy")
  @Permission("system:role:copy")
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["system:roles:*"] })
  copy(@Param("id") id: string, @Body() dto: CopyRoleDto) {
    return this.systemRolesService.copy(id, dto);
  }

  @Patch(":id")
  @Permission("system:role:update")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["system:roles:*"] })
  update(@Param("id") id: string, @Body() dto: UpdateRoleDto) {
    return this.systemRolesService.update(id, dto);
  }

  @Delete(":id")
  @Permission("system:role:delete")
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["system:roles:*"] })
  remove(@Param("id") id: string) {
    return this.systemRolesService.remove(id);
  }
}
