import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScopeService } from '../../../common/services/scope.service';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { UpdateShiftDto } from '../dto/update-shift.dto';
import { Cache } from '../../../common/decorators/cache.decorator';
import { CacheEvict } from '../../../common/decorators/cache-evict.decorator';
import { QueryOptimize } from '../../../common/decorators/query-optimize.decorator';

@Injectable()
export class ShiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  /**
   * 获取班次列表（V2.0 性能优化）
   * 优化点：
   * 1. 添加缓存（15分钟）
   * 2. 添加查询监控
   */
  @Cache({ ttl: 900, byParams: true, prefix: 'shift-list' })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async findAll(userId: string, query: { platform_id?: string; dept_id?: string; name?: string }) {
    const scope = await this.scopeService.resolveAccess(userId);
    const where = this.scopeService.applyScope(scope, { 
      is_deleted: 0,
      ...(query.name ? { name: { contains: query.name } } : {}),
      ...(query.platform_id ? { platform_id: query.platform_id } : {}),
      ...(query.dept_id ? { dept_id: query.dept_id } : {}),
    }, { platform: 'platform_id', department: 'dept_id' });
    
    return this.prisma.attendance_rule.findMany({
      where,
      orderBy: { create_time: 'asc' }
    });
  }

  @QueryOptimize({ timeout: 2000, slowQueryThreshold: 100 })
  async findOne(userId: string, id: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const item = await this.prisma.attendance_rule.findFirst({
      where: this.scopeService.applyScope(scope, { id, is_deleted: 0 }, { platform: 'platform_id', department: 'dept_id' })
    });
    if (!item) throw new NotFoundException('班次不存在');
    return item;
  }

  /**
   * 创建班次（清除缓存）
   */
  @CacheEvict({ pattern: 'cache:shift-list:*' })
  async create(userId: string, dto: CreateShiftDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.attendance_rule.create({
      data: {
        ...dto,
        platform_id: scope.platform_id as string,
        dept_id: scope.dept_id as string
      } as any
    });
  }

  /**
   * 更新班次（清除缓存）
   */
  @CacheEvict({ pattern: 'cache:shift-list:*' })
  async update(userId: string, id: string, dto: UpdateShiftDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    await this.findOne(userId, id); // Check permission
    return this.prisma.attendance_rule.update({
      where: { id },
      data: dto as any
    });
  }

  /**
   * 删除班次（清除缓存）
   */
  @CacheEvict({ pattern: 'cache:shift-list:*' })
  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // Check permission
    return this.prisma.attendance_rule.update({
      where: { id },
      data: { is_deleted: 1 }
    });
  }
}
