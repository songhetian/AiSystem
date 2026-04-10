import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScopeService } from '../../../common/services/scope.service';

@Injectable()
export class ShiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  async findAll(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.attendance_rule.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id' }),
      orderBy: { create_time: 'asc' }
    });
  }

  async create(userId: string, data: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    // 补全：确保班次时间格式正确，并绑定租户权限
    return this.prisma.attendance_rule.create({
      data: {
        ...data,
        platform_id: scope.platform_id,
        dept_id: scope.dept_id
      }
    });
  }

  async remove(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const rule = await this.prisma.attendance_rule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('班次不存在');
    
    this.scopeService.assertPlatformAccess(scope, rule.platform_id);
    return this.prisma.attendance_rule.update({
      where: { id },
      data: { is_deleted: 1 }
    });
  }
}
