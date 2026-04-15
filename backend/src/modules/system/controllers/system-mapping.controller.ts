import { Controller, Get, Post, Body, Query, UseGuards, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/strategies/jwt.strategy';
import { CurrentUser, CurrentUserPayload } from '../../../common/current-user.decorator';
import { ScopeService } from '../../../common/services/scope.service';
import { SavePlatformConfigDto } from '../dto/platform-config.dto';

/**
 * 彻底规范化系统映射控制器 (V3.0)
 * 遵循《规范文档.md》：标准响应、DTO 校验、权限隔离、审计日志。
 */
@Controller('system/mapping')
@UseGuards(JwtAuthGuard)
export class SystemMappingController {
  private readonly logger = new Logger(SystemMappingController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  @Get('configs')
  async listConfigs(
    @CurrentUser() user: CurrentUserPayload,
    @Query('dept_id') deptId?: string,
  ) {
    const scope = await this.scopeService.resolveAccess(user.sub);
    const where: any = { is_deleted: 0 };
    if (deptId) where.dept_id = deptId;

    const list = await (this.prisma as any).sys_platform_config.findMany({
      where: this.scopeService.applyScope(where, scope, { 
        platform: 'platform_id', 
        department: 'dept_id', 
        shop: 'shop_id' 
      }),
      orderBy: { update_time: 'desc' }
    });

    return {
      code: 200,
      message: '数据链路加载成功',
      data: list
    };
  }

  @Post('configs')
  async saveConfig(
    @CurrentUser() user: CurrentUserPayload, 
    @Body() dto: SavePlatformConfigDto
  ) {
    const scope = await this.scopeService.resolveAccess(user.sub);
    
    // 规范 3.2: 接口调用权限强制校验
    this.scopeService.assertPlatformAccess(scope, dto.platform_id);
    this.scopeService.assertDepartmentAccess(scope, dto.dept_id);

    const data: any = { ...dto, update_time: new Date() };

    let result;
    if (dto.id) {
      this.logger.log(`🛠️ [AUDIT] 用户 ${user.name} 正在更新集成链路: ${dto.id}`);
      result = await (this.prisma as any).sys_platform_config.update({
        where: { id: dto.id },
        data
      });
    } else {
      this.logger.log(`✨ [AUDIT] 用户 ${user.name} 正在建立新集成链路: ${dto.platform_id}`);
      result = await (this.prisma as any).sys_platform_config.create({ data });
    }

    return {
      code: 200,
      message: '集成治理参数已稳固同步',
      data: result
    };
  }

  @Get('templates')
  async listTemplates(
    @CurrentUser() user: CurrentUserPayload,
    @Query('platform_id') platformId?: string,
  ) {
    const scope = await this.scopeService.resolveAccess(user.sub);
    const where: any = { is_deleted: 0 };
    if (platformId) where.platform_id = platformId;

    const list = await (this.prisma as any).sys_mapping_template.findMany({
      where: this.scopeService.applyScope(where, scope, { platform: 'platform_id' }),
      orderBy: { update_time: 'desc' },
    });

    return { code: 200, message: '映射基座加载成功', data: list };
  }

  @Get('logs')
  async listLogs(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: any,
  ) {
    const scope = await this.scopeService.resolveAccess(user.sub);
    const where: any = { is_deleted: 0 };
    
    if (query.platform_id) where.platform_id = query.platform_id;
    if (query.log_level) where.log_level = query.log_level;

    const logs = await (this.prisma as any).sys_integration_log.findMany({
      where: this.scopeService.applyScope(where, scope, { platform: 'platform_id', department: 'dept_id' }),
      orderBy: { create_time: 'desc' },
      take: 50,
    });

    return { code: 200, message: '审计日志检索成功', data: logs };
  }
}
