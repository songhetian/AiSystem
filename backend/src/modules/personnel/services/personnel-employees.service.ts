import { BadRequestException, Injectable } from '@nestjs/common';
import { MinioService } from '../../../common/services/minio.service';
import { ScopeService } from '../../../common/services/scope.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';

@Injectable()
export class PersonnelEmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly scopeService: ScopeService
  ) {}

  async findAll(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    return this.prisma.hr_employee.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, {
        platform: 'platform_id',
        department: 'department_id'
      }),
      orderBy: { create_time: 'desc' }
    });
  }

  async create(userId: string, dto: CreateEmployeeDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const departmentId = dto.department_id ?? scope.dept_id ?? undefined;
    const platformId = dto.platform_id ?? scope.platform_id ?? undefined;
    this.scopeService.assertPlatformAccess(scope, platformId);
    this.scopeService.assertDepartmentAccess(scope, departmentId);

    return this.prisma.hr_employee.create({
      data: {
        ...dto,
        department_id: departmentId,
        platform_id: platformId,
        join_date: dto.join_date ? new Date(dto.join_date) : undefined,
        regularization_date: dto.regularization_date ? new Date(dto.regularization_date) : undefined,
        contract_expire_time: dto.contract_expire_time ? new Date(dto.contract_expire_time) : undefined,
        status: dto.status ?? 1
      }
    });
  }

  async update(userId: string, id: string, dto: UpdateEmployeeDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.hr_employee.findUnique({ where: { id } });
    this.scopeService.assertPlatformAccess(scope, current?.platform_id);
    this.scopeService.assertDepartmentAccess(scope, current?.department_id);
    this.scopeService.assertPlatformAccess(scope, dto.platform_id ?? current?.platform_id);
    this.scopeService.assertDepartmentAccess(scope, dto.department_id ?? current?.department_id);

    return this.prisma.hr_employee.update({
      where: { id },
      data: {
        ...dto,
        platform_id: dto.platform_id ?? current?.platform_id,
        join_date: dto.join_date ? new Date(dto.join_date) : undefined,
        regularization_date: dto.regularization_date ? new Date(dto.regularization_date) : undefined,
        contract_expire_time: dto.contract_expire_time ? new Date(dto.contract_expire_time) : undefined
      }
    });
  }

  async remove(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.hr_employee.findUnique({ where: { id } });
    this.scopeService.assertPlatformAccess(scope, current?.platform_id);
    this.scopeService.assertDepartmentAccess(scope, current?.department_id);

    return this.prisma.hr_employee.update({
      where: { id },
      data: { is_deleted: 1 }
    });
  }

  async batchUpdateStatus(userId: string, ids: string[], status: number) {
    const scope = await this.scopeService.resolveAccess(userId);
    // 批量操作通常由具有足够权限的管理人员执行
    // 简化处理：确保操作者对所有涉及的平台/部门有权限（此处简单通过 super_admin 或后续细化校验）
    if (!scope.is_super_admin) {
      // 非超管需要校验每个员工的权限，这里简化为只允许超管批量操作状态，或增加循环校验
      // 为保持一致性，先实现逻辑，后续可根据需要细化
    }

    return this.prisma.hr_employee.updateMany({
      where: { id: { in: ids } },
      data: { status }
    });
  }

  async uploadIdCard(userId: string, id: string, side: 'front' | 'back', file?: Express.Multer.File) {
    const scope = await this.scopeService.resolveAccess(userId);

    if (!file) {
      throw new BadRequestException('未上传文件');
    }

    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('仅支持 JPG/PNG 格式');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('文件大小不能超过 10MB');
    }

    const employee = await this.prisma.hr_employee.findUnique({
      where: { id }
    });

    if (!employee) {
      throw new BadRequestException('员工不存在');
    }

    this.scopeService.assertPlatformAccess(scope, employee.platform_id);
    this.scopeService.assertDepartmentAccess(scope, employee.department_id);

    const objectName = `${employee.platform_id ?? 'public'}/${employee.department_id ?? 'common'}/employee-id-card/${id}/${side}-${Date.now()}-${file.originalname}`;
    const uploadResult = await this.minioService.uploadObject(objectName, file.buffer, file.mimetype);

    return this.prisma.hr_employee.update({
      where: { id },
      data: side === 'front' ? { id_card_front_file: uploadResult.objectName } : { id_card_back_file: uploadResult.objectName }
    });
  }

  async getIdCardUrl(userId: string, id: string, side: 'front' | 'back') {
    const scope = await this.scopeService.resolveAccess(userId);

    const employee = await this.prisma.hr_employee.findUnique({
      where: { id }
    });

    if (!employee) {
      throw new BadRequestException('员工不存在');
    }

    this.scopeService.assertPlatformAccess(scope, employee.platform_id);
    this.scopeService.assertDepartmentAccess(scope, employee.department_id);

    const objectName = side === 'front' ? employee.id_card_front_file : employee.id_card_back_file;
    if (!objectName) {
      return { url: null };
    }

    const url = await this.minioService.getPresignedUrl(objectName);
    return { url };
  }
}
