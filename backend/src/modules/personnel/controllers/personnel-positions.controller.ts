import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../../../common/current-user.decorator";
import { Permission } from "../../../common/permission.decorator";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { AntiShake } from "../../../common/decorators/antishake.decorator";
import { Idempotent } from "../../../common/decorators/idempotent.decorator";
import {
  RateLimit,
  RateLimitType,
} from "../../../common/decorators/rate-limiter.decorator";
import { CreatePositionDto } from "../dto/create-position.dto";
import { SortPositionDto } from "../dto/sort-position.dto";
import { UpdatePositionDto } from "../dto/update-position.dto";
import { PersonnelPositionsService } from "../services/personnel-positions.service";
import { Response } from "express";

@Controller("personnel/positions")
export class PersonnelPositionsController {
  constructor(
    private readonly personnelPositionsService: PersonnelPositionsService,
  ) {}

  @Get()
  @Permission("personnel:position:list")
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() pagination: PaginationDto,
  ) {
    return this.personnelPositionsService.findAll(user.sub, pagination);
  }

  @Post()
  @Permission("personnel:position:create")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePositionDto,
  ) {
    return this.personnelPositionsService.create(user.sub, dto);
  }

  @Patch(":id")
  @Permission("personnel:position:update")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: UpdatePositionDto,
  ) {
    return this.personnelPositionsService.update(user.sub, id, dto);
  }

  @Delete(":id")
  @Permission("personnel:position:delete")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  remove(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.personnelPositionsService.remove(user.sub, id);
  }

  @Post("sort")
  @Permission("personnel:position:sort")
  @AntiShake(500)
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  sort(@CurrentUser() user: CurrentUserPayload, @Body() dto: SortPositionDto) {
    return this.personnelPositionsService.sort(user.sub, dto.items);
  }

  @Get("export")
  @Permission("personnel:position:export")
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 60 })
  async exportPositions(
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
  ) {
    const buffer = await this.personnelPositionsService.exportPositions(
      user.sub,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=positions_${Date.now()}.xlsx`,
    );
    res.end(buffer);
  }

  @Get("import/template")
  @Permission("personnel:position:import")
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  downloadImportTemplate(@Res() res: Response) {
    const buffer = this.personnelPositionsService.getImportTemplate();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=position_import_template.xlsx",
    );
    res.end(buffer);
  }

  @Post("import")
  @Permission("personnel:position:import")
  @UseInterceptors(FileInterceptor("file"))
  @AntiShake(2000)
  @RateLimit({ type: RateLimitType.USER, limit: 3, window: 60 })
  importPositions(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.personnelPositionsService.importPositions(user.sub, file);
  }

  @Get(":id")
  @Permission("personnel:position:detail")
  @RateLimit({ type: RateLimitType.USER, limit: 50, window: 60 })
  findOne(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.personnelPositionsService.findOne(user.sub, id);
  }

  @Patch("batch/status")
  @Permission("personnel:position:batch-status")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 60 })
  batchUpdateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { ids: string[]; status: number },
  ) {
    return this.personnelPositionsService.batchUpdateStatus(
      user.sub,
      dto.ids,
      dto.status,
    );
  }

  @Patch("batch/department")
  @Permission("personnel:position:batch-department")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 60 })
  batchUpdateDepartment(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { ids: string[]; department_id: string },
  ) {
    return this.personnelPositionsService.batchUpdateDepartment(
      user.sub,
      dto.ids,
      dto.department_id,
    );
  }
}
