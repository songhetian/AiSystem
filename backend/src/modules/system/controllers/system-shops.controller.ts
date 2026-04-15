import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../../../common/current-user.decorator";
import { Permission } from "../../../common/permission.decorator";
import { BatchUpdateShopStatusDto } from "../dto/batch-update-shop-status.dto";
import { CreateShopDto } from "../dto/create-shop.dto";
import { SortShopDto } from "../dto/sort-shop.dto";
import { UpdateShopDto } from "../dto/update-shop.dto";
import { SystemShopsService } from "../services/system-shops.service";

@Controller("system/shops")
export class SystemShopsController {
  constructor(private readonly systemShopsService: SystemShopsService) {}

  @Get()
  @Permission("system:shop:list")
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.systemShopsService.findAll(user.sub);
  }

  @Post()
  @Permission("system:shop:create")
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateShopDto) {
    return this.systemShopsService.create(user.sub, dto);
  }

  @Patch(":id")
  @Permission("system:shop:update")
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: UpdateShopDto,
  ) {
    return this.systemShopsService.update(user.sub, id, dto);
  }

  @Patch("batch/status")
  @Permission("system:shop:batch-status")
  batchUpdateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: BatchUpdateShopStatusDto,
  ) {
    return this.systemShopsService.batchUpdateStatus(
      user.sub,
      dto.ids,
      dto.status,
    );
  }

  @Post("sort")
  @Permission("system:shop:sort")
  sort(@CurrentUser() user: CurrentUserPayload, @Body() dto: SortShopDto) {
    return this.systemShopsService.sort(user.sub, dto.items);
  }

  @Delete(":id")
  @Permission("system:shop:delete")
  remove(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.systemShopsService.remove(user.sub, id);
  }
}
