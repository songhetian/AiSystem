import { Injectable } from '@nestjs/common';
import { ScopeService } from '../../../common/services/scope.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';

@Injectable()
export class SystemDepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService
  ) {}

  async findAll(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    return this.prisma.biz_department.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id' }),
      orderBy: [{ sort: 'asc' }, { create_time: 'desc' }]
    });
  }

  async findTree(userId: string) {
    const items = await this.findAll(userId);
    type DepartmentTreeNode = (typeof items)[number] & { children: DepartmentTreeNode[] };
    const nodeMap = new Map<string, DepartmentTreeNode>(
      items.map((item) => [item.id, { ...item, children: [] as DepartmentTreeNode[] }])
    );
    const roots: DepartmentTreeNode[] = [];

    nodeMap.forEach((node) => {
      if (node.parent_id && nodeMap.has(node.parent_id)) {
        const parent = nodeMap.get(node.parent_id)!;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  async create(userId: string, dto: CreateDepartmentDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const platformId = dto.platform_id ?? scope.platform_id ?? undefined;
    this.scopeService.assertPlatformAccess(scope, platformId);

    return this.prisma.biz_department.create({
      data: {
        name: dto.name,
        code: dto.code,
        parent_id: dto.parent_id,
        sort: dto.sort ?? 0,
        status: dto.status ?? 1,
        platform_id: platformId,
        owner_id: dto.owner_id
      }
    });
  }

  async update(userId: string, id: string, dto: UpdateDepartmentDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.biz_department.findUnique({ where: { id } });
    this.scopeService.assertPlatformAccess(scope, current?.platform_id);
    this.scopeService.assertPlatformAccess(scope, dto.platform_id ?? current?.platform_id);

    return this.prisma.biz_department.update({
      where: { id },
      data: {
        ...dto,
        platform_id: dto.platform_id ?? current?.platform_id
      }
    });
  }

  async remove(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const current = await this.prisma.biz_department.findUnique({ where: { id } });
    this.scopeService.assertPlatformAccess(scope, current?.platform_id);

    return this.prisma.biz_department.update({
      where: { id },
      data: { is_deleted: 1 }
    });
  }
}
