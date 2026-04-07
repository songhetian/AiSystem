import { Injectable } from '@nestjs/common';
import { ScopeService } from '../../../common/services/scope.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateShopDto } from '../dto/create-shop.dto';
import { UpdateShopDto } from '../dto/update-shop.dto';

@Injectable()
export class SystemShopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService
  ) {}

  async findAll(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    return this.prisma.biz_shop.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, {
        platform: 'platform_id',
        department: 'department_id'
      }),
      orderBy: { create_time: 'desc' }
    });
  }

  async create(userId: string, dto: CreateShopDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertPlatformAccess(scope, dto.platform_id);
    this.scopeService.assertDepartmentAccess(scope, dto.department_id);

    return this.prisma.biz_shop.create({
      data: {
        name: dto.name,
        code: dto.code,
        type: dto.type ?? 1,
        address: dto.address,
        phone: dto.phone,
        avatar: dto.avatar,
        description: dto.description,
        platform_id: dto.platform_id,
        department_id: dto.department_id,
        owner_id: dto.owner_id,
        status: dto.status ?? 1
      }
    });
  }

  async update(userId: string, id: string, dto: UpdateShopDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.biz_shop.findUnique({ where: { id } });
    this.scopeService.assertPlatformAccess(scope, current?.platform_id);
    this.scopeService.assertDepartmentAccess(scope, current?.department_id);
    this.scopeService.assertPlatformAccess(scope, dto.platform_id ?? current?.platform_id);
    this.scopeService.assertDepartmentAccess(scope, dto.department_id ?? current?.department_id);

    return this.prisma.biz_shop.update({
      where: { id },
      data: dto
    });
  }

  async batchUpdateStatus(userId: string, ids: string[], status: number) {
    const scope = await this.scopeService.resolveAccess(userId);
    // Batch update requires careful scope check. For simplicity, we ensure access to each shop's platform/dept.
    // However, updateMany is tricky with complex scopes. We'll use a simpler approach or a multi-step update.
    // For now, let's just ensure the user has access to at least the current scopes of the target IDs.
    
    return this.prisma.biz_shop.updateMany({
      where: this.scopeService.applyScope(scope, {
        id: { in: ids },
        is_deleted: 0
      }, {
        platform: 'platform_id',
        department: 'department_id'
      }),
      data: { status }
    });
  }

  async remove(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.biz_shop.findUnique({ where: { id } });
    this.scopeService.assertPlatformAccess(scope, current?.platform_id);
    this.scopeService.assertDepartmentAccess(scope, current?.department_id);

    return this.prisma.biz_shop.update({
      where: { id },
      data: { is_deleted: 1 }
    });
  }
}
