import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { EducationService } from "../services/education.service";

@Controller("personnel/education")
@UseGuards(JwtAuthGuard)
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  @Get("dict")
  listDict() {
    return this.educationService.listDict();
  }

  @Post("dict")
  saveDict(@Body() data: any) {
    return this.educationService.saveDict(data);
  }

  @Delete("dict/:id")
  deleteDict(@Param("id") id: string) {
    return this.educationService.deleteDict(id);
  }

  // 获取所有员工学历记录（管理员用）
  @Get("employee/all")
  listAllEmployeeEducation() {
    return this.educationService.listAllEmployeeEducation();
  }

  @Get("employee/:employeeId")
  listEmployeeEducation(@Param("employeeId") employeeId: string) {
    return this.educationService.listEmployeeEducation(employeeId);
  }

  @Post("employee")
  saveEmployeeEducation(@Body() data: any) {
    return this.educationService.saveEmployeeEducation(data);
  }

  @Patch("employee/:id/audit")
  auditEducation(@Param("id") id: string, @Body("status") status: string) {
    return this.educationService.auditEducation(id, status);
  }

  @Delete("employee/:id")
  deleteEmployeeEducation(@Param("id") id: string) {
    return this.educationService.deleteEmployeeEducation(id);
  }
}

