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
import { Permission } from "../../../common/permission.decorator";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { CreateMenuDto } from "../dto/create-menu.dto";
import { MenuTreeQueryDto } from "../dto/menu-tree-query.dto";
import { SortMenuDto } from "../dto/sort-menu.dto";
import { UpdateMenuDto } from "../dto/update-menu.dto";
import { SystemMenusService } from "../services/system-menus.service";
import { AntiShake } from "../../../common/decorators/antishake.decorator";
import { Idempotent } from "../../../common/decorators/idempotent.decorator";
import { RateLimit } from "../../../common/decorators/rate-limiter.decorator";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";

@Controller("system/menus")
export class SystemMenusController {
  constructor(private readonly systemMenusService: SystemMenusService) {}

  @Get()
  @Permission("system:menu:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "system:menus", ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  findAll(@Query() pagination: PaginationDto) {
    return this.systemMenusService.findAll(pagination);
  }

  @Get("tree")
  @Permission("system:menu:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "system:menus:tree", ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  findTree(@Query() query: MenuTreeQueryDto) {
    return this.systemMenusService.findTree(query.role_id);
  }

  @Post()
  @Permission("system:menu:create")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["system:menus:*"] })
  create(@Body() dto: CreateMenuDto) {
    return this.systemMenusService.create(dto);
  }

  @Patch(":id")
  @Permission("system:menu:update")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["system:menus:*"] })
  update(@Param("id") id: string, @Body() dto: UpdateMenuDto) {
    return this.systemMenusService.update(id, dto);
  }

  @Post("sort")
  @Permission("system:menu:sort")
  @AntiShake(500)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["system:menus:*"] })
  sort(@Body() dto: SortMenuDto) {
    return this.systemMenusService.sort(dto.items);
  }

  @Delete(":id")
  @Permission("system:menu:delete")
  @AntiShake(1000)
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["system:menus:*"] })
  remove(@Param("id") id: string) {
    return this.systemMenusService.remove(id);
  }
}
