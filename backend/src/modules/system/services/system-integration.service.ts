import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScopeService } from '../../../common/services/scope.service';

@Injectable()
export class SystemIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  async findAll(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.sys_api_mapping.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id' }),
      orderBy: { create_time: 'desc' }
    });
  }

  async save(userId: string, data: any) {
    const scope = await this.scopeService.resolveAccess(userId);
    this.scopeService.assertPlatformAccess(scope, data.platform_id);

    if (data.id) {
      return this.prisma.sys_api_mapping.update({
        where: { id: data.id },
        data
      });
    }

    return this.prisma.sys_api_mapping.create({
      data
    });
  }

  /**
   * 模拟数据拉取并根据映射规则转换
   */
  async transformExternalData(mappingId: string, externalJson: any) {
    const mapping = await this.prisma.sys_api_mapping.findUnique({ where: { id: mappingId } });
    if (!mapping) return null;

    const rules = mapping.mapping_json as Record<string, string>;
    const internalData: any = {};

    // 执行字段映射规则转换
    for (const [internalField, externalField] of Object.entries(rules)) {
      internalData[internalField] = externalJson[externalField];
    }

    return internalData;
  }
}
