import { Injectable } from '@nestjs/common';
import { ScopeService } from '../../../common/services/scope.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePositionDto } from '../dto/create-position.dto';
import { UpdatePositionDto } from '../dto/update-position.dto';

@Injectable()
export class PersonnelPositionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService
  ) {}

  async findAll(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    return this.prisma.hr_position.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, {
        platform: 'platform_id',
        department: 'department_id'
      }),
      orderBy: { create_time: 'desc' }
    });
  }

  async create(userId: string, dto: CreatePositionDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const platformId = dto.platform_id ?? scope.platform_id ?? undefined;
    this.scopeService.assertPlatformAccess(scope, platformId);
    this.scopeService.assertDepartmentAccess(scope, dto.department_id);

    return this.prisma.hr_position.create({
      data: {
        ...dto,
        platform_id: platformId
      }
    });
  }

  async update(userId: string, id: string, dto: UpdatePositionDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.hr_position.findUnique({ where: { id } });
    this.scopeService.assertPlatformAccess(scope, current?.platform_id);
    this.scopeService.assertDepartmentAccess(scope, current?.department_id);
    this.scopeService.assertPlatformAccess(scope, dto.platform_id ?? current?.platform_id);
    this.scopeService.assertDepartmentAccess(scope, dto.department_id ?? current?.department_id);

    return this.prisma.hr_position.update({
      where: { id },
      data: {
        ...dto,
        platform_id: dto.platform_id ?? current?.platform_id
      }
    });
  }

  async remove(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.hr_position.findUnique({ where: { id } });
    this.scopeService.assertPlatformAccess(scope, current?.platform_id);
    this.scopeService.assertDepartmentAccess(scope, current?.department_id);

    return this.prisma.hr_position.update({
      where: { id },
      data: { is_deleted: 1 }
    });
  }
}
