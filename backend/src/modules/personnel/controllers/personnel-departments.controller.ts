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
import { CreateDepartmentDto } from "../dto/create-department.dto";
import { UpdateDepartmentDto } from "../dto/update-department.dto";
import { SortDepartmentDto } from "../dto/sort-department.dto";
import { PersonnelDepartmentsService } from "../services/personnel-departments.service";
import { Response } from "express";

@Controller("personnel/departments")
export class PersonnelDepartmentsController {
  constructor(
    private readonly personnelDepartmentsService: PersonnelDepartmentsService,
  ) {}

  @Get()
  @Permission("personnel:department:list")
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() pagination: PaginationDto,
  ) {
    return this.personnelDepartmentsService.findAll(user.sub, pagination);
  }

  @Post()
  @Permission("personnel:department:create")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.personnelDepartmentsService.create(user.sub, dto);
  }

  @Patch(":id")
  @Permission("personnel:department:update")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.personnelDepartmentsService.update(user.sub, id, dto);
  }

  @Delete(":id")
  @Permission("personnel:department:delete")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  remove(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.personnelDepartmentsService.remove(user.sub, id);
  }

  @Post("sort")
  @Permission("personnel:department:sort")
  @AntiShake(500)
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  sort(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SortDepartmentDto,
  ) {
    return this.personnelDepartmentsService.sort(user.sub, dto.items);
  }

  @Get("export")
  @Permission("personnel:department:export")
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 60 })
  async exportDepartments(
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
  ) {
    const buffer = await this.personnelDepartmentsService.exportDepartments(
      user.sub,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=departments_${Date.now()}.xlsx`,
    );
    res.end(buffer);
  }

  @Get("import/template")
  @Permission("personnel:department:import")
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  downloadImportTemplate(@Res() res: Response) {
    const buffer = this.personnelDepartmentsService.getImportTemplate();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=department_import_template.xlsx",
    );
    res.end(buffer);
  }

  @Post("import")
  @Permission("personnel:department:import")
  @UseInterceptors(FileInterceptor("file"))
  @AntiShake(2000)
  @RateLimit({ type: RateLimitType.USER, limit: 3, window: 60 })
  importDepartments(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.personnelDepartmentsService.importDepartments(user.sub, file);
  }

  @Get(":id")
  @Permission("personnel:department:detail")
  @RateLimit({ type: RateLimitType.USER, limit: 50, window: 60 })
  findOne(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.personnelDepartmentsService.findOne(user.sub, id);
  }
}
