import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class EducationService {
  constructor(private readonly prisma: PrismaService) {}

  // --- 学历字典管理 ---

  async listDict() {
    return this.prisma.sys_education_dict.findMany({
      where: { is_deleted: 0 },
      orderBy: { sort: "asc" },
    });
  }

  async saveDict(data: any) {
    if (data.id) {
      return this.prisma.sys_education_dict.update({
        where: { id: data.id },
        data: { ...data, update_time: new Date() },
      });
    }
    return this.prisma.sys_education_dict.create({
      data: { ...data, is_deleted: 0 },
    });
  }

  async deleteDict(id: string) {
    return this.prisma.sys_education_dict.update({
      where: { id },
      data: { is_deleted: 1 },
    });
  }

  // --- 员工学历管理 ---

  // 获取所有员工学历记录（管理员用，含员工信息）
  async listAllEmployeeEducation() {
    return this.prisma.hr_employee_education.findMany({
      where: { is_deleted: 0 },
      include: {
        education_dict: true,
        hr_employee: {
          select: { id: true, name: true, employee_no: true },
        },
      },
      orderBy: { create_time: 'desc' },
    });
  }

  async listEmployeeEducation(employeeId: string) {
    return this.prisma.hr_employee_education.findMany({
      where: { employee_id: employeeId, is_deleted: 0 },
      include: { education_dict: true },
      orderBy: { graduate_time: "desc" },
    });
  }

  async saveEmployeeEducation(data: any) {
    if (data.id) {
      return this.prisma.hr_employee_education.update({
        where: { id: data.id },
        data: { ...data, update_time: new Date() },
      });
    }
    const result = await this.prisma.hr_employee_education.create({
      data: { ...data, is_deleted: 0 },
    });

    // 自动更新员工主表中的最高学历（简化版：按时间最新）
    await this.updateHighestEducation(data.employee_id);

    return result;
  }

  async updateHighestEducation(employeeId: string) {
    const latest = await this.prisma.hr_employee_education.findFirst({
      where: { employee_id: employeeId, is_deleted: 0 },
      orderBy: [{ education_dict: { sort: "desc" } }, { graduate_time: "desc" }],
    });

    if (latest) {
      await this.prisma.hr_employee.update({
        where: { id: employeeId },
        data: { highest_edu_id: latest.edu_level_id },
      });
    }
  }

  async auditEducation(id: string, status: string) {
    return this.prisma.hr_employee_education.update({
      where: { id },
      data: { record_status: status, record_time: new Date() },
    });
  }

  async deleteEmployeeEducation(id: string) {
    const edu = await this.prisma.hr_employee_education.findUnique({ where: { id } });
    const result = await this.prisma.hr_employee_education.update({
      where: { id },
      data: { is_deleted: 1 },
    });
    if (edu) await this.updateHighestEducation(edu.employee_id);
    return result;
  }
}
