import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.personnelEmployeesService.findAll(user.sub);
  }

  @Post()
  @Permission("personnel:employee:create")
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.personnelEmployeesService.create(user.sub, dto);
  }

  @Patch("batch/status")
  @Permission("personnel:employee:batch-status")
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
  getIdCardUrl(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Param("side") side: "front" | "back",
  ) {
    return this.personnelEmployeesService.getIdCardUrl(user.sub, id, side);
  }

  @Delete(":id")
  @Permission("personnel:employee:delete")
  remove(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.personnelEmployeesService.remove(user.sub, id);
  }

  // ✅ 新增：员工导出
  @Get("export")
  @Permission("personnel:employee:export")
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

  // ✅ 新增：员工批量导入
  @Post("import")
  @Permission("personnel:employee:import")
  @UseInterceptors(FileInterceptor("file"))
  importEmployees(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.personnelEmployeesService.importEmployees(user.sub, file);
  }

  // ✅ 新增：下载导入模板
  @Get("import/template")
  @Permission("personnel:employee:import")
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
}
