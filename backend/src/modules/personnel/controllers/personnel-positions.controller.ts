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
import { CreatePositionDto } from "../dto/create-position.dto";
import { SortPositionDto } from "../dto/sort-position.dto";
import { UpdatePositionDto } from "../dto/update-position.dto";
import { PersonnelPositionsService } from "../services/personnel-positions.service";

@Controller("personnel/positions")
export class PersonnelPositionsController {
  constructor(
    private readonly personnelPositionsService: PersonnelPositionsService,
  ) {}

  @Get()
  @Permission("personnel:position:list")
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.personnelPositionsService.findAll(user.sub);
  }

  @Post()
  @Permission("personnel:position:create")
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePositionDto,
  ) {
    return this.personnelPositionsService.create(user.sub, dto);
  }

  @Patch(":id")
  @Permission("personnel:position:update")
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: UpdatePositionDto,
  ) {
    return this.personnelPositionsService.update(user.sub, id, dto);
  }

  @Delete(":id")
  @Permission("personnel:position:delete")
  remove(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.personnelPositionsService.remove(user.sub, id);
  }

  @Post("sort")
  @Permission("personnel:position:sort")
  sort(@CurrentUser() user: CurrentUserPayload, @Body() dto: SortPositionDto) {
    return this.personnelPositionsService.sort(user.sub, dto.items);
  }
}
