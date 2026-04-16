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
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../../../common/current-user.decorator";
import { FileInterceptor } from "@nestjs/platform-express";
import { Permission } from "../../../common/permission.decorator";
import { AntiShake } from "../../../common/decorators/antishake.decorator";
import { Idempotent } from "../../../common/decorators/idempotent.decorator";
import {
  RateLimit,
  RateLimitType,
} from "../../../common/decorators/rate-limiter.decorator";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { BatchUpdateEmployeeStatusDto } from "../dto/batch-update-employee-status.dto";
import { CreateEmployeeDto } from "../dto/create-employee.dto";
import { UpdateEmployeeDto } from "../dto/update-employee.dto";
import { PersonnelEmployeesService } from "../services/personnel-employees.service";
import { Response } from "express";

@Controller("personnel/employees")
export class PersonnelEmployeesController {
  constructor(
    private readonly personnelEmployeesService: PersonnelEmployeesService,
  ) {}

  @Get()
  @Permission("personnel:employee:list")
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() pagination: PaginationDto,
    @Query("platform_id") platformId?: string,
    @Query("department_id") departmentId?: string,
    @Query("status") status?: string,
    @Query("keyword") keyword?: string,
  ) {
    return this.personnelEmployeesService.findAll(user.sub, pagination, {
      platformId,
      departmentId,
      status: status ? parseInt(status) : undefined,
      keyword,
    });
  }

  @Post()
  @Permission("personnel:employee:create")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.personnelEmployeesService.create(user.sub, dto);
  }

  @Patch("batch/status")
  @Permission("personnel:employee:batch-status")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 60 })
  batchUpdateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: BatchUpdateEmployeeStatusDto,
  ) {
    return this.personnelEmployeesService.batchUpdateStatus(
      user.sub,
      dto.ids,
      dto.status,
    );
  }

  @Patch(":id")
  @Permission("personnel:employee:update")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.personnelEmployeesService.update(user.sub, id, dto);
  }

  @Post(":id/id-card/:side")
  @Permission("personnel:employee:id-card-upload")
  @UseInterceptors(FileInterceptor("file"))
  @AntiShake(2000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  uploadIdCard(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Param("side") side: "front" | "back",
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.personnelEmployeesService.uploadIdCard(
      user.sub,
      id,
      side,
      file,
    );
  }

  @Get(":id/id-card/:side")
  @Permission("personnel:employee:id-card-view")
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  getIdCardUrl(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Param("side") side: "front" | "back",
  ) {
    return this.personnelEmployeesService.getIdCardUrl(user.sub, id, side);
  }

  @Delete(":id")
  @Permission("personnel:employee:delete")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  remove(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.personnelEmployeesService.remove(user.sub, id);
  }

  @Get("export")
  @Permission("personnel:employee:export")
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 60 })
  async exportEmployees(
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
  ) {
    const buffer = await this.personnelEmployeesService.exportEmployees(
      user.sub,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=employees_${Date.now()}.xlsx`,
    );
    res.end(buffer);
  }

  @Post("import")
  @Permission("personnel:employee:import")
  @UseInterceptors(FileInterceptor("file"))
  @AntiShake(2000)
  @RateLimit({ type: RateLimitType.USER, limit: 3, window: 60 })
  importEmployees(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.personnelEmployeesService.importEmployees(user.sub, file);
  }

  @Get("import/template")
  @Permission("personnel:employee:import")
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  downloadImportTemplate(@Res() res: Response) {
    const buffer = this.personnelEmployeesService.getImportTemplate();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=employee_import_template.xlsx",
    );
    res.end(buffer);
  }

  @Get(":id")
  @Permission("personnel:employee:detail")
  @RateLimit({ type: RateLimitType.USER, limit: 50, window: 60 })
  findOne(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.personnelEmployeesService.findOne(user.sub, id);
  }

  @Post(":id/badge-photo")
  @Permission("personnel:employee:badge-upload")
  @UseInterceptors(FileInterceptor("file"))
  @AntiShake(2000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  uploadBadgePhoto(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.personnelEmployeesService.uploadBadgePhoto(user.sub, id, file);
  }

  @Get(":id/badge-photo")
  @Permission("personnel:employee:badge-view")
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  getBadgePhotoUrl(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.personnelEmployeesService.getBadgePhotoUrl(user.sub, id);
  }

  @Delete("batch")
  @Permission("personnel:employee:batch-delete")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 60 })
  batchRemove(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { ids: string[] },
  ) {
    return this.personnelEmployeesService.batchRemove(user.sub, dto.ids);
  }

  @Post("batch/assign-roles")
  @Permission("personnel:employee:batch-assign-roles")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 60 })
  batchAssignRoles(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { ids: string[]; role_ids: string[] },
  ) {
    return this.personnelEmployeesService.batchAssignRoles(
      user.sub,
      dto.ids,
      dto.role_ids,
    );
  }

  @Get(":id/history")
  @Permission("personnel:employee:history")
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  getHistory(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.personnelEmployeesService.getEmployeeHistory(user.sub, id);
  }
}
