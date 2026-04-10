import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScopeService } from '../../../common/services/scope.service';

@Injectable()
export class ExternalApiKeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  private get delegate() {
    return (this.prisma as any).sys_external_api_key;
  }

  async findAll(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.delegate.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id' }),
      orderBy: { create_time: 'desc' },
    });
  }

  async save(userId: string, data: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertPlatformAccess(scope, data.platform_id);
    if (data.dept_id) {
      this.scopeService.assertDepartmentAccess(scope, data.dept_id);
    }

    if (data.id) {
      return this.delegate.update({
        where: { id: data.id },
        data,
      });
    }

    return this.delegate.create({ data });
  }

  async remove(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const existing = await this.delegate.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) {
      return null;
    }

    this.scopeService.assertPlatformAccess(scope, existing.platform_id);
    if (existing.dept_id) {
      this.scopeService.assertDepartmentAccess(scope, existing.dept_id);
    }

    return this.delegate.update({
      where: { id },
      data: { is_deleted: 1 },
    });
  }

  async getEffectiveKey(platformId: string, deptId?: string, serviceType?: string) {
    if (deptId) {
      const deptKey = await this.delegate.findFirst({
        where: { platform_id: platformId, dept_id: deptId, service_type: serviceType, status: 1, is_deleted: 0 },
      });
      if (deptKey) {
        return deptKey;
      }
    }

    return this.delegate.findFirst({
      where: { platform_id: platformId, dept_id: null, service_type: serviceType, status: 1, is_deleted: 0 },
    });
  }
}
