import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScopeService } from '../../../common/services/scope.service';

@Injectable()
export class SystemIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  private get delegate() {
    return (this.prisma as any).sys_api_mapping;
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
      throw new NotFoundException('集成配置不存在');
    }

    this.scopeService.assertPlatformAccess(scope, existing.platform_id);

    return this.delegate.update({
      where: { id },
      data: { is_deleted: 1 },
    });
  }

  async transformExternalData(mappingId: string, externalJson: any) {
    const mapping = await this.delegate.findUnique({ where: { id: mappingId } });
    if (!mapping) {
      throw new NotFoundException('映射配置不存在');
    }

    const rules = mapping.mapping_json as Record<string, string>;
    const internalData: Record<string, unknown> = {};

    for (const [internalField, externalField] of Object.entries(rules)) {
      internalData[internalField] = externalJson[externalField];
    }

    return internalData;
  }
}
