import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 如果是超级管理员，允许绕过维护模式
    if (user?.roles?.some((r: any) => r.role_code === 'super_admin')) {
      return true;
    }

    const config = await this.prisma.sys_config.findUnique({
      where: { config_key: 'maintenance_mode' }
    });

    if (config?.config_value === 'true') {
      throw new ServiceUnavailableException('系统正在维护中，请稍后再试');
    }

    return true;
  }
}
