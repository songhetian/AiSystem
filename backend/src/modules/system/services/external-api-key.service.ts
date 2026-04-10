import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScopeService } from '../../../common/services/scope.service';

@Injectable()
export class ExternalApiKeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  async findAll(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.sys_external_api_key.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id' }),
      orderBy: { create_time: 'desc' }
    });
  }

  async save(userId: string, data: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertPlatformAccess(scope, data.platform_id);
    if (data.dept_id) {
      this.scopeService.assertDepartmentAccess(scope, data.dept_id);
    }

    if (data.id) {
      return this.prisma.sys_external_api_key.update({
        where: { id: data.id },
        data
      });
    }

    return this.prisma.sys_external_api_key.create({ data });
  }

  /**
   * 核心逻辑：获取指定部门或平台的有效 API Key
   * 遵循：部门级 Key > 平台级 Key
   */
  async getEffectiveKey(platformId: string, deptId?: string, serviceType?: string) {
    // 1. 尝试查找部门独占 Key
    if (deptId) {
      const deptKey = await this.prisma.sys_external_api_key.findFirst({
        where: { platform_id: platformId, dept_id: deptId, service_type: serviceType, status: 1, is_deleted: 0 }
      });
      if (deptKey) return deptKey;
    }

    // 2. 查找平台全局 Key (dept_id 为 null)
    return this.prisma.sys_external_api_key.findFirst({
      where: { platform_id: platformId, dept_id: null, service_type: serviceType, status: 1, is_deleted: 0 }
    });
  }
}
